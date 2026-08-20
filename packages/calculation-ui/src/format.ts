import type { Money } from "@paymentcalcs/calculation-core";

/**
 * Locale-aware money formatting from minor-unit strings without ever passing
 * currency through a float. BigInt splits major/minor; Intl formats the major
 * part's grouping only.
 */
export function formatMoney(money: Money, locale = "en-AU"): string {
  const negative = money.minorUnits.startsWith("-");
  const digits = negative ? money.minorUnits.slice(1) : money.minorUnits;
  const padded = digits.padStart(money.scale + 1, "0");
  const major = padded.slice(0, padded.length - money.scale) || "0";
  const minor = money.scale > 0 ? padded.slice(padded.length - money.scale) : "";

  const groupedMajor = new Intl.NumberFormat(locale).format(BigInt(major));
  const symbol = money.currency === "AUD" ? "$" : `${money.currency} `;
  const sign = negative ? "−" : "";
  return money.scale > 0
    ? `${sign}${symbol}${groupedMajor}.${minor}`
    : `${sign}${symbol}${groupedMajor}`;
}

/** "$1,234.56 AUD" style with explicit code for report surfaces. */
export function formatMoneyWithCode(money: Money, locale = "en-AU"): string {
  return `${formatMoney(money, locale)} ${money.currency}`;
}

/** Rate decimal string ("0.10") → "10%" without float drift on display. */
export function formatRatePercent(rate: string): string {
  const [intPart = "0", fracPart = ""] = rate.split(".");
  const scaled = `${intPart}${fracPart.padEnd(2, "0").slice(0, 2)}`.replace(/^0+(?=\d)/, "");
  const remainder = fracPart.slice(2).replace(/0+$/, "");
  return remainder ? `${scaled}.${remainder}%` : `${scaled}%`;
}
