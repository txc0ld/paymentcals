import { Dec, dec, type DecimalString, type DecimalValue } from "./decimal.js";
import { roundTo, type RoundingMode } from "./rounding.js";

export type CurrencyCode = string;

declare const moneyBrand: unique symbol;

/**
 * §14.1 — money is an integer count of minor units serialised as a string.
 * The brand prevents constructing Money from arbitrary object literals and,
 * together with the engine lint rule, keeps `number` out of currency paths.
 */
export interface Money {
  readonly currency: CurrencyCode;
  /** Signed arbitrary-size integer serialised as a string. */
  readonly minorUnits: string;
  /** Number of minor-unit digits after the major-unit point (AUD: 2). */
  readonly scale: number;
  readonly [moneyBrand]: true;
}

const INTEGER_STRING = /^-?(0|[1-9]\d*)$/;

export class MoneyDomainError extends Error {
  readonly code = "PC-VAL-0001";
}

export function moneyFromMinorUnits(
  currency: CurrencyCode,
  minorUnits: string,
  scale: number,
): Money {
  if (!INTEGER_STRING.test(minorUnits)) {
    throw new MoneyDomainError(`minorUnits must be a signed integer string, got "${minorUnits}"`);
  }
  if (!Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw new MoneyDomainError(`scale must be an integer in [0,12], got ${scale}`);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new MoneyDomainError(`currency must be an ISO 4217 code, got "${currency}"`);
  }
  return { currency, minorUnits: normaliseZero(minorUnits), scale } as Money;
}

function normaliseZero(minorUnits: string): string {
  return minorUnits === "-0" ? "0" : minorUnits;
}

/** Parse a major-unit decimal string ("1234.56") into Money at the given scale. */
export function moneyFromDecimalString(
  currency: CurrencyCode,
  major: DecimalString,
  scale: number,
  mode: RoundingMode = "half_up",
): Money {
  const minor = roundTo(dec(major).times(new Dec(10).pow(scale)) as DecimalValue, 0, mode);
  return moneyFromMinorUnits(currency, minor.toFixed(0), scale);
}

/** Money as an exact decimal in major units. */
export function moneyToDecimal(money: Money): DecimalValue {
  return dec(money.minorUnits).div(new Dec(10).pow(money.scale)) as DecimalValue;
}

/** Serialised major-unit decimal at the money's own scale, e.g. "1234.56". */
export function moneyToDecimalString(money: Money): DecimalString {
  return moneyToDecimal(money).toFixed(money.scale);
}

function assertSameDenomination(a: Money, b: Money): void {
  if (a.currency !== b.currency || a.scale !== b.scale) {
    throw new MoneyDomainError(
      `cannot combine ${a.currency}/${a.scale} with ${b.currency}/${b.scale}`,
    );
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameDenomination(a, b);
  return moneyFromMinorUnits(
    a.currency,
    dec(a.minorUnits).plus(dec(b.minorUnits)).toFixed(0),
    a.scale,
  );
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameDenomination(a, b);
  return moneyFromMinorUnits(
    a.currency,
    dec(a.minorUnits).minus(dec(b.minorUnits)).toFixed(0),
    a.scale,
  );
}

export function negateMoney(a: Money): Money {
  return moneyFromMinorUnits(a.currency, dec(a.minorUnits).negated().toFixed(0), a.scale);
}

export function sumMoney(currency: CurrencyCode, scale: number, items: readonly Money[]): Money {
  let total = moneyFromMinorUnits(currency, "0", scale);
  for (const item of items) total = addMoney(total, item);
  return total;
}

/** Multiply by an exact decimal factor, rounding minor units with the given mode. */
export function multiplyMoney(a: Money, factor: DecimalValue, mode: RoundingMode): Money {
  const product = roundTo(dec(a.minorUnits).times(factor) as DecimalValue, 0, mode);
  return moneyFromMinorUnits(a.currency, product.toFixed(0), a.scale);
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameDenomination(a, b);
  return dec(a.minorUnits).comparedTo(dec(b.minorUnits)) as -1 | 0 | 1;
}

export function isZeroMoney(a: Money): boolean {
  return dec(a.minorUnits).isZero();
}

export function absMoney(a: Money): Money {
  return dec(a.minorUnits).isNegative() ? negateMoney(a) : a;
}

export function zeroMoney(currency: CurrencyCode, scale: number): Money {
  return moneyFromMinorUnits(currency, "0", scale);
}
