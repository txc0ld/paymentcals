import {
  Dec,
  addMoney,
  canonicalHash,
  compareMoney,
  dec,
  moneyFromDecimalMinorUnits,
  moneyFromMinorUnits,
  moneyToDecimalString,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
  type AssumptionRecord,
  type CalculationMessage,
  type CalculationRequestV1,
  type CalculationResultV1,
  type DecimalValue,
  type ISODateTime,
  type ReconciliationV1,
  type RoundingProfile,
  type RulePackManifestRef,
  type SourceRef,
  type TraceStep,
} from "@paymentcalcs/calculation-core";
import type { GstRulePack } from "@paymentcalcs/rules-au";
import { zGstInput, type GstInput, type GstLineResult, type GstOutput } from "./schema";

export const GST_ENGINE_ID = "E20";
export const GST_ENGINE_VERSION = "0.1.0";

/**
 * Modelling convention, not a statutory value: GST amounts round half-up to
 * the cent. Surfaced as a contract-setting assumption and in the Working tab.
 */
export const AU_GST_ROUNDING: RoundingProfile = {
  id: "au-gst-half-up-cents",
  intermediateScale: 6,
  moneyDisplayScale: 2,
  mode: "half_up",
  roundEachPeriod: false,
  finalPaymentAdjustment: false,
  reconciliationToleranceMinorUnits: 0,
};

export interface GstEngineContext {
  /** Injected clock — engines never read the system time (§11.2 determinism). */
  now: ISODateTime;
}

export interface GstResolution {
  pack: GstRulePack;
  manifestRef: RulePackManifestRef;
}

interface EngineOutcome {
  status: CalculationResultV1<GstOutput>["status"];
  output?: GstOutput;
  warnings: CalculationMessage[];
  errors: CalculationMessage[];
  assumptions: AssumptionRecord[];
  sources: SourceRef[];
  trace?: { level: "summary" | "full"; steps: TraceStep[] };
  reconciliation?: ReconciliationV1[];
}

export async function calculateGst(
  request: CalculationRequestV1<GstInput>,
  resolution: GstResolution,
  context: GstEngineContext,
): Promise<CalculationResultV1<GstOutput>> {
  const canonicalRequestHash = await canonicalHash(request);
  const outcome = computeGst(request, resolution);
  const withoutIntegrity = {
    requestId: request.requestId,
    calculationId: `calc_${canonicalRequestHash.slice(0, 16)}`,
    calculatorId: request.calculatorId,
    calculationClass: "A" as const,
    calculatedAt: context.now,
    engineVersions: { [GST_ENGINE_ID]: GST_ENGINE_VERSION },
    rulePacks: [resolution.manifestRef],
    ...outcome,
  };
  return {
    ...withoutIntegrity,
    integrity: {
      canonicalRequestHash,
      canonicalResultHash: await canonicalHash(withoutIntegrity),
    },
  };
}

