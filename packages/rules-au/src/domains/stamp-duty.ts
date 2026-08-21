import { z } from "zod";
import { zDecimalString } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";

const dollars = z.string().regex(/^\d+$/);

/**
 * General (non-concessional) transfer/stamp duty. Exactly one of the three
 * rule shapes is populated per jurisdiction; all null = not yet supported
 * (renders the Gate-3 "not yet supported" state, never a guess).
 *
 * Shapes, matching how the authorities publish:
 * - `general`        per-$100-or-part marginal brackets (NSW QLD TAS SA WA,
 *                    and ACT whose top band applies to the TOTAL value).
 * - `generalPercent` percentage brackets (VIC): base + percent of the excess,
 *                    or percent of the TOTAL value for slab rows.
 * - `generalFormula` NT's statutory quadratic (Stamp Duty Act 1978 Sch 1):
 *                    D = a·V² + b·V with V = value/divisor up to `upTo`,
 *                    then percent-of-total slabs.
 */
export const zDutyBracket = z.object({
  over: dollars,
  upTo: dollars.nullable(),
  baseAmount: zDecimalString,
  ratePer100: zDecimalString,
  /** "excess": rate applies per $100 of value above `over`.
   * "total": slab row — rate applies per $100 of the whole value.
   * Explicit in every pack: schema defaults would change the canonical hash. */
  appliesTo: z.enum(["excess", "total"]),
});

export const zPercentBracket = z.object({
  over: dollars,
  upTo: dollars.nullable(),
  baseAmount: zDecimalString,
  /** Dimensionless decimal ("0.06" = 6%). */
  percent: zDecimalString,
  appliesTo: z.enum(["excess", "total"]),
});

export const zPercentSlab = z.object({
  /** Value from which this slab applies; `fromInclusive` states boundary. */
  from: dollars,
  fromInclusive: z.boolean(),
  percentOfTotal: zDecimalString,
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
  generalPercent: z
    .object({
      brackets: z.array(zPercentBracket).min(1),
      /** Cent rounding on the exact product. */
      rounding: z.literal("half_up_cents"),
      minimumDuty: dollars.nullable(),
    })
    .nullable(),
  generalFormula: z
    .object({
      /** D = quadraticCoefficient·V² + linearCoefficient·V, V = value/variableDivisor. */
      quadraticCoefficient: zDecimalString,
      linearCoefficient: zDecimalString,
      variableDivisor: dollars,
      /** Formula applies when value ≤ upTo (inclusive per the Act). */
      upTo: dollars,
      slabs: z.array(zPercentSlab).min(1),
      /** Official calculator convention: floor to the nearest 5 cents. */
      rounding: z.literal("floor_5_cents"),
      minimumDuty: dollars.nullable(),
    })
    .nullable(),
});

export type StampDutyRules = z.infer<typeof zStampDutyRules>;
export type DutyBracket = z.infer<typeof zDutyBracket>;
export type PercentBracket = z.infer<typeof zPercentBracket>;
export type PercentSlab = z.infer<typeof zPercentSlab>;
export const zStampDutyRulePack = zRulePackV1(zStampDutyRules);
export type StampDutyRulePack = RulePackV1<StampDutyRules>;
