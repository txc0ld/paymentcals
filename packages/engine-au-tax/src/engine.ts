import {
  Dec,
  canonicalHash,
  dec,
  moneyFromDecimalString,
  moneyToDecimal,
  type AssumptionRecord,
  type CalculationMessage,
  type CalculationRequestV1,
  type CalculationResultV1,
  type DecimalValue,
  type ISODateTime,
  type Money,
  type ReconciliationV1,
  type RulePackManifestRef,
  type SourceRef,
  type TraceStep,
} from "@paymentcalcs/calculation-core";
import type {
  IncomeTaxRulePack,
  MedicareRulePack,
  PaygWithholdingRulePack,
  StslRulePack,
  SuperGuaranteeRulePack,
} from "@paymentcalcs/rules-au";
import { baseFromPackage, packageFromBase } from "@paymentcalcs/engine-compensation";
import { computeWithholding, selectScale } from "@paymentcalcs/engine-au-withholding";
import {
  litoAmount,
  marginalBracketRate,
  medicareLevy,
  medicareLevySurcharge,
  progressiveTax,
  stslRepayment,
} from "./liability";
import { zAuPayInput, type AuPayInput, type AuPayOutput, type WithholdingCycle } from "./schema";

export const AU_TAX_ENGINE_ID = "E02";
export const AU_TAX_ENGINE_VERSION = "0.1.0";

export interface AuPayResolution {
  incomeTax: { pack: IncomeTaxRulePack; manifestRef: RulePackManifestRef };
  medicare: { pack: MedicareRulePack; manifestRef: RulePackManifestRef };
  superGuarantee: { pack: SuperGuaranteeRulePack; manifestRef: RulePackManifestRef };
  stsl: { pack: StslRulePack; manifestRef: RulePackManifestRef } | null;
  payg: { pack: PaygWithholdingRulePack; manifestRef: RulePackManifestRef } | null;
}

export interface AuPayContext {
  now: ISODateTime;
}

const CYCLE_PERIODS: Record<WithholdingCycle, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
};

const aud = (value: DecimalValue): Money => moneyFromDecimalString("AUD", value.toFixed(2), 2);
const zero = () => new Dec(0) as DecimalValue;
const moneyDec = (money: Money | undefined): DecimalValue =>
  money ? (moneyToDecimal(money) as DecimalValue) : zero();

/** Annualise recurring income per §13.1 conventions (52/26/12; hourly needs hours). */
export function annualiseIncome(income: AuPayInput["income"]): { annual: DecimalValue; error?: string } {
  const amount = moneyDec(income.amount);
  const weeks = dec(income.weeksPaidPerYear) as DecimalValue;
  switch (income.frequency) {
    case "annually":
      return { annual: amount };
    case "monthly":
      return { annual: amount.times(12) as DecimalValue };
    case "fortnightly":
      return { annual: amount.times(26) as DecimalValue };
    case "weekly":
      return { annual: amount.times(52) as DecimalValue };
    case "daily": {
      if (!income.daysPerWeek) return { annual: zero(), error: "daysPerWeek is required for daily income." };
      return { annual: amount.times(dec(income.daysPerWeek)).times(weeks) as DecimalValue };
    }
    case "hourly": {
      if (!income.ordinaryHoursPerWeek) {
        return { annual: zero(), error: "ordinaryHoursPerWeek is required for hourly income." };
      }
      return { annual: amount.times(dec(income.ordinaryHoursPerWeek)).times(weeks) as DecimalValue };
    }
  }
}

interface LiabilityComputation {
  output: AuPayOutput;
  warnings: CalculationMessage[];
  trace: TraceStep[];
}

