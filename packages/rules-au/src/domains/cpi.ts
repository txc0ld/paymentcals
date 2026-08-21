import { z } from "zod";
import { zDecimalString, zISODate } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

/**
 * CPI domain payload: the ABS All groups consumer price index (RBA table G1
 * series GCPIAG), quarterly, machine-parsed from an archived snapshot.
 * Quarters are ascending by date; `index` is the published index number on
 * the stated reference base. Historic values only — never forecasts.
 */
export const zCpiQuarter = z.object({
  date: zISODate,
  index: zDecimalString,
});

export const zCpiRules = z.object({
  seriesId: z.string().min(1),
  indexReference: z.string().min(1),
  quarters: z.array(zCpiQuarter).min(8),
});

export type CpiQuarter = z.infer<typeof zCpiQuarter>;
export type CpiRules = z.infer<typeof zCpiRules>;

export const zCpiRulePack = zRulePackV1(zCpiRules);

export type CpiRulePack = RulePackV1<CpiRules>;
