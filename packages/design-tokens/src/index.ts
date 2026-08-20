/**
 * Programmatic access to brand constants (charts, OG images). UI components
 * must consume the CSS custom properties in tokens.css, never these values.
 * Aether Nexus system: violet primary, rose accent, near-black ground.
 */
export const brand = {
  black950: "#050505",
  slate100: "#e2e8f0",
  violet500: "#8b5cf6",
  violet300: "#a78bfa",
  violet700: "#6d28d9",
  rose500: "#f43f5e",
  rose700: "#be123c",
  mauve300: "#e0b0ff",
  mauve700: "#6f4291",
  green300: "#00ff7f",
  green700: "#00753f",
} as const;

/** CVD-aware categorical series for charts (§20.2). */
export const chartSeries = [brand.violet500, brand.green700, brand.rose700, "#64748b"] as const;