export function computeAuPay(input: AuPayInput, resolution: AuPayResolution): LiabilityComputation {
  const warnings: CalculationMessage[] = [];
  const trace: TraceStep[] = [];

  const { annual: annualIncome, error } = annualiseIncome(input.income);
  if (error) throw new InvalidPayInputError(error, ["income"]);

  // Package decomposition (E04).
  const sgRules =
    input.package.employerSuperRate !== null
      ? { ...resolution.superGuarantee.pack.rules, rate: input.package.employerSuperRate }
      : resolution.superGuarantee.pack.rules;
  const decomposition =
    input.package.treatment === "total_package_including_super"
      ? baseFromPackage(annualIncome, sgRules, input.package.applyMaximumContributionBase)
      : packageFromBase(annualIncome, sgRules, input.package.applyMaximumContributionBase);
  const baseSalary = decomposition.baseSalary;
  const employerSuper = decomposition.employerSuper;

  trace.push({
    id: "decompose",
    formulaId: "F-PAY-001",
    label:
      input.package.treatment === "total_package_including_super"
        ? `Base salary from total package (${decomposition.method})`
        : "Employer super on base salary",
    expression:
      input.package.treatment === "total_package_including_super"
        ? "base = package ÷ (1 + r), capped by the maximum contribution base"
        : "super = r × min(base, contribution base)",
    substitution: `base = ${baseSalary.toFixed(2)}, super = ${employerSuper.toFixed(2)}`,
    value: baseSalary.toFixed(2),
    unit: "AUD",
  });

  // Assessable income and taxable income.
  const adj = input.adjustments;
  const grossCash = baseSalary
    .plus(moneyDec(adj.bonus))
    .plus(moneyDec(adj.otherAssessableIncome)) as DecimalValue;
  const salarySacrifice = moneyDec(adj.salarySacrificeSuper);
  const preTax = salarySacrifice.plus(moneyDec(adj.otherPreTaxDeductions)) as DecimalValue;
  const deductions = moneyDec(adj.workRelatedDeductions);
  const taxableIncome = (Dec.max(
    zero(),
    grossCash.minus(preTax).minus(deductions),
  ) as DecimalValue);

  const taxRules = resolution.incomeTax.pack.rules;
  const brackets =
    input.taxpayer.residency === "resident"
      ? taxRules.resident
      : input.taxpayer.residency === "foreign_resident"
        ? taxRules.foreignResident
        : taxRules.workingHolidayMaker;
  if (!brackets) {
    throw new RulesUnavailableError(
      `Income tax brackets for ${input.taxpayer.residency} are not populated for ${input.financialYear}.`,
    );
  }

  const grossTax = progressiveTax(taxableIncome, brackets);
  trace.push({
    id: "gross-tax",
    formulaId: "F-TAX-001",
    label: "Gross income tax (piecewise brackets)",
    expression: "tax = Σ max(0, min(x, U) − L) × r",
    substitution: `tax(${taxableIncome.toFixed(2)})`,
    value: grossTax.toFixed(2),
    unit: "AUD",
  });

  const lito =
    input.taxpayer.residency === "resident"
      ? (Dec.min(litoAmount(taxableIncome, taxRules), grossTax) as DecimalValue)
      : zero();

  const medicareContext = {
    status: input.taxpayer.medicare.status,
    familyStatus: input.taxpayer.medicare.familyStatus,
    dependants: input.taxpayer.medicare.dependants,
    spouseIncome: moneyDec(input.taxpayer.medicare.spouseIncome),
  };
  const levyResult =
    input.taxpayer.residency === "resident"
      ? medicareLevy(taxableIncome, resolution.medicare.pack.rules, medicareContext)
      : { levy: zero(), usedFamilyReduction: false };
  if (levyResult.usedFamilyReduction) {
    warnings.push({
      code: "PC-CALC-0201",
      severity: "warning",
      message:
        "The family Medicare levy reduction is an estimate: apportionment between spouses is not modelled.",
    });
  }
  if (
    input.taxpayer.residency === "resident" &&
    input.taxpayer.medicare.status !== "full_exemption" &&
    resolution.medicare.pack.rules.lowIncomeSingle === null &&
    // Display-only envelope: recent upper thresholds sit near $35k; warn with
    // generous headroom so no plausibly-affected income misses the caveat.
    taxableIncome.lessThanOrEqualTo(60_000)
  ) {
    warnings.push({
      code: "PC-CALC-0202",
      severity: "warning",
      message: `The low-income Medicare levy reduction thresholds for ${input.financialYear} are not loaded, so the full levy is shown; at low incomes the true levy may be lower.`,
    });
  }

  const rfb = moneyDec(adj.reportableFringeBenefits);
  const netInvestmentLosses = moneyDec(adj.netInvestmentLosses);
  const exemptForeign = moneyDec(adj.exemptForeignEmploymentIncome);
  // MLS income adds RFB, reportable super and net investment losses to
  // taxable income (ATO income-for-surcharge-purposes definition).
  const surchargeExtras = rfb.plus(salarySacrifice).plus(netInvestmentLosses) as DecimalValue;
  const mls =
    input.taxpayer.residency === "resident"
      ? medicareLevySurcharge(taxableIncome, resolution.medicare.pack.rules, {
          hasPrivateHospitalCover: input.taxpayer.medicare.hasPrivateHospitalCover,
          familyStatus: input.taxpayer.medicare.familyStatus,
          dependants: input.taxpayer.medicare.dependants,
          spouseIncome: medicareContext.spouseIncome,
          reportableFringeBenefits: surchargeExtras,
        })
      : zero();

  let stsl = zero();
  if (input.studyLoans.enabled) {
    if (!resolution.stsl) {
      throw new RulesUnavailableError(
        `Study-loan repayment rules are not available for ${input.financialYear}.`,
      );
    }
    // Repayment income = taxable income + reportable fringe benefits +
    // reportable super + net investment losses + exempt foreign employment
    // income — §13.17, per the ATO definition on the thresholds page.
    const repaymentIncome = taxableIncome
      .plus(rfb)
      .plus(salarySacrifice)
      .plus(netInvestmentLosses)
      .plus(exemptForeign) as DecimalValue;
    stsl = stslRepayment(repaymentIncome, resolution.stsl.pack.rules);
    trace.push({
      id: "stsl",
      formulaId: "F-TAX-005",
      label: "Compulsory study-loan repayment",
      expression: "repayment income = taxable + RFB + reportable super",
      substitution: `repayment(${repaymentIncome.toFixed(2)})`,
      value: stsl.toFixed(2),
      unit: "AUD",
    });
  }

  const totalLiability = grossTax.minus(lito).plus(levyResult.levy).plus(mls).plus(stsl) as DecimalValue;
  const postTax = moneyDec(adj.postTaxDeductions);
  const netAnnual = grossCash.minus(preTax).minus(totalLiability).minus(postTax) as DecimalValue;

  const cycle = input.withholding.payFrequency;
  const periods = CYCLE_PERIODS[cycle];
  const netPerCycle = netAnnual.div(periods) as DecimalValue;

  // Decision metric: net value of the next $1,000 of gross cash income.
  const bumpTaxable = taxableIncome.plus(1000) as DecimalValue;
  const bumpTax = progressiveTax(bumpTaxable, brackets);
  const bumpLito =
    input.taxpayer.residency === "resident"
      ? (Dec.min(litoAmount(bumpTaxable, taxRules), bumpTax) as DecimalValue)
      : zero();
  const bumpLevy =
    input.taxpayer.residency === "resident"
      ? medicareLevy(bumpTaxable, resolution.medicare.pack.rules, medicareContext).levy
      : zero();
  const bumpMls =
    input.taxpayer.residency === "resident"
      ? medicareLevySurcharge(bumpTaxable, resolution.medicare.pack.rules, {
          hasPrivateHospitalCover: input.taxpayer.medicare.hasPrivateHospitalCover,
          familyStatus: input.taxpayer.medicare.familyStatus,
          dependants: input.taxpayer.medicare.dependants,
          spouseIncome: medicareContext.spouseIncome,
          reportableFringeBenefits: surchargeExtras,
        })
      : zero();
  let bumpStsl = zero();
  if (input.studyLoans.enabled && resolution.stsl) {
    bumpStsl = stslRepayment(
      bumpTaxable.plus(rfb).plus(salarySacrifice).plus(netInvestmentLosses).plus(exemptForeign) as DecimalValue,
      resolution.stsl.pack.rules,
    );
  }
  const bumpLiability = bumpTax.minus(bumpLito).plus(bumpLevy).plus(bumpMls).plus(bumpStsl) as DecimalValue;
  const nextThousandNet = new Dec(1000).minus(bumpLiability.minus(totalLiability)) as DecimalValue;

  // Withholding (E03) — separate engine, separate labelling (PAY-AC-002).
  let withholding: AuPayOutput["withholding"] = null;
  let withholdingUnavailableReason: string | null = null;
  const scale = selectScale({
    residency: input.taxpayer.residency,
    claimsTaxFreeThreshold: input.taxpayer.claimsTaxFreeThreshold,
    medicareStatus: input.taxpayer.medicare.status,
  });
  if (typeof scale !== "string") {
    withholdingUnavailableReason = scale.unsupported;
  } else if (!resolution.payg) {
    withholdingUnavailableReason = `The official PAYG withholding schedule for ${input.financialYear} is not available in this build; the annual liability estimate above is unaffected.`;
  } else {
    // Schedule 1 applies to ordinary period earnings only. Bonuses and other
    // non-payroll income withhold under separate schedules not yet modelled,
    // so they are excluded here and flagged below.
    const periodEarnings = baseSalary.minus(preTax).div(periods) as DecimalValue;
    if (moneyDec(adj.bonus).greaterThan(0) || moneyDec(adj.otherAssessableIncome).greaterThan(0)) {
      warnings.push({
        code: "PC-CALC-0203",
        severity: "info",
        message:
          "Bonuses and other assessable income are included in the annual position but excluded from the per-pay withholding estimate; employers withhold on such payments under separate ATO schedules.",
      });
    }
    const computation = computeWithholding(resolution.payg.pack.rules, {
      periodEarnings,
      cycle,
      scale,
      stslEnabled: input.studyLoans.enabled,
    });
    const additional = moneyDec(input.withholding.additionalPerPeriod);
    const perCycleTotal = computation.periodTotal.plus(additional) as DecimalValue;
    const annualised = perCycleTotal.times(periods) as DecimalValue;
    withholding = {
      perCycleTotal: aud(perCycleTotal),
      perCycleOrdinary: aud(computation.periodOrdinary),
      perCycleStudyLoan: aud(computation.periodStsl),
      perCycleAdditional: aud(additional),
      annualised: aud(annualised),
      varianceFromAnnualLiability: aud(annualised.minus(totalLiability) as DecimalValue),
      scaleUsed: computation.scale,
    };
    trace.push({
      id: "withholding",
      formulaId: "F-PAYG-001",
      label: `PAYG withholding (${computation.scale}, ${cycle})`,
      expression: "y = a·x − b on weekly-equivalent earnings, rounded to the dollar",
      substitution: `x = ${computation.weeklyX}`,
      value: computation.periodTotal.toFixed(2),
      unit: "AUD",
    });
  }

  const output: AuPayOutput = {
    annualised: {
      grossPackage: aud(decomposition.totalPackage),
      baseSalary: aud(baseSalary),
      employerSuper: aud(employerSuper),
      grossCashIncome: aud(grossCash),
    },
    liability: {
      taxableIncome: aud(taxableIncome),
      grossIncomeTax: aud(grossTax),
      litoOffset: aud(lito),
      medicareLevy: aud(levyResult.levy),
      medicareLevySurcharge: aud(mls),
      studyLoanRepayment: aud(stsl),
      totalAnnualLiability: aud(totalLiability),
      effectiveRateOnTaxable: taxableIncome.isZero()
        ? "0"
        : totalLiability.div(taxableIncome).toFixed(4),
      marginalBracketRate: marginalBracketRate(taxableIncome, brackets),
    },
    netAnnualCash: aud(netAnnual),
    netPerCycle: aud(netPerCycle),
    cycleLabel: cycle,
    netValueOfNextThousand: aud(nextThousandNet),
    withholding,
    withholdingUnavailableReason,
  };

  return { output, warnings, trace };
}

