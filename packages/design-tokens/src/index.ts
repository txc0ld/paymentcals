/**
 * Programmatic access to brand constants (charts, OG images). UI components
 * must consume the CSS custom properties in tokens.css, never these values.
 * STRATA system: strict monochrome black/white/zinc; series are separated
 * by luminance steps and must always pair with dash/shape cues (§20.2).
 */
export const brand = {
  black: "#000000",
  white: "#ffffff",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc600: "#52525b",
  zinc700: "#3f3f46",
} as const;

/** Monochrome categorical series for charts: luminance-stepped, so lines
 * must also differ by dash pattern or marker shape (§20.2 non-colour cues). */
export const chartSeries = [brand.white, brand.zinc400, brand.zinc600, brand.zinc300] as const;
