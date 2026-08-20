/** Format a major-unit decimal string ("1234.5" / "-20") as "$1,234.50". */
export function formatMajor(value: string, currencySymbol = "$"): string {
  const negative = value.startsWith("-");
  const [intPartRaw = "0", fracRaw = ""] = (negative ? value.slice(1) : value).split(".");
  const cents = fracRaw.padEnd(2, "0").slice(0, 2);
  const grouped = new Intl.NumberFormat("en-AU").format(BigInt(intPartRaw || "0"));
  return `${negative ? "−" : ""}${currencySymbol}${grouped}.${cents}`;
}

/** "0.065" → "6.50%" for display. */
export function formatRatePct(rate: string): string {
  const scaled = Number.parseFloat(rate) * 100;
  return `${scaled.toFixed(2).replace(/\.?0+$/, "") || "0"}%`;
}

export function periodsToYearsLabel(periods: number, periodsPerYear: number): string {
  const years = Math.floor(periods / periodsPerYear);
  const rem = periods % periodsPerYear;
  if (years === 0) return `${rem} periods`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} periods`;
}