export class InvalidPayInputError extends Error {
  readonly code = "PC-VAL-0002";
  constructor(
    message: string,
    readonly path: string[],
  ) {
    super(message);
  }
}

export class RulesUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
}

export async function calculateAuPay(
  request: CalculationRequestV1<AuPayInput>,
  resolution: AuPayResolution,
  context: AuPayContext,
): Promise<CalculationResultV1<AuPayOutput>> {
  const canonicalRequestHash = await canonicalHash(request);
  const manifestRefs = [
    resolution.incomeTax.manifestRef,
    resolution.medicare.manifestRef,
    resolution.superGuarantee.manifestRef,
    ...(resolution.stsl ? [resolution.stsl.manifestRef] : []),
    ...(resolution.payg ? [resolution.payg.manifestRef] : []),
  ];
  const base = {
    requestId: request.requestId,
    calculationId: `calc_${canonicalRequestHash.slice(0, 16)}`,
    calculatorId: request.calculatorId,
    calculationClass: "B" as const,
    calculatedAt: context.now,
    engineVersions: { [AU_TAX_ENGINE_ID]: AU_TAX_ENGINE_VERSION, E03: "0.1.0", E04: "0.1.0" },
    rulePacks: manifestRefs,
  };
  const finish = async (
    partial: Omit<CalculationResultV1<AuPayOutput>, keyof typeof base | "integrity">,
  ): Promise<CalculationResultV1<AuPayOutput>> => {
    const withoutIntegrity = { ...base, ...partial };
    return {
      ...withoutIntegrity,
      integrity: { canonicalRequestHash, canonicalResultHash: await canonicalHash(withoutIntegrity) },
    };
  };

  const parsed = zAuPayInput.safeParse(request.input);
  if (!parsed.success) {
    return finish({
      status: "invalid",
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        code: "PC-VAL-0002",
        severity: "error" as const,
        message: issue.message,
        path: issue.path.map(String),
      })),
      assumptions: [],
      sources: [],
    });
  }

  try {
    const { output, warnings, trace } = computeAuPay(parsed.data, resolution);

    const reconciliation: ReconciliationV1 = buildReconciliation(parsed.data, output);
    if (!reconciliation.passed) {
      return finish({
        status: "failed",
        warnings,
        errors: [
          {
            code: "PC-REC-0002",
            severity: "error",
            message: "Pay reconciliation failed: components do not sum to gross cash income.",
          },
        ],
        assumptions: [],
        sources: [],
        reconciliation: [reconciliation],
      });
    }

    const sources: SourceRef[] = manifestRefs.flatMap((ref) => {
      const pack = [
        resolution.incomeTax.pack,
        resolution.medicare.pack,
        resolution.superGuarantee.pack,
        resolution.stsl?.pack,
        resolution.payg?.pack,
      ].find((p) => p?.rulePackId === ref.rulePackId);
      const source = pack?.sources[0];
      return source
        ? [
            {
              sourceId: source.sourceId,
              title: source.title,
              url: source.url,
              authority: source.authority,
              retrievedAt: source.retrievedAt,
              rulePackId: ref.rulePackId,
            },
          ]
        : [];
    });

    const assumptions: AssumptionRecord[] = buildAssumptions(parsed.data, resolution);

    return finish({
      status: warnings.some((w) => w.severity === "warning") ? "success_with_warnings" : "success",
      output,
      warnings,
      errors: [],
      assumptions,
      sources,
      ...(request.options.traceLevel !== "none" ? { trace: { level: "full" as const, steps: trace } } : {}),
      reconciliation: [reconciliation],
    });
  } catch (thrown) {
    if (thrown instanceof InvalidPayInputError) {
      return finish({
        status: "invalid",
        warnings: [],
        errors: [{ code: thrown.code, severity: "error", message: thrown.message, path: thrown.path }],
        assumptions: [],
        sources: [],
      });
    }
    if (thrown instanceof RulesUnavailableError || (thrown as { code?: string }).code === "PC-RULE-0004") {
      return finish({
        status: "failed",
        warnings: [],
        errors: [{ code: "PC-RULE-0004", severity: "error", message: (thrown as Error).message }],
        assumptions: [],
        sources: [],
      });
    }
    throw thrown;
  }
}

