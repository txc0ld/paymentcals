import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

const dollars = z.string().regex(/^\d+$/);

/**
 * General (non-concessional) transfer/stamp duty. Duty within a bracket is
 * baseAmount plus ratePer100 for every $100 (or part) of the value over the
 * bracket's `over` bound. Null general rules = jurisdiction not yet supported
 * (renders the Gate-3 "not yet supported" state, never a guess).
 */
export const zDutyBracket = z.object({
  over: dollars,
  upTo: dollars.nullable(),
  baseAmount: zDecimalString,
  ratePer100: zDecimalString,
});

export const zStampDutyRules = z.object({
  general: z
    .object({
      brackets: z.array(zDutyBracket).min(1),
      /** "$100 or part thereof" rounding: the partial hundred counts in full. */
      per100Rounding: z.literal("part_thereof_up"),
      minimumDuty: dollars.nullable(),
    })
    .nullable(),
});

export type StampDutyRules = z.infer<typeof zStampDutyRules>;
export type DutyBracket = z.infer<typeof zDutyBracket>;
export const zStampDutyRulePack = zRulePackV1(zStampDutyRules);
export type StampDutyRulePack = RulePackV1<StampDutyRules>;
