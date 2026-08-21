import { describe, expect, it } from "vitest";
import { moneyFromDecimalString, type CalculationRequestV1 } from "@paymentcalcs/calculation-core";
import {
  incomeTaxPacks,
  medicarePacks,
  paygWithholdingPacks,
  saptoPack,
  stslPacks,
  superGuaranteePacks,
} from "@paymentcalcs/rules-au";
import { calculateAuPay, computeAuPay, type AuPayResolution } from "./engine";
import { solveGrossForNet } from "./net-to-gross";
import { zAuPayInput, type AuPayInput } from "./schema";

const ref = (pack: { rulePackId: string; rulesVersion: string; status: string }) => ({
  rulePackId: pack.rulePackId,
  rulesVersion: pack.rulesVersion,
  status: pack.status,
  integritySha256: "0".repeat(64),
});

function resolutionFor(fy: string): AuPayResolution {
  const incomeTax = incomeTaxPacks.find((p) => p.rulePackId.endsWith(fy))!;
  const medicare = medicarePacks.find((p) => p.rulePackId.endsWith(fy))!;
  const superGuarantee = superGuaranteePacks.find((p) => p.rulePackId.endsWith(fy))!;
  const stsl = stslPacks.find((p) => p.rulePackId.endsWith(fy)) ?? null;
  const payg = paygWithholdingPacks.find((p) => p.rulePackId.endsWith(fy)) ?? null;
  return {
    incomeTax: { pack: incomeTax, manifestRef: ref(incomeTax) },
    medicare: { pack: medicare, manifestRef: ref(medicare) },
    superGuarantee: { pack: superGuarantee, manifestRef: ref(superGuarantee) },
    stsl: stsl ? { pack: stsl, manifestRef: ref(stsl) } : null,
    payg: payg ? { pack: payg, manifestRef: ref(payg) } : null,
  };
}

const aud = (major: string) => moneyFromDecimalString("AUD", major, 2);

function baseInput(overrides: Partial<AuPayInput> = {}): AuPayInput {
  return zAuPayInput.parse({
    financialYear: "2026-27",
    income: { amount: aud("100000"), frequency: "annually" },
    package: { treatment: "base_plus_super" },
    taxpayer: { residency: "resident" },
    ...overrides,
  });
}

