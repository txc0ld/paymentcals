import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

/**
 * Piecewise bracket: applies `rate` to each dollar over `from` up to `to`
 * (null = unbounded). `from`/`to` are whole-dollar taxable-income bounds as
 * strings; the bracket covers income strictly above `from`.
 */
export const zTaxBracket = z.object({
  over: z.string().regex(/^\d+$/),
  upTo: z.string().regex(/^\d+$/).nullable(),
  rate: zDecimalString,
});

export type TaxBracket = z.infer<typeof zTaxBracket>;

export const zLito = z.object({
  maxOffset: z.string().regex(/^\d+$/),
  /** Full offset at or below this taxable income. */
  fullUpTo: z.string().regex(/^\d+$/),
  taper1: z.object({
    over: z.string().regex(/^\d+$/),
    upTo: z.string().regex(/^\d+$/),
    reductionPerDollar: zDecimalString,
  }),
  taper2: z.object({
    over: z.string().regex(/^\d+$/),
    upTo: z.string().regex(/^\d+$/),
    startingOffset: z.string().regex(/^\d+$/),
    reductionPerDollar: zDecimalString,
  }),
});

export const zIncomeTaxRules = z.object({
  resident: z.array(zTaxBracket).min(2).nullable(),
  foreignResident: z.array(zTaxBracket).min(1).nullable(),
  workingHolidayMaker: z.array(zTaxBracket).min(1).nullable(),
  lito: zLito.nullable(),
});

export type IncomeTaxRules = z.infer<typeof zIncomeTaxRules>;
export const zIncomeTaxRulePack = zRulePackV1(zIncomeTaxRules);
export type IncomeTaxRulePack = RulePackV1<IncomeTaxRules>;
