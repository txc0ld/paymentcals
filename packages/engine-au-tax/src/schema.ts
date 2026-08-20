import { z } from "zod";
import { zDecimalString, zMoney } from "@paymentcalcs/calculation-core";
import type { Money } from "@paymentcalcs/calculation-core";

export const zPayFrequency = z.enum(["hourly", "daily", "weekly", "fortnightly", "monthly", "annually"]);
export type PayFrequency = z.infer<typeof zPayFrequency>;

export const zWithholdingCycle = z.enum(["weekly", "fortnightly", "monthly", "quarterly"]);
export type WithholdingCycle = z.infer<typeof zWithholdingCycle>;

/** AU pay input, schema version 1 — the P0 subset of PRD §12.1.4. */
export const zAuPayInput = z.object({
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  income: z.object({
    amount: zMoney,
    frequency: zPayFrequency,
    /** Required when frequency is hourly or daily. */
    ordinaryHoursPerWeek: zDecimalString.optional(),
    daysPerWeek: zDecimalString.optional(),
    weeksPaidPerYear: zDecimalString.default("52"),
  }),
  package: z.object({
    treatment: z.enum(["base_plus_super", "total_package_including_super"]),
    /** null → the active super-guarantee rule-pack rate. */
    employerSuperRate: zDecimalString.nullable().default(null),
    applyMaximumContributionBase: z.boolean().default(true),
  }),
  taxpayer: z.object({
    residency: z.enum(["resident", "foreign_resident", "working_holiday_maker"]),
    claimsTaxFreeThreshold: z.boolean().default(true),
    medicare: z
      .object({
        status: z.enum(["standard", "half_exemption", "full_exemption"]).default("standard"),
        hasPrivateHospitalCover: z.boolean().default(false),
        familyStatus: z.enum(["single", "family"]).default("single"),
        dependants: z.number().int().min(0).max(20).default(0),
        spouseIncome: zMoney.optional(),
      })
      .default({
        status: "standard",
        hasPrivateHospitalCover: false,
        familyStatus: "single",
        dependants: 0,
      }),
  }),
  adjustments: z
    .object({
      bonus: zMoney.optional(),
      otherAssessableIncome: zMoney.optional(),
      salarySacrificeSuper: zMoney.optional(),
      otherPreTaxDeductions: zMoney.optional(),
      postTaxDeductions: zMoney.optional(),
      workRelatedDeductions: zMoney.optional(),
      reportableFringeBenefits: zMoney.optional(),
    })
    .default({}),
  studyLoans: z.object({ enabled: z.boolean().default(false) }).default({ enabled: false }),
  withholding: z
    .object({
      payFrequency: zWithholdingCycle.default("fortnightly"),
      additionalPerPeriod: zMoney.optional(),
    })
    .default({ payFrequency: "fortnightly" }),
});

export type AuPayInput = z.infer<typeof zAuPayInput>;

export interface AuAnnualLiability {
  taxableIncome: Money;
  grossIncomeTax: Money;
  litoOffset: Money;
  medicareLevy: Money;
  medicareLevySurcharge: Money;
  studyLoanRepayment: Money;
  totalAnnualLiability: Money;
  /** Total liability ÷ taxable income (dimensionless decimal string). */
  effectiveRateOnTaxable: string;
  /** Statutory marginal income-tax bracket rate at the taxable income. */
  marginalBracketRate: string;
}

export interface AuPayOutput {
  annualised: {
    grossPackage: Money;
    baseSalary: Money;
    employerSuper: Money;
    grossCashIncome: Money;
  };
  liability: AuAnnualLiability;
  netAnnualCash: Money;
  netPerCycle: Money;
  cycleLabel: WithholdingCycle;
  /** Decision metric: net gain from the next $1,000 of gross cash income. */
  netValueOfNextThousand: Money;
  withholding: {
    perCycleTotal: Money;
    perCycleOrdinary: Money;
    perCycleStudyLoan: Money;
    perCycleAdditional: Money;
    annualised: Money;
    varianceFromAnnualLiability: Money;
    scaleUsed: string;
  } | null;
  withholdingUnavailableReason: string | null;
}
