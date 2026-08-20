import Decimal from "decimal.js";

/**
 * Shared arbitrary-precision decimal constructor for all engine arithmetic.
 * Precision is intentionally far above any statutory requirement; final
 * precision is always applied through an explicit RoundingProfile.
 */
export const Dec = Decimal.clone({ precision: 40, defaults: true });

export type DecimalValue = InstanceType<typeof Dec>;

/** Serialised arbitrary-precision decimal, e.g. "0.10" or "-1234.5678". */
export type DecimalString = string;

const DECIMAL_STRING = /^-?(0|[1-9]\d*)(\.\d+)?$/;

export function isDecimalString(value: string): value is DecimalString {
  return DECIMAL_STRING.test(value);
}

export function dec(value: DecimalString | number): DecimalValue {
  return new Dec(value);
}