function buildReconciliation(input: AuPayInput, output: AuPayOutput): ReconciliationV1 {
  // net + liability + pre-tax deductions + post-tax deductions must equal
  // gross cash income to the cent (all values already rounded consistently).
  const grossCash = moneyToDecimal(output.annualised.grossCashIncome) as DecimalValue;
  const net = moneyToDecimal(output.netAnnualCash) as DecimalValue;
  const liability = moneyToDecimal(output.liability.totalAnnualLiability) as DecimalValue;
  const preTax = moneyDec(input.adjustments.salarySacrificeSuper).plus(
    moneyDec(input.adjustments.otherPreTaxDeductions),
  ) as DecimalValue;
  const postTax = moneyDec(input.adjustments.postTaxDeductions);
  const reconstructed = net.plus(liability).plus(preTax).plus(postTax) as DecimalValue;
  const difference = reconstructed.minus(grossCash) as DecimalValue;
  return {
    openingAmount: aud(grossCash),
    additions: aud(zero()),
    reductions: aud(liability.plus(preTax).plus(postTax) as DecimalValue),
    closingAmount: aud(net),
    expectedClosingAmount: aud(grossCash.minus(liability).minus(preTax).minus(postTax) as DecimalValue),
    difference: aud(difference),
    tolerance: aud(new Dec("0.02") as DecimalValue),
    passed: difference.abs().lessThanOrEqualTo("0.02"),
  };
}

