import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

const dollars = z.string().regex(/^\d+$/);
const count = z.string().regex(/^\d+$/);

/**
 * Descriptive ATO Taxation-statistics packs (machine-parsed from archived
 * data.gov.au workbooks). These power comparison displays only — they are
 * never inputs to a liability calculation.
 */

/* ---------------------------------------------- income percentiles (T16) */
export const zIncomePercentileRow = z.object({
  percentile: z.number().int().min(1).max(100),
  /** Verbatim source label, e.g. "$22,147 to $23,472". */
  rangeLabel: z.string().min(1),
  lower: dollars,
  upper: dollars.nullable(),
  males: count,
  females: count,
  /** Net tax ÷ individuals within the percentile (2 dp). */
  averageNetTax: zDecimalString,
  /** Percentile's share of the national net tax pool (6 dp). */
  shareOfNetTax: zDecimalString,
});

export const zIncomePercentilesRules = z.object({
  incomeYear: z.string().min(1),
  totalIndividuals: count,
  percentiles: z.array(zIncomePercentileRow).length(100),
});

export type IncomePercentileRow = z.infer<typeof zIncomePercentileRow>;
export type IncomePercentilesRules = z.infer<typeof zIncomePercentilesRules>;
export const zIncomePercentilesRulePack = zRulePackV1(zIncomePercentilesRules);
export type IncomePercentilesRulePack = RulePackV1<IncomePercentilesRules>;

/* ------------------------------------------ super balance by age (T23A) */
export const zSuperBalanceCell = z.object({
  /** Verbatim source labels, e.g. "j. 60 - 64", "c. $45,001 to $120,000". */
  ageRange: z.string().min(1),
  sex: z.enum(["Male", "Female"]),
  taxableIncomeRange: z.string().min(1),
  individuals: count,
  medianBalance: dollars,
  averageBalance: dollars,
});

export const zSuperStatisticsRules = z.object({
  incomeYear: z.string().min(1),
  cells: z.array(zSuperBalanceCell).min(100),
});

export type SuperBalanceCell = z.infer<typeof zSuperBalanceCell>;
export type SuperStatisticsRules = z.infer<typeof zSuperStatisticsRules>;
export const zSuperStatisticsRulePack = zRulePackV1(zSuperStatisticsRules);
export type SuperStatisticsRulePack = RulePackV1<SuperStatisticsRules>;

/* ------------------------------------------------- super thresholds */
export const zSuperThresholdsRules = z.object({
  concessionalCaps: z
    .array(z.object({ financialYear: z.string().regex(/^\d{4}-\d{2}$/), cap: dollars }))
    .min(1),
  division293Threshold: dollars,
});

export type SuperThresholdsRules = z.infer<typeof zSuperThresholdsRules>;
export const zSuperThresholdsRulePack = zRulePackV1(zSuperThresholdsRules);
export type SuperThresholdsRulePack = RulePackV1<SuperThresholdsRules>;
