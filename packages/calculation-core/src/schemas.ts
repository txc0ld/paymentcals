import { z } from "zod";
import { isDecimalString } from "./decimal";
import type { Frequency } from "./frequency";
import type { Money } from "./money";
import { moneyFromMinorUnits } from "./money";

export const zDecimalString = z
  .string()
  .refine(isDecimalString, "must be a decimal string like -1234.56");

export const zISODate = z.iso.date();
export const zISODateTime = z.iso.datetime({ offset: true });

export const zMoney: z.ZodType<Money> = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    minorUnits: z.string().regex(/^-?(0|[1-9]\d*)$/),
    scale: z.number().int().min(0).max(12),
  })
  .transform((raw) => moneyFromMinorUnits(raw.currency, raw.minorUnits, raw.scale));

export const zFrequency: z.ZodType<Frequency> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekly"),
    interval: z.number().int().positive().optional(),
    weekday: z.number().int().min(1).max(7).optional(),
  }),
  z.object({ kind: z.literal("fortnightly"), weekday: z.number().int().min(1).max(7).optional() }),
  z.object({ kind: z.literal("four_weekly"), weekday: z.number().int().min(1).max(7).optional() }),
  z.object({
    kind: z.literal("monthly"),
    day: z.number().int().min(1).max(31).optional(),
    endOfMonth: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("quarterly"), day: z.number().int().min(1).max(31).optional() }),
  z.object({ kind: z.literal("half_yearly"), day: z.number().int().min(1).max(31).optional() }),
  z.object({
    kind: z.literal("annually"),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
  }),
  z.object({ kind: z.literal("custom"), isoDuration: z.string().min(3) }),
]);

export const zRate = z.object({
  value: zDecimalString,
  basis: z.enum(["nominal", "effective", "simple"]),
  period: z.enum(["day", "week", "fortnight", "month", "quarter", "year"]),
  compoundingFrequency: zFrequency.optional(),
  dayCountConvention: z.string().optional(),
});

export const zJurisdiction = z.object({
  country: z.string().length(2),
  subdivision: z.string().optional(),
});

export function zCalculationRequestV1<TInput extends z.ZodType>(input: TInput) {
  return z.object({
    requestId: z.string().min(1),
    calculatorId: z.string().min(1),
    calculatorSchemaVersion: z.string().min(1),
    jurisdiction: zJurisdiction,
    locale: z.string().min(2),
    currency: z.string().regex(/^[A-Z]{3}$/),
    valuationDate: zISODate,
    requestedRulePacks: z.array(z.string()).optional(),
    input,
    options: z.object({
      traceLevel: z.enum(["none", "summary", "full"]),
      resultPrecision: z.number().int().min(0).max(12).optional(),
      deterministicSeed: z.string().optional(),
    }),
  });
}

export const zCalculationMessage = z.object({
  code: z.string().regex(/^PC-[A-Z]+-\d{4}$/),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  path: z.array(z.string()).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const zAssumptionRecord = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.enum([
    "official_rule",
    "contract_setting",
    "user_input",
    "editable_default",
    "projection",
  ]),
  value: z.unknown(),
  unit: z.string().optional(),
  editable: z.boolean(),
  materiality: z.enum(["low", "medium", "high"]),
  sourceId: z.string().optional(),
  explanation: z.string().min(1),
});