function buildAssumptions(input: AuPayInput, resolution: AuPayResolution): AssumptionRecord[] {
  const sgRate = input.package.employerSuperRate ?? resolution.superGuarantee.pack.rules.rate ?? "unavailable";
  return [
    {
      id: "financial-year-rules",
      label: `Rules for ${input.financialYear}`,
      category: "official_rule",
      value: resolution.incomeTax.pack.rulePackId,
      editable: false,
      materiality: "high",
      sourceId: resolution.incomeTax.pack.sources[0]?.sourceId ?? "",
      explanation: `Income tax, Medicare and study-loan figures use the ${input.financialYear} rule packs listed under Sources.`,
    },
    {
      id: "employer-super-rate",
      label: "Employer super rate",
      category: input.package.employerSuperRate ? "user_input" : "official_rule",
      value: sgRate,
      unit: "rate",
      editable: true,
      materiality: "high",
      explanation:
        input.package.employerSuperRate === null
          ? "The super guarantee rate from the active rule pack."
          : "You overrode the employer super rate.",
    },
    {
      id: "annualisation",
      label: "Annualisation convention",
      category: "contract_setting",
      value: "52 weeks / 26 fortnights / 12 months per year",
      editable: false,
      materiality: "medium",
      explanation:
        "Recurring income converts to annual amounts using these period counts. Monthly figures use an annual ÷ 12 convention, not four weeks.",
    },
    {
      id: "estimate-not-return",
      label: "Annual estimate",
      category: "contract_setting",
      value: "annual estimate, not a tax return",
      editable: false,
      materiality: "high",
      explanation:
        "The result is an estimate based on the information entered and selected rule year. Actual payroll withholding, tax assessment, offsets, deductions and liabilities may differ.",
    },
  ];
}