describe("computeAuPay — self-verifiable against pack data (FY2026-27)", () => {
  const resolution = resolutionFor("2026-27");

  it("computes the $100,000 resident case exactly from pack values", () => {
    const { output } = computeAuPay(baseInput(), resolution);
    // From the pack: tax(100k) = 4,020 + 30% × 55,000 = 20,520; LITO 0;
    // Medicare 2%; MLS 0 tier (single ≤ $105,000); no STSL.
    expect(output.liability.grossIncomeTax.minorUnits).toBe("2052000");
    expect(output.liability.litoOffset.minorUnits).toBe("0");
    expect(output.liability.medicareLevy.minorUnits).toBe("200000");
    expect(output.liability.medicareLevySurcharge.minorUnits).toBe("0");
    expect(output.liability.totalAnnualLiability.minorUnits).toBe("2252000");
    expect(output.netAnnualCash.minorUnits).toBe("7748000");
    expect(output.liability.marginalBracketRate).toBe("0.30");
    // Employer super at the pack's 12%.
    expect(output.annualised.employerSuper.minorUnits).toBe("1200000");
  });

  it("MLS engages without cover just above the single base tier", () => {
    const withCoverOut = computeAuPay(
      baseInput({
        income: { amount: aud("106000"), frequency: "annually", weeksPaidPerYear: "52" },
        taxpayer: {
          residency: "resident",
          claimsTaxFreeThreshold: true,
          medicare: {
            status: "standard",
            hasPrivateHospitalCover: true,
            familyStatus: "single",
            dependants: 0,
          },
        },
      }),
      resolution,
    ).output;
    const withoutCoverOut = computeAuPay(
      baseInput({
        income: { amount: aud("106000"), frequency: "annually", weeksPaidPerYear: "52" },
      }),
      resolution,
    ).output;
    expect(withCoverOut.liability.medicareLevySurcharge.minorUnits).toBe("0");
    // 1% of $106,000 MLS income.
    expect(withoutCoverOut.liability.medicareLevySurcharge.minorUnits).toBe("106000");
  });

  it("total package including super decomposes then caps at the contribution base", () => {
    const uncapped = computeAuPay(
      baseInput({
        income: { amount: aud("112000"), frequency: "annually", weeksPaidPerYear: "52" },
        package: { treatment: "total_package_including_super", employerSuperRate: null, applyMaximumContributionBase: true },
      }),
      resolution,
    ).output;
    expect(uncapped.annualised.baseSalary.minorUnits).toBe("10000000"); // 112,000/1.12
    expect(uncapped.annualised.employerSuper.minorUnits).toBe("1200000");

    const capped = computeAuPay(
      baseInput({
        income: { amount: aud("500000"), frequency: "annually", weeksPaidPerYear: "52" },
        package: { treatment: "total_package_including_super", employerSuperRate: null, applyMaximumContributionBase: true },
      }),
      resolution,
    ).output;
    // Annual max contribution base 270,830 → SG fixed at 32,499.60.
    expect(capped.annualised.employerSuper.minorUnits).toBe("3249960");
    expect(capped.annualised.baseSalary.minorUnits).toBe("46750040");
  });

  it("computes withholding from the Schedule 1 coefficients — never annual ÷ periods", () => {
    const { output } = computeAuPay(
      baseInput({
        income: { amount: aud("52000"), frequency: "annually", weeksPaidPerYear: "52" },
        withholding: { payFrequency: "weekly" },
      }),
      resolution,
    );
    // Weekly earnings $1,000 → x = 1000.99, scale 2 row (<1282): a=0.3227,
    // b=185.1935 → y = 137.83 → $138/week (from the pack's own coefficients).
    expect(output.withholding).not.toBeNull();
    expect(output.withholding!.perCycleOrdinary.minorUnits).toBe("13800");
    expect(output.withholding!.scaleUsed).toBe("scale2_tft");
    // Variance vs annual liability must be explicit, not hidden.
    expect(output.withholding!.varianceFromAnnualLiability).toBeDefined();
  });

  it("adds the STSL withholding component when study loans are enabled", () => {
    const { output } = computeAuPay(
      baseInput({
        income: { amount: aud("104000"), frequency: "annually", weeksPaidPerYear: "52" },
        studyLoans: { enabled: true },
        withholding: { payFrequency: "weekly" },
      }),
      resolution,
    );
    // Weekly $2,000 → x=2000.99, STSL TFT row (<2494): 0.15x − 200.5615 = 99.59 → $100.
    expect(output.withholding!.perCycleStudyLoan.minorUnits).toBe("10000");
    expect(output.liability.studyLoanRepayment.minorUnits).not.toBe("0");
  });

  it("working holiday maker gets an annual estimate but an explicit withholding-unsupported reason", () => {
    const { output } = computeAuPay(
      baseInput({
        taxpayer: {
          residency: "working_holiday_maker",
          claimsTaxFreeThreshold: false,
          medicare: { status: "standard", hasPrivateHospitalCover: false, familyStatus: "single", dependants: 0 },
        },
      }),
      resolution,
    );
    // WHM 2026-27: 15% × 45,000 + 30% × 55,000 = 23,250; no Medicare, no LITO.
    expect(output.liability.grossIncomeTax.minorUnits).toBe("2325000");
    expect(output.liability.medicareLevy.minorUnits).toBe("0");
    expect(output.withholding).toBeNull();
    expect(output.withholdingUnavailableReason).toContain("Schedule 15");
  });
});

describe("calculateAuPay envelope", () => {
  const resolution = resolutionFor("2026-27");

  function makeRequest(input: unknown): CalculationRequestV1<AuPayInput> {
    return {
      requestId: "req-pay-test",
      calculatorId: "AU-PAY-001",
      calculatorSchemaVersion: "1",
      jurisdiction: { country: "AU" },
      locale: "en-AU",
      currency: "AUD",
      valuationDate: "2026-08-20",
      input: input as AuPayInput,
      options: { traceLevel: "full" },
    };
  }

  it("returns a reconciled, deterministic result with separated sections (PAY-AC-002/012)", async () => {
    const request = makeRequest(baseInput());
    const context = { now: "2026-08-20T10:00:00+08:00" };
    const a = await calculateAuPay(request, resolution, context);
    const b = await calculateAuPay(request, resolution, context);
    expect(a.status).toBe("success");
    expect(a.reconciliation?.[0]?.passed).toBe(true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.output!.liability.totalAnnualLiability).toBeDefined();
    expect(a.output!.withholding!.annualised).toBeDefined();
  });

  it("rejects malformed input as invalid with field paths (PAY-AC-009)", async () => {
    const result = await calculateAuPay(
      makeRequest({ financialYear: "nope" }),
      resolution,
      { now: "2026-08-20T10:00:00+08:00" },
    );
    expect(result.status).toBe("invalid");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.output).toBeUndefined();
  });

  it("hourly income without hours is a field error, not NaN (PAY-AC-009)", async () => {
    const result = await calculateAuPay(
      makeRequest({
        ...baseInput(),
        income: { amount: aud("45.50"), frequency: "hourly", weeksPaidPerYear: "52" },
      }),
      resolution,
      { now: "2026-08-20T10:00:00+08:00" },
    );
    expect(result.status).toBe("invalid");
    expect(result.errors[0]?.message).toContain("ordinaryHoursPerWeek");
  });
});

