import type { DecimalString } from "./decimal.js";
import type { Frequency } from "./frequency.js";
import type { Money } from "./money.js";

/** §14.1 primitive aliases. */
export type ISODate = string; // YYYY-MM-DD, validated at schema boundary
export type ISODateTime = string;
export type RulePackId = string;
export type CalculatorId = string;
export type EngineVersion = string;
export type CalculationClass = "A" | "B" | "C" | "D";

export interface Rate {
  value: DecimalString;
  basis: "nominal" | "effective" | "simple";
  period: "day" | "week" | "fortnight" | "month" | "quarter" | "year";
  compoundingFrequency?: Frequency;
  dayCountConvention?: string;
}

/** §14.2 */
export interface CalculationRequestV1<TInput> {
  requestId: string;
  calculatorId: CalculatorId;
  calculatorSchemaVersion: string;
  jurisdiction: {
    country: string;
    subdivision?: string;
  };
  locale: string;
  currency: string;
  valuationDate: ISODate;
  requestedRulePacks?: RulePackId[];
  input: TInput;
  options: {
    traceLevel: "none" | "summary" | "full";
    resultPrecision?: number;
    deterministicSeed?: string;
  };
}

export type CalculationStatus = "success" | "success_with_warnings" | "invalid" | "failed";

export interface CalculationMessage {
  /** Stable domain code per §H.6, e.g. PC-VAL-0001, PC-RULE-0002, PC-CALC-0003. */
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  /** Input path the message attaches to, when field-scoped. */
  path?: string[];
  details?: Record<string, unknown>;
}

export interface RulePackManifestRef {
  rulePackId: RulePackId;
  rulesVersion: string;
  status: string;
  integritySha256: string;
}

export interface SourceRef {
  sourceId: string;
  title: string;
  url: string;
  authority: string;
  effectiveFrom?: ISODate;
  retrievedAt: ISODateTime;
  rulePackId?: RulePackId;
}

/** §14.4 */
export type AssumptionCategory =
  | "official_rule"
  | "contract_setting"
  | "user_input"
  | "editable_default"
  | "projection";

export interface AssumptionRecord {
  id: string;
  label: string;
  category: AssumptionCategory;
  value: unknown;
  unit?: string;
  editable: boolean;
  materiality: "low" | "medium" | "high";
  sourceId?: string;
  explanation: string;
}

/** §9.5 Working tab — one registered-formula step with substituted values. */
export interface TraceStep {
  id: string;
  /** Formula-registry ID, e.g. F-GST-001. */
  formulaId?: string;
  label: string;
  /** Symbolic expression, e.g. "gst = net × g". */
  expression?: string;
  /** Expression with substituted values, e.g. "gst = 100.00 × 0.10". */
  substitution?: string;
  value: string;
  unit?: string;
}

export interface CalculationTrace {
  level: "summary" | "full";
  steps: TraceStep[];
}

/** §13.30 */
export interface ReconciliationV1 {
  openingAmount: Money;
  additions: Money;
  reductions: Money;
  closingAmount: Money;
  expectedClosingAmount: Money;
  difference: Money;
  tolerance: Money;
  passed: boolean;
}

/** §14.3 */
export interface CalculationResultV1<TOutput> {
  requestId: string;
  calculationId: string;
  calculatorId: CalculatorId;
  status: CalculationStatus;
  calculationClass: CalculationClass;
  calculatedAt: ISODateTime;
  engineVersions: Record<string, EngineVersion>;
  rulePacks: RulePackManifestRef[];
  output?: TOutput;
  warnings: CalculationMessage[];
  errors: CalculationMessage[];
  assumptions: AssumptionRecord[];
  sources: SourceRef[];
  trace?: CalculationTrace;
  reconciliation?: ReconciliationV1[];
  integrity: {
    canonicalRequestHash: string;
    canonicalResultHash: string;
  };
}

/** §14.5 */
export interface TimelineEventV1 {
  id: string;
  type: string;
  effectiveDate: ISODate;
  endDate?: ISODate;
  recurrence?: Frequency;
  sequence?: number;
  targetIds: string[];
  amount?: Money;
  rate?: Rate;
  payload?: Record<string, unknown>;
  label?: string;
  source: "user" | "rule" | "derived" | "imported";
}

/** §14.7 */
export interface SourceRecordV1 {
  sourceId: string;
  authority: string;
  title: string;
  url: string;
  jurisdiction: string;
  domain: string;
  publicationDate?: ISODate;
  effectiveFrom?: ISODate;
  effectiveTo?: ISODate;
  retrievedAt: ISODateTime;
  archivedSnapshotRef?: string;
  contentHash?: string;
  notes?: string;
}
