import { z } from "zod";
import { zMoney } from "@paymentcalcs/calculation-core";
import type { Money } from "@paymentcalcs/calculation-core";

/**
 * AU-BIZ-001 input, schema version 1 (§12.15).
 * GST treatment is always explicit — never inferred from item labels.
 */
export const GST_TREATMENTS = ["taxable", "gst_free", "input_taxed"] as const;
export type GstTreatment = (typeof GST_TREATMENTS)[number];

export const zGstLineItem = z.object({
  id: z.string().min(1),
  label: z.string().max(120).optional(),
  amount: zMoney,
  amountIs: z.enum(["exclusive", "inclusive"]),
  treatment: z.enum(GST_TREATMENTS),
  quantity: z.number().int().min(1).max(9999).default(1),
});

export const zGstInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("add"), amount: zMoney }),
  z.object({ mode: z.literal("remove"), amount: zMoney }),
  z.object({ mode: z.literal("split"), amount: zMoney }),
  z.object({
    mode: z.literal("line_items"),
    items: z.array(zGstLineItem).min(1).max(200),
    roundingLevel: z.enum(["per_line", "invoice_total"]),
  }),
]);

export type GstInput = z.infer<typeof zGstInput>;
export type GstLineItem = z.infer<typeof zGstLineItem>;

export interface GstLineResult {
  id: string;
  label?: string;
  treatment: GstTreatment;
  quantity: number;
  exclusiveAmount: Money;
  gstAmount: Money;
  inclusiveAmount: Money;
}

export interface GstOutput {
  mode: GstInput["mode"];
  /** Dimensionless decimal string from the rule pack, e.g. "0.10". */
  rate: string;
  exclusiveAmount: Money;
  gstAmount: Money;
  inclusiveAmount: Money;
  roundingLevel?: "per_line" | "invoice_total";
  lines?: GstLineResult[];
}
