import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

const dollars = z.string().regex(/^\d+$/);

export const zMedicareRules = z.object({
  /** Standard levy rate on taxable income (e.g. "0.02"). */
  levyRate: zDecimalString.nullable(),
  /**
   * Single low-income reduction: no levy at/below `lower`; between `lower`
   * and `upper` the levy is `phaseInRate` of the excess over `lower`.
   */
  lowIncomeSingle: z
    .object({
      lower: dollars,
      upper: dollars,
      phaseInRate: zDecimalString,
      saptoLower: dollars.nullable(),
      saptoUpper: dollars.nullable(),
    })
    .nullable(),
  lowIncomeFamily: z
    .object({
      lower: dollars,
      upper: dollars,
      saptoLower: dollars.nullable(),
      saptoUpper: dollars.nullable(),
      perDependentChildLowerIncrease: dollars,
      perDependentChildUpperIncrease: dollars,
    })
    .nullable(),
  /** Medicare levy surcharge tiers (base tier rate "0"). */
  mls: z
    .object({
      tiers: z
        .array(
          z.object({
            singleOver: dollars,
            singleUpTo: dollars.nullable(),
            familyOver: dollars,
            familyUpTo: dollars.nullable(),
            rate: zDecimalString,
          }),
        )
        .min(2),
      familyPerChildIncrease: dollars,
    })
    .nullable(),
});

export type MedicareRules = z.infer<typeof zMedicareRules>;
export const zMedicareRulePack = zRulePackV1(zMedicareRules);
export type MedicareRulePack = RulePackV1<MedicareRules>;
