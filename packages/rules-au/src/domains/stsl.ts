import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

const dollars = z.string().regex(/^\d+$/);

/**
 * Study and training support loans (HELP/STSL) compulsory repayment.
 * From 2025-26 the system is marginal (§13.17); 2024-25 and earlier apply a
 * single rate to the whole repayment income.
 */
export const zStslRules = z.discriminatedUnion("system", [
  z.object({
    system: z.literal("marginal"),
    /** No repayment at or below this repayment income. */
    threshold: dollars,
    bands: z
      .array(
        z.object({
          /** Marginal amount applies to each dollar over `over` up to `upTo`. */
          over: dollars,
          upTo: dollars.nullable(),
          rate: zDecimalString,
          /** Base repayment at `over` (e.g. "9028" at $129,717 for 2026-27). */
          baseAmount: dollars,
        }),
      )
      .min(1),
    /** Above this repayment income the repayment is rateOfTotal × income. */
    highIncome: z.object({
      over: dollars,
      rateOfTotal: zDecimalString,
    }),
  }),
  z.object({
    system: z.literal("whole_income_rate"),
    threshold: dollars,
    rateTable: z
      .array(
        z.object({
          over: dollars,
          upTo: dollars.nullable(),
          rateOfTotal: zDecimalString,
        }),
      )
      .min(2),
  }),
]);

export type StslRules = z.infer<typeof zStslRules>;
export const zStslRulePack = zRulePackV1(zStslRules);
export type StslRulePack = RulePackV1<StslRules>;
