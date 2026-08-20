import Decimal from "decimal.js";
import type { DecimalValue } from "./decimal";

/** §13.27 — every engine declares its rounding profile explicitly. */
export interface RoundingProfile {
  id: string;
  /** Decimal places carried through intermediate arithmetic. */
  intermediateScale: number;
  /** Decimal places of the display currency (2 for AUD dollars-and-cents). */
  moneyDisplayScale: number;
  mode: RoundingMode;
  roundEachPeriod: boolean;
  finalPaymentAdjustment: boolean;
  reconciliationToleranceMinorUnits: number;
}

export type RoundingMode = "half_up" | "half_even" | "floor" | "ceiling" | "truncate";

const DECIMAL_MODE: Record<RoundingMode, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
  floor: Decimal.ROUND_FLOOR,
  ceiling: Decimal.ROUND_CEIL,
  truncate: Decimal.ROUND_DOWN,
};

export function toDecimalRounding(mode: RoundingMode): Decimal.Rounding {
  return DECIMAL_MODE[mode];
}

/** Round a decimal to `scale` places using an explicit mode. */
export function roundTo(value: DecimalValue, scale: number, mode: RoundingMode): DecimalValue {
  return value.toDecimalPlaces(scale, toDecimalRounding(mode)) as DecimalValue;
}
