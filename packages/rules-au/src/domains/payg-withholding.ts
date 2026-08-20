import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

/**
 * PAYG withholding statement of formulas (Schedule 1) and STSL components
 * (Schedule 8). Linear pieces y = a·x − b where x = whole dollars of weekly
 * earnings plus 99 cents. One row bounds each piece by weekly earnings.
 */
export const zCoefficientRow = z.object({
  /** Applies when weekly earnings are less than this whole-dollar bound… */
  lessThan: z.string().regex(/^\d+$/).optional(),
  /** …or at/above this bound (terminal row). Exactly one of the two is set. */
  andOver: z.string().regex(/^\d+$/).optional(),
  a: zDecimalString,
  b: zDecimalString,
});

export type CoefficientRow = z.infer<typeof zCoefficientRow>;

const scale = z.array(zCoefficientRow).min(1);

export const zPaygWithholdingRules = z.object({
  /** x = floor(weekly earnings in dollars) + 0.99 (Schedule 1 convention). */
  earningsInput: z.literal("floor_dollars_plus_99_cents"),
  /** Withholding rounded to the nearest dollar (75c rounds up per ATO note). */
  resultRounding: z.literal("nearest_dollar"),
  periodConversion: z.object({
    fortnightly: z.literal("halve_floor_add_99c"),
    monthly: z.literal("cents_33_add_1c_times_3_div_13_floor_add_99c"),
    quarterly: z.literal("div_13_floor_add_99c"),
  }),
  scales: z.object({
    scale1NoTaxFreeThreshold: scale.nullable(),
    scale2TaxFreeThreshold: scale.nullable(),
    scale3ForeignResident: scale.nullable(),
    scale5FullMedicareExemption: scale.nullable(),
    scale6HalfMedicareExemption: scale.nullable(),
  }),
  /** Scale 4 (no TFN): flat rate on total earnings, ignore cents in result. */
  scale4NoTfn: z
    .object({ resident: zDecimalString, foreignResident: zDecimalString })
    .nullable(),
  stslComponents: z.object({
    taxFreeThresholdOrForeign: scale.nullable(),
    noTaxFreeThreshold: scale.nullable(),
  }),
});

export type PaygWithholdingRules = z.infer<typeof zPaygWithholdingRules>;
export const zPaygWithholdingRulePack = zRulePackV1(zPaygWithholdingRules);
export type PaygWithholdingRulePack = RulePackV1<PaygWithholdingRules>;
