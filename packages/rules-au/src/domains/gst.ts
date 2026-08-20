import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

/**
 * GST domain payload. `standardRate` is a dimensionless decimal string
 * ("0.10" = 10%). Null when the pack structure was authored without a
 * fetchable source — engines treat null as rule-unavailable.
 */
export const zGstRules = z.object({
  standardRate: zDecimalString.nullable(),
});

export type GstRules = z.infer<typeof zGstRules>;

export const zGstRulePack = zRulePackV1(zGstRules);

export type GstRulePack = RulePackV1<GstRules>;