describe("net-to-gross (AU-PAY-004, §12.2)", () => {
  const resolution = resolutionFor("2026-27");

  it("round-trips: solved gross re-fed forward meets the target within a cent", () => {
    const template = baseInput();
    const target = aud("77480"); // net of the $100k case
    const solved = solveGrossForNet(target, template, resolution);
    expect(solved.status).toBe("solved");
    expect(Number(solved.grossAnnual!.minorUnits)).toBeGreaterThan(9_990_000);
    expect(Number(solved.grossAnnual!.minorUnits)).toBeLessThan(10_010_000);
    const residualCents = Math.abs(Number(solved.residual!.minorUnits));
    expect(residualCents).toBeLessThanOrEqual(1);
  });

  it("reports unattainable targets with a reason instead of a fabricated number", () => {
    const solved = solveGrossForNet(aud("99000000"), baseInput(), resolution);
    expect(solved.status).toBe("unattainable");
    expect(solved.grossAnnual).toBeNull();
    expect(solved.reason).toContain("not attainable");
  });
});

describe("SAPTO (F-TAX-006)", () => {
  const saptoResolution: AuPayResolution = {
    ...resolutionFor("2026-27"),
    sapto: { pack: saptoPack, manifestRef: ref(saptoPack) },
  };
  const saptoInput = (income: string, status: "single" | "couple_each" | "illness_separated_each" = "single") =>
    zAuPayInput.parse({
      financialYear: "2026-27",
      income: { amount: aud(income), frequency: "annually" },
      package: { treatment: "base_plus_super" },
      taxpayer: { residency: "resident", sapto: { eligible: true, status } },
    });

  it("applies the full offset below the shading-out threshold, capped at tax after LITO", () => {
    const { output } = computeAuPay(saptoInput("34000"), saptoResolution);
    // Pack: single max $2,230, shade-out from $34,919 — full entitlement here,
    // limited to the income tax remaining after LITO.
    const grossTax = Number(output.liability.grossIncomeTax.minorUnits);
    const lito = Number(output.liability.litoOffset.minorUnits);
    const sapto = Number(output.liability.saptoOffset.minorUnits);
    expect(sapto).toBe(Math.min(223000, grossTax - lito));
    expect(sapto).toBeGreaterThan(0);
  });

  it("shades out at 12.5c per dollar with ceiling rounding: $40,000 → $1,595", () => {
    const { output } = computeAuPay(saptoInput("40000"), saptoResolution);
    // 2,230 − 0.125 × (40,000 − 34,919) = 1,594.875 → whole-dollar ceiling 1,595.
    expect(output.liability.saptoOffset.minorUnits).toBe("159500");
  });

  it("cuts out at the published single threshold ($52,759)", () => {
    const { output } = computeAuPay(saptoInput("52759"), saptoResolution);
    expect(output.liability.saptoOffset.minorUnits).toBe("0");
  });

  it("is non-refundable: never exceeds gross tax minus LITO", () => {
    const { output } = computeAuPay(saptoInput("20000"), saptoResolution);
    const grossTax = Number(output.liability.grossIncomeTax.minorUnits);
    const lito = Number(output.liability.litoOffset.minorUnits);
    expect(Number(output.liability.saptoOffset.minorUnits)).toBe(Math.max(0, grossTax - lito));
  });

  it("fails closed when SAPTO is claimed but no pack resolves", () => {
    expect(() => computeAuPay(saptoInput("40000"), { ...saptoResolution, sapto: null })).toThrow();
  });
});
