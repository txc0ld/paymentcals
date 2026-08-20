import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

export const zSuperGuaranteeRules = z.object({
  /** Super guarantee charge percentage as a decimal (e.g. "0.12"). */
  rate: zDecimalString.nullable(),
  maxContributionBase: z
    .object({
      basis: z.enum(["quarterly", "annual"]),
      amount: z.string().regex(/^\d+$/),
    })
    .nullable(),
});

export type SuperGuaranteeRules = z.infer<typeof zSuperGuaranteeRules>;
export const zSuperGuaranteeRulePack = zRulePackV1(zSuperGuaranteeRules);
export type SuperGuaranteeRulePack = RulePackV1<SuperGuaranteeRules>;
