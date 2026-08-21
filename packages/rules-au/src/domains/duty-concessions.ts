import { z } from "zod";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";
import { zDutyBracket, zPercentBracket } from "./stamp-duty";

const dollars = z.string().regex(/^\d+$/);

/**
 * Published owner-occupier / first-home duty concessions, one pack per
 * jurisdiction, kept SEPARATE from the general-rate packs so authoring a
 * concession never disturbs a base pack's canonical hash. Each variant
 * mirrors exactly how its authority publishes the scheme.
 */

/** NSW FHBAS (Duties Act 1997 s78A): exempt to a cap, then the statutory
 * sliding formula duty = N − ((capValue − V) ÷ divisor × D), where N is the
 * general duty at V and D is the general duty at exemptUpTo. */
export const zNswSlidingScheme = z.object({
  exemptUpTo: dollars,
  /** Ineligible at or above this value (s74(3)). */
  capValue: dollars,
  divisor: dollars,
});

/** QLD: a concessional per-$100 table for owner-occupiers, plus first-home
 * deduction bands subtracted from the home-concession duty. */
export const zQldFirstHomeBand = z.object({
  over: dollars,
  upToExclusive: dollars.nullable(),
  deduction: dollars,
});

export const zDutyConcessionRules = z.object({
  nswFhbas: z
    .object({
      homes: zNswSlidingScheme,
      vacantLand: zNswSlidingScheme,
    })
    .nullable(),
  qldHome: z
    .object({
      brackets: z.array(zDutyBracket).min(1),
      per100Rounding: z.literal("part_thereof_up"),
      firstHome: z.object({
        bands: z.array(zQldFirstHomeBand).min(1),
        /** First-home concession unavailable at or above this value. */
        capValue: dollars,
      }),
    })
    .nullable(),
  vicPpr: z
    .object({
      brackets: z.array(zPercentBracket).min(1),
      rounding: z.literal("half_up_cents"),
      /** Concession does not apply above this value. */
      appliesUpTo: dollars,
    })
    .nullable(),
  actOwnerOccupier: z
    .object({
      brackets: z.array(zDutyBracket).min(1),
      per100Rounding: z.literal("part_thereof_up"),
    })
    .nullable(),
});

export type DutyConcessionRules = z.infer<typeof zDutyConcessionRules>;
export type QldFirstHomeBand = z.infer<typeof zQldFirstHomeBand>;
export const zDutyConcessionRulePack = zRulePackV1(zDutyConcessionRules);
export type DutyConcessionRulePack = RulePackV1<DutyConcessionRules>;
