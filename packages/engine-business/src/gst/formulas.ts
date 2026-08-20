/**
 * §13.29 formula registry entries implemented by this engine. Methodology
 * pages and Working traces reference these IDs; pages never restate
 * ungoverned equations.
 */
export const GST_FORMULAS = {
  "F-GST-001": {
    id: "F-GST-001",
    version: "1.0.0",
    definition: "inclusive = exclusive × (1 + g)",
    variables: { exclusive: "GST-exclusive amount", g: "standard GST rate (rule pack)" },
    authority: "PRD §13.18; A New Tax System (Goods and Services Tax) Act 1999",
  },
  "F-GST-002": {
    id: "F-GST-002",
    version: "1.0.0",
    definition: "gst = inclusive × g ÷ (1 + g); exclusive = inclusive − gst",
    variables: { inclusive: "GST-inclusive amount", g: "standard GST rate (rule pack)" },
    authority: "PRD §13.18; A New Tax System (Goods and Services Tax) Act 1999",
  },
} as const;

export type GstFormulaId = keyof typeof GST_FORMULAS;
