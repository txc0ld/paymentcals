/**
 * Programmatic access to brand constants (charts, OG images). UI components
 * must consume the CSS custom properties in tokens.css, never these values.
 */
export const brand = {
  ink950: "#0b0d0f",
  ink900: "#121519",
  ink800: "#1b2025",
  paper50: "#f7f8f4",
  paper100: "#f1f3ee",
  grey500: "#7f8790",
  grey400: "#a7adb3",
  lime500: "#ccff00",
  blue500: "#3977ff",
  amber500: "#f3a712",
  red500: "#e5484d",
  green600: "#18794e",
} as const;

/** CVD-aware categorical series for charts (§20.2): blue, amber, green, grey. */
export const chartSeries = [brand.blue500, brand.amber500, brand.green600, brand.grey500] as const;
