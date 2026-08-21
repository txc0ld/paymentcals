import { z } from "zod";
import { zDecimalString, zISODate } from "@paymentcalcs/calculation-core";
import { zRulePackV1, type RulePackV1 } from "@paymentcalcs/rule-schema";
import { zCpiRules } from "./cpi";

const dollars = z.string().regex(/^\d+$/);

/* ------------------------------------------------------------------ WPI
 * Structurally identical to the CPI rules on purpose: the real-income
 * engine works over either series. */
export const zWpiRules = zCpiRules;
export type WpiRules = z.infer<typeof zWpiRules>;
export const zWpiRulePack = zRulePackV1(zWpiRules);
export type WpiRulePack = RulePackV1<WpiRules>;

/* ---------------------------------------------------------- Lender rates */
export const zLenderRatesRules = z.object({
  observationDate: zISODate,
  unit: z.literal("percent_per_annum"),
  series: z
    .array(z.object({ seriesId: z.string().min(1), label: z.string().min(1), ratePercent: zDecimalString }))
    .min(1),
});
export type LenderRatesRules = z.infer<typeof zLenderRatesRules>;
export const zLenderRatesRulePack = zRulePackV1(zLenderRatesRules);
export type LenderRatesRulePack = RulePackV1<LenderRatesRules>;

/* ------------------------------------------------------------------ SAPTO */
export const zSaptoRules = z.object({
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  shadeOutRatePerDollar: zDecimalString,
  statuses: z
    .array(
      z.object({
        status: z.enum(["single", "couple_each", "illness_separated_each"]),
        maxOffset: dollars,
        shadingOutThreshold: dollars,
        cutOutThreshold: dollars,
      }),
    )
    .length(3),
});
export type SaptoRules = z.infer<typeof zSaptoRules>;
export const zSaptoRulePack = zRulePackV1(zSaptoRules);
export type SaptoRulePack = RulePackV1<SaptoRules>;

/* ------------------------------------------------------- HELP indexation */
export const zHelpIndexationRules = z.object({
  appliesOn: z.string().regex(/^\d{2}-\d{2}$/),
  unpaidForMonths: z.number().int().positive(),
  method: z.literal("lower_of_cpi_wpi"),
  rates: z
    .array(
      z.object({
        year: z.string().regex(/^\d{4}$/),
        ratePercent: zDecimalString,
        previouslyPublishedPercent: zDecimalString.optional(),
      }),
    )
    .min(5),
});
export type HelpIndexationRules = z.infer<typeof zHelpIndexationRules>;
export const zHelpIndexationRulePack = zRulePackV1(zHelpIndexationRules);
export type HelpIndexationRulePack = RulePackV1<HelpIndexationRules>;

/* ----------------------------------------------------- GST registration */
export const zGstRegistrationRules = z.object({
  generalThreshold: dollars,
  nonProfitThreshold: dollars,
  taxiRideSourcingAlwaysRequired: z.boolean(),
  registrationDays: z.number().int().positive(),
});
export type GstRegistrationRules = z.infer<typeof zGstRegistrationRules>;
export const zGstRegistrationRulePack = zRulePackV1(zGstRegistrationRules);
export type GstRegistrationRulePack = RulePackV1<GstRegistrationRules>;

/* ---------------------------------------------------------- Schedule 5 */
export const zSchedule5Rules = z.object({
  additionalPaymentCapRate: zDecimalString,
  negativeResultsAreNil: z.boolean(),
  methods: z.array(z.string()).min(1),
});
export type Schedule5Rules = z.infer<typeof zSchedule5Rules>;
export const zSchedule5RulePack = zRulePackV1(zSchedule5Rules);
export type Schedule5RulePack = RulePackV1<Schedule5Rules>;