/** Pure synchronous core — everything except hashing. */
export function computeGst(
  request: CalculationRequestV1<GstInput>,
  resolution: GstResolution,
): EngineOutcome {
  const parsed = zGstInput.safeParse(request.input);
  if (!parsed.success) {
    return {
      status: "invalid",
      warnings: [],
      errors: parsed.error.issues.map(
        (issue): CalculationMessage => ({
          code: "PC-VAL-0002",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String),
        }),
      ),
      assumptions: [],
      sources: [],
    };
  }
  const input = parsed.data;

  const rateString = resolution.pack.rules.standardRate;
  if (rateString === null) {
    return {
      status: "failed",
      warnings: [],
      errors: [
        {
          code: "PC-RULE-0004",
          severity: "error",
          message:
            "The GST rate in the resolved rule pack has not been populated from an official source.",
        },
      ],
      assumptions: [],
      sources: [],
    };
  }

  const rate = dec(rateString);
  const onePlusRate = new Dec(1).plus(rate) as DecimalValue;
  const mode = AU_GST_ROUNDING.mode;
  const warnings: CalculationMessage[] = [];
  const trace: TraceStep[] = [];
  let output: GstOutput;

  if (input.mode === "add") {
    const exclusive = input.amount;
    const gst = multiplyMoney(exclusive, rate, mode);
    const inclusive = addMoney(exclusive, gst);
    trace.push(
      {
        id: "step-1",
        formulaId: "F-GST-001",
        label: "GST on the exclusive amount",
        expression: "gst = exclusive × g",
        substitution: `gst = ${moneyToDecimalString(exclusive)} × ${rateString}`,
        value: moneyToDecimalString(gst),
        unit: exclusive.currency,
      },
      {
        id: "step-2",
        formulaId: "F-GST-001",
        label: "GST-inclusive total",
        expression: "inclusive = exclusive + gst",
        substitution: `inclusive = ${moneyToDecimalString(exclusive)} + ${moneyToDecimalString(gst)}`,
        value: moneyToDecimalString(inclusive),
        unit: exclusive.currency,
      },
    );
    output = {
      mode: input.mode,
      rate: rateString,
      exclusiveAmount: exclusive,
      gstAmount: gst,
      inclusiveAmount: inclusive,
    };
  } else if (input.mode === "remove" || input.mode === "split") {
    const inclusive = input.amount;
    const exactGstMinor = dec(inclusive.minorUnits).times(rate).div(onePlusRate) as DecimalValue;
    const gst = moneyFromDecimalMinorUnits(inclusive.currency, inclusive.scale, exactGstMinor, mode);
    const exclusive = subtractMoney(inclusive, gst);
    trace.push(
      {
        id: "step-1",
        formulaId: "F-GST-002",
        label: "GST component of the inclusive amount",
        expression: "gst = inclusive × g ÷ (1 + g)",
        substitution: `gst = ${moneyToDecimalString(inclusive)} × ${rateString} ÷ ${onePlusRate.toString()}`,
        value: moneyToDecimalString(gst),
        unit: inclusive.currency,
      },
      {
        id: "step-2",
        formulaId: "F-GST-002",
        label: "GST-exclusive amount",
        expression: "exclusive = inclusive − gst",
        substitution: `exclusive = ${moneyToDecimalString(inclusive)} − ${moneyToDecimalString(gst)}`,
        value: moneyToDecimalString(exclusive),
        unit: inclusive.currency,
      },
    );
    output = {
      mode: input.mode,
      rate: rateString,
      exclusiveAmount: exclusive,
      gstAmount: gst,
      inclusiveAmount: inclusive,
    };
  } else {
    const first = input.items[0]!.amount;
    const currency = first.currency;
    const scale = first.scale;
    for (const item of input.items) {
      if (item.amount.currency !== currency || item.amount.scale !== scale) {
        return {
          status: "invalid",
          warnings: [],
          errors: [
            {
              code: "PC-VAL-0003",
              severity: "error",
              message: "All line items must use the same currency.",
              path: ["items"],
            },
          ],
          assumptions: [],
          sources: [],
        };
      }
    }

    const lines: GstLineResult[] = [];
    // Per taxable line: exact (unrounded) GST in minor units, and which entered
    // amount is authoritative for that line. The entered basis is never changed
    // by rounding: an inclusive-priced line keeps its inclusive amount and an
    // exclusive-priced line keeps its exclusive amount.
    const taxable: Array<{ index: number; exactGstMinor: DecimalValue; basis: "exclusive" | "inclusive" }> = [];
    let exactGstTotalMinor = new Dec(0) as DecimalValue;

    for (const item of input.items) {
      const lineAmount = multiplyMoney(item.amount, new Dec(item.quantity) as DecimalValue, mode);
      let exclusive = lineAmount;
      let gst = zeroMoney(currency, scale);
      let inclusive = lineAmount;

      if (item.treatment === "taxable") {
        const exactGstMinor =
          item.amountIs === "exclusive"
            ? (dec(lineAmount.minorUnits).times(rate) as DecimalValue)
            : (dec(lineAmount.minorUnits).times(rate).div(onePlusRate) as DecimalValue);
        gst = moneyFromDecimalMinorUnits(currency, scale, exactGstMinor, mode);
        if (item.amountIs === "exclusive") {
          inclusive = addMoney(exclusive, gst);
        } else {
          exclusive = subtractMoney(inclusive, gst);
        }
        taxable.push({ index: lines.length, exactGstMinor, basis: item.amountIs });
        exactGstTotalMinor = exactGstTotalMinor.plus(exactGstMinor) as DecimalValue;
      }

      lines.push({
        id: item.id,
        ...(item.label !== undefined ? { label: item.label } : {}),
        treatment: item.treatment,
        quantity: item.quantity,
        exclusiveAmount: exclusive,
        gstAmount: gst,
        inclusiveAmount: inclusive,
      });
    }

    if (input.roundingLevel === "invoice_total" && taxable.length > 0) {
      // Authoritative GST is the exact total rounded once. Cents are allocated
      // to lines by the largest-remainder method, so every line stays within
      // one cent of its exact GST, lines sum exactly to the total, and each
      // line's entered basis amount is preserved (§12.15 AC).
      const authoritativeGst = moneyFromDecimalMinorUnits(currency, scale, exactGstTotalMinor, mode);
      const floors = taxable.map((t) => ({
        ...t,
        floorMinor: t.exactGstMinor.floor() as DecimalValue,
      }));
      const floorSum = floors.reduce(
        (acc, f) => acc.plus(f.floorMinor) as DecimalValue,
        new Dec(0) as DecimalValue,
      );
      let deficit = Number(dec(authoritativeGst.minorUnits).minus(floorSum).toFixed(0));
      const byRemainder = [...floors].sort((a, b) => {
        const cmp = b.exactGstMinor.minus(b.floorMinor).comparedTo(a.exactGstMinor.minus(a.floorMinor));
        return cmp !== 0 ? cmp : a.index - b.index;
      });
      let anyChanged = false;
      for (const entry of byRemainder) {
        const cents = entry.floorMinor.plus(deficit > 0 ? 1 : 0) as DecimalValue;
        if (deficit > 0) deficit -= 1;
        const line = lines[entry.index]!;
        const gst = moneyFromMinorUnits(currency, cents.toFixed(0), scale);
        if (gst.minorUnits !== line.gstAmount.minorUnits) anyChanged = true;
        line.gstAmount = gst;
        if (entry.basis === "exclusive") {
          line.inclusiveAmount = addMoney(line.exclusiveAmount, gst);
        } else {
          line.exclusiveAmount = subtractMoney(line.inclusiveAmount, gst);
        }
      }
      if (anyChanged) {
        warnings.push({
          code: "PC-CALC-0101",
          severity: "info",
          message:
            "Invoice-total rounding adjusted individual line GST by up to one cent so lines reconcile exactly to the invoice total.",
        });
      }
    }

    const exclusiveTotal = sumMoney(currency, scale, lines.map((l) => l.exclusiveAmount));
    const gstTotal = sumMoney(currency, scale, lines.map((l) => l.gstAmount));
    const inclusiveTotal = sumMoney(currency, scale, lines.map((l) => l.inclusiveAmount));

    trace.push({
      id: "step-1",
      formulaId: "F-GST-001",
      label: `Line GST, ${input.roundingLevel === "per_line" ? "rounded per line" : "rounded at the invoice total"}`,
      expression: "gst_total = Σ line gst",
      substitution: lines.map((l) => moneyToDecimalString(l.gstAmount)).join(" + "),
      value: moneyToDecimalString(gstTotal),
      unit: currency,
    });

    output = {
      mode: input.mode,
      rate: rateString,
      exclusiveAmount: exclusiveTotal,
      gstAmount: gstTotal,
      inclusiveAmount: inclusiveTotal,
      roundingLevel: input.roundingLevel,
      lines,
    };
  }

  const zero = zeroMoney(output.exclusiveAmount.currency, output.exclusiveAmount.scale);
  if (compareMoney(output.exclusiveAmount, zero) < 0) {
    warnings.push({
      code: "PC-CALC-0102",
      severity: "warning",
      message: "Negative amounts are treated as credits or refunds.",
    });
  }

  const closing = addMoney(output.exclusiveAmount, output.gstAmount);
  const reconciliation: ReconciliationV1 = {
    openingAmount: output.exclusiveAmount,
    additions: output.gstAmount,
    reductions: zero,
    closingAmount: closing,
    expectedClosingAmount: output.inclusiveAmount,
    difference: subtractMoney(closing, output.inclusiveAmount),
    tolerance: zero,
    passed: compareMoney(closing, output.inclusiveAmount) === 0,
  };

  if (!reconciliation.passed) {
    return {
      status: "failed",
      warnings,
      errors: [
        {
          code: "PC-REC-0001",
          severity: "error",
          message: "GST reconciliation failed: exclusive + GST does not equal inclusive.",
        },
      ],
      assumptions: [],
      sources: [],
      reconciliation: [reconciliation],
    };
  }

  const gstSource = resolution.pack.sources[0];
  const sources: SourceRef[] = gstSource
    ? [
        {
          sourceId: gstSource.sourceId,
          title: gstSource.title,
          url: gstSource.url,
          authority: gstSource.authority,
          retrievedAt: gstSource.retrievedAt,
          rulePackId: resolution.pack.rulePackId,
        },
      ]
    : [];

  const assumptions: AssumptionRecord[] = [
    {
      id: "gst-standard-rate",
      label: "Standard GST rate",
      category: "official_rule",
      value: rateString,
      unit: "rate",
      editable: false,
      materiality: "high",
      ...(gstSource ? { sourceId: gstSource.sourceId } : {}),
      explanation: `Standard GST rate from rule pack ${resolution.pack.rulePackId} (${resolution.pack.rulesVersion}).`,
    },
    {
      id: "gst-rounding",
      label: "Rounding",
      category: "contract_setting",
      value:
        input.mode === "line_items"
          ? `half-up to the cent, ${input.roundingLevel === "per_line" ? "per line" : "at invoice total"}`
          : "half-up to the cent",
      editable: input.mode === "line_items",
      materiality: "low",
      explanation:
        "GST amounts are rounded half-up to the nearest cent. On invoices, rounding can apply per line or once at the invoice total.",
    },
    {
      id: "gst-treatment",
      label: "GST treatment",
      category: "user_input",
      value: input.mode === "line_items" ? "per line item" : "taxable supply",
      editable: true,
      materiality: "high",
      explanation:
        "Whether a supply is taxable, GST-free or input taxed is your selection. It is never inferred from item names, and this tool does not determine registration or entitlement to input tax credits.",
    },
  ];

  return {
    status: warnings.some((w) => w.severity === "warning") ? "success_with_warnings" : "success",
    output,
    warnings,
    errors: [],
    assumptions,
    sources,
    ...(request.options.traceLevel !== "none" ? { trace: { level: "full" as const, steps: trace } } : {}),
    reconciliation: [reconciliation],
  };
}
