"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dec,
  isZeroMoney,
  moneyFromDecimalString,
  subtractMoney,
  sumMoney,
  type CalculationRequestV1,
  type CalculationResultV1,
  type DecimalValue,
  type Money,
} from "@paymentcalcs/calculation-core";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  EngineFailureState,
  ExplainabilityTabs,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  RuleUnavailableState,
  ScenarioActions,
  SegmentedControl,
  UniversalDisclosure,
  downloadCsv,
  formatMoney,
  formatRatePercent,
  toCsv,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import {
  calculateGst,
  computeGst,
  type GstInput,
  type GstOutput,
  type GstResolution,
} from "@paymentcalcs/engine-business";
import { bisect, defaultSolverOptions } from "@paymentcalcs/financial-solvers";
import { resolveRulePack, type ResolveOutcome } from "@paymentcalcs/rule-schema";
import {
  allAuRulePacks,
  auIntegrityManifest,
  type GstRegistrationRulePack,
  type GstRulePack,
} from "@paymentcalcs/rules-au";
import { decodeUrlState, encodeUrlState } from "@paymentcalcs/scenario-schema";
import { analytics } from "../../lib/analytics";
import { allowDraftRules } from "../../lib/draft-rules";
import { parseMoneyInput } from "../../lib/money-input";
import { saveScenario } from "../../lib/scenario-store";
import { LineItemsEditor, emptyLine, type DraftLineItem } from "./line-items-editor";

const entry = getRegistryEntry("AU-BIZ-001")!;

type SimpleMode = "add" | "remove" | "split";
type UiMode = "simple" | "advanced";

interface UrlInputState {
  uiMode: UiMode;
  simpleMode: SimpleMode;
  amountRaw: string;
  items?: DraftLineItem[];
  roundingLevel?: "per_line" | "invoice_total";
}

const SIMPLE_MODES: Array<{ value: SimpleMode; label: string }> = [
  { value: "add", label: "Add GST" },
  { value: "remove", label: "Remove GST" },
  { value: "split", label: "Split GST" },
];

const PRIMARY_LABELS: Record<SimpleMode, string> = {
  add: "GST-inclusive total",
  remove: "GST-exclusive amount",
  split: "GST component",
};

const LIMITATIONS = [
  "This tool works with amounts you enter and the standard GST rate only. It does not determine whether you are or must be registered for GST.",
  "Whether a supply is taxable, GST-free or input taxed is your selection. The calculator never infers it from item names, and entitlement to input tax credits is not assessed.",
  "Special GST rules (margin scheme, reverse charge, imports, long-term accommodation) are out of scope for this calculator.",
  "Result accuracy class A: deterministic arithmetic on your inputs under the resolved rule pack.",
];

/** Shared cap across editor, URL state and engine schema. */
const MAX_INVOICE_LINES = 200;

/** Registration thresholds are reference-only: unresolved, the panel hides. */
type RegistrationResolution =
  | "pending"
  | { ok: true; pack: GstRegistrationRulePack; draft: boolean }
  | { ok: false };

/** Whole-dollar pack threshold, formatted for display. */
function threshold(dollars: string): string {
  return formatMoney(moneyFromDecimalString("AUD", dollars, 0));
}

/** Today in the calculator's jurisdiction, not UTC (rule packs are date-gated). */
function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function GstCalculator() {
  const [resolution, setResolution] = useState<ResolveOutcome | "pending">("pending");
  const [registration, setRegistration] = useState<RegistrationResolution>("pending");
  const [uiMode, setUiMode] = useState<UiMode>("simple");
  const [simpleMode, setSimpleMode] = useState<SimpleMode>("add");
  const [amountRaw, setAmountRaw] = useState("");
  const [items, setItems] = useState<DraftLineItem[]>([emptyLine("line-1")]);
  const [roundingLevel, setRoundingLevel] = useState<"per_line" | "invoice_total">("per_line");
  const [result, setResult] = useState<CalculationResultV1<GstOutput> | null>(null);
  /** Reverse-target entry is a local what-if; it is never written to the share URL. */
  const [targetNetRaw, setTargetNetRaw] = useState("");
  // URL hydration must complete before the URL-write effect may run, and must
  // run exactly once (StrictMode double-invokes effects in development).
  const [hydrated, setHydrated] = useState(false);
  const hydratedOnce = useRef(false);

  // Resolve the rule pack once (fail-closed; §16.6).
  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "gst",
      jurisdiction: "AU",
      valuationDate: todayIso(),
      allowDraftRules,
    }).then((outcome) => {
      if (cancelled) return;
      setResolution(outcome);
      if (!outcome.ok) {
        analytics.track("rule_unavailable_shown", {
          calculator_id: entry.id,
          rule_status: "unavailable",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Registration thresholds are reference figures only — they never feed the
  // engine, and an unresolved pack simply removes the panel (§16.6).
  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "gst-registration",
      jurisdiction: "AU",
      valuationDate: todayIso(),
      allowDraftRules,
    }).then((outcome) => {
      if (cancelled) return;
      setRegistration(
        outcome.ok
          ? { ok: true, pack: outcome.pack as GstRegistrationRulePack, draft: outcome.draft }
          : { ok: false },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate input state from the share URL (versioned; unknown versions ignored).
  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    const param = new URLSearchParams(window.location.search).get("s");
    if (!param) {
      setHydrated(true);
      return;
    }
    const decoded = decodeUrlState(param);
    if (
      decoded.ok &&
      decoded.state.calculatorId === entry.id &&
      typeof decoded.state.input === "object" &&
      decoded.state.input !== null
    ) {
      const input = decoded.state.input as Partial<UrlInputState>;
      if (input.uiMode === "simple" || input.uiMode === "advanced") setUiMode(input.uiMode);
      if (input.simpleMode && ["add", "remove", "split"].includes(input.simpleMode)) {
        setSimpleMode(input.simpleMode);
      }
      if (typeof input.amountRaw === "string") setAmountRaw(input.amountRaw.slice(0, 24));
      if (Array.isArray(input.items) && input.items.length > 0) {
        setItems(
          input.items
            .slice(0, MAX_INVOICE_LINES)
            .map((item, i) => ({ ...emptyLine(`line-${i + 1}`), ...item, id: `line-${i + 1}` })),
        );
      }
      if (input.roundingLevel === "per_line" || input.roundingLevel === "invoice_total") {
        setRoundingLevel(input.roundingLevel);
      }
    }
    setHydrated(true);
  }, []);

  // Parse current inputs into an engine input (or field errors).
  const parsed = useMemo(() => {
    if (uiMode === "simple") {
      const money = parseMoneyInput(amountRaw);
      if (!money.ok) {
        return { input: null, amountError: money.error ?? undefined, itemErrors: {} as Record<string, string> };
      }
      return {
        input: { mode: simpleMode, amount: money.money } satisfies GstInput,
        amountError: undefined,
        itemErrors: {},
      };
    }
    const itemErrors: Record<string, string> = {};
    const engineItems: Array<{
      id: string;
      label?: string;
      amount: Money;
      amountIs: "exclusive" | "inclusive";
      treatment: DraftLineItem["treatment"];
      quantity: number;
    }> = [];
    for (const item of items) {
      const money = parseMoneyInput(item.amountRaw);
      if (!money.ok) {
        if (money.error) itemErrors[item.id] = money.error;
        continue;
      }
      // Strict integer parse: "1.9" or "1abc" must error, never truncate.
      if (!/^\d{1,4}$/.test(item.quantityRaw.trim()) || Number(item.quantityRaw) < 1) {
        itemErrors[item.id] = "Quantity must be a whole number between 1 and 9999.";
        continue;
      }
      const quantity = Number(item.quantityRaw.trim());
      engineItems.push({
        id: item.id,
        ...(item.label.trim() ? { label: item.label.trim() } : {}),
        amount: money.money,
        amountIs: item.amountIs,
        treatment: item.treatment,
        quantity,
      });
    }
    if (engineItems.length === 0 || Object.keys(itemErrors).length > 0) {
      return { input: null, amountError: undefined, itemErrors };
    }
    return {
      input: { mode: "line_items", items: engineItems, roundingLevel } satisfies GstInput,
      amountError: undefined,
      itemErrors,
    };
  }, [uiMode, simpleMode, amountRaw, items, roundingLevel]);

  // Run the engine whenever inputs are valid (Class A — sub-millisecond, no loader §20.12).
  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !parsed.input) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const gstResolution: GstResolution = {
      pack: resolution.pack as GstRulePack,
      manifestRef: resolution.manifestRef,
    };
    const started = performance.now();
    calculateGst(
      {
        requestId: "web-live",
        calculatorId: entry.id,
        calculatorSchemaVersion: entry.inputSchemaVersion,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        valuationDate: todayIso(),
        input: parsed.input,
        options: { traceLevel: "full" },
      },
      gstResolution,
      { now: new Date().toISOString() },
    ).then((calculated) => {
      if (cancelled) return;
      setResult(calculated);
      const succeeded =
        calculated.status === "success" || calculated.status === "success_with_warnings";
      analytics.track(succeeded ? "calculation_completed" : "calculation_failed", {
        calculator_id: entry.id,
        mode: uiMode === "simple" ? "simple" : "advanced",
        has_warnings: calculated.warnings.length > 0,
        duration_bucket: performance.now() - started < 100 ? "under_100ms" : "under_750ms",
        ...(succeeded ? {} : { error_code: calculated.errors[0]?.code ?? "PC-CALC-0000" }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resolution, parsed.input, uiMode]);

  // Reflect input state into the share URL (replace, never push).
  useEffect(() => {
    if (!hydrated) return;
    const state: UrlInputState = {
      uiMode,
      simpleMode,
      amountRaw,
      ...(uiMode === "advanced" ? { items, roundingLevel } : {}),
    };
    const encoded = encodeUrlState({ calculatorId: entry.id, input: state });
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
  }, [hydrated, uiMode, simpleMode, amountRaw, items, roundingLevel]);

  async function onSave(): Promise<string> {
    const now = new Date().toISOString();
    const scenarioId = `sc_${crypto.randomUUID().slice(0, 8)}`;
    try {
      await saveScenario({
        scenarioId,
        schemaVersion: "1",
        calculatorId: entry.id,
        createdAt: now,
        updatedAt: now,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        input: { uiMode, simpleMode, amountRaw, items, roundingLevel },
        selectedRulePacks: resolution !== "pending" && resolution.ok ? [resolution.pack.rulePackId] : [],
        consent: { storage: "local" },
      });
      analytics.track("scenario_action", { calculator_id: entry.id, action: "save" });
      return "Saved on this device";
    } catch {
      return "Saving is unavailable in this browser";
    }
  }

  async function onShare(): Promise<string> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      analytics.track("scenario_action", { calculator_id: entry.id, action: "share" });
      return "Link copied";
    } catch {
      return "Copy the address bar URL to share";
    }
  }

  function onReset() {
    setAmountRaw("");
    setItems([emptyLine("line-1")]);
    setSimpleMode("add");
    setRoundingLevel("per_line");
    setTargetNetRaw("");
    setResult(null);
    analytics.track("scenario_action", { calculator_id: entry.id, action: "reset" });
  }

  const draft =
    (resolution !== "pending" && resolution.ok && resolution.draft) ||
    (registration !== "pending" && registration.ok && registration.draft);
  const output = result?.output;
  const registrationRules = registration !== "pending" && registration.ok ? registration.pack.rules : null;

  /**
   * Invoice reconciliation: the rendered lines summed against the invoice
   * totals the engine reported. A difference is stated in full, never hidden —
   * with invoice-total rounding the two can legitimately differ by cents.
   */
  const reconciliation = useMemo(() => {
    const lines = output?.lines;
    if (!output || !lines || lines.length === 0) return null;
    const { currency, scale } = output.inclusiveAmount;
    const sums = {
      exclusive: sumMoney(currency, scale, lines.map((line) => line.exclusiveAmount)),
      gst: sumMoney(currency, scale, lines.map((line) => line.gstAmount)),
      inclusive: sumMoney(currency, scale, lines.map((line) => line.inclusiveAmount)),
    };
    const differences = {
      exclusive: subtractMoney(sums.exclusive, output.exclusiveAmount),
      gst: subtractMoney(sums.gst, output.gstAmount),
      inclusive: subtractMoney(sums.inclusive, output.inclusiveAmount),
    };
    return {
      sums,
      differences,
      lineCount: lines.length,
      matched:
        isZeroMoney(differences.exclusive) &&
        isZeroMoney(differences.gst) &&
        isZeroMoney(differences.inclusive),
    };
  }, [output]);

  const targetNet = useMemo(() => parseMoneyInput(targetNetRaw), [targetNetRaw]);

  /**
   * Reverse target (E24): the invoice amount whose GST-exclusive remainder is
   * the net you want to keep. Monotonic bisection re-runs the same forward GST
   * engine at every iteration — the solved figure is then recomputed forward
   * and shown, so nothing is displayed that the forward engine does not agree
   * with. A solver that does not converge yields no number at all.
   */
  const reverseTarget = useMemo(() => {
    if (resolution === "pending" || !resolution.ok || !targetNet.ok) return null;
    const target = new Dec(targetNet.money.minorUnits).div(100) as DecimalValue;
    if (target.lessThanOrEqualTo(0)) return null;

    const gstResolution: GstResolution = {
      pack: resolution.pack as GstRulePack,
      manifestRef: resolution.manifestRef,
    };
    const forward = (inclusiveMajor: string) => {
      const request: CalculationRequestV1<GstInput> = {
        requestId: "web-reverse",
        calculatorId: entry.id,
        calculatorSchemaVersion: entry.inputSchemaVersion,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        valuationDate: todayIso(),
        input: { mode: "remove", amount: moneyFromDecimalString("AUD", inclusiveMajor, 2) },
        options: { traceLevel: "none" },
      };
      return computeGst(request, gstResolution).output ?? null;
    };
    const toCents = (value: DecimalValue) => value.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2);

    let objectiveFailed = false;
    const objective = (candidate: DecimalValue): DecimalValue => {
      const output = forward(toCents(candidate));
      if (!output) {
        objectiveFailed = true;
        return new Dec(0) as DecimalValue;
      }
      return new Dec(output.exclusiveAmount.minorUnits).div(100).minus(target) as DecimalValue;
    };

    const upper = Number(target.times(10).plus(100).toFixed(2));
    const solved = bisect(objective, {
      ...defaultSolverOptions(0, upper),
      monotonicity: "monotone_increasing",
      preference: "smallest_meeting_target",
    });
    if (objectiveFailed || solved.status !== "converged") {
      return {
        ok: false as const,
        target,
        reason:
          solved.status === "unattainable"
            ? "No invoice amount in the searched range leaves that net amount after GST, so no figure is shown."
            : "The solver did not converge on an invoice amount for that net target, so no figure is shown.",
      };
    }
    const invoiceMajor = toCents(solved.value);
    const verified = forward(invoiceMajor);
    if (!verified) {
      return {
        ok: false as const,
        target,
        reason: "The forward recomputation did not return a result, so no figure is shown.",
      };
    }
    const net = new Dec(verified.exclusiveAmount.minorUnits).div(100) as DecimalValue;
    return {
      ok: true as const,
      target,
      verified,
      overshoot: net.minus(target) as DecimalValue,
      iterations: solved.iterations,
      discontinuity: solved.discontinuity,
    };
  }, [resolution, targetNet]);

  function onDownloadInvoiceCsv() {
    const lines = output?.lines;
    if (!output || !lines || lines.length === 0) return;
    const major = (amount: Money) => new Dec(amount.minorUnits).div(10 ** amount.scale).toFixed(amount.scale);
    downloadCsv(
      "gst-invoice.csv",
      toCsv(
        ["line", "label", "treatment", "quantity", "exclusive", "gst", "inclusive"],
        [
          ...lines.map((line, index) => [
            index + 1,
            line.label ?? `Line ${index + 1}`,
            line.treatment,
            line.quantity,
            major(line.exclusiveAmount),
            major(line.gstAmount),
            major(line.inclusiveAmount),
          ]),
          [
            "",
            "Totals",
            `rate ${output.rate}`,
            "",
            major(output.exclusiveAmount),
            major(output.gstAmount),
            major(output.inclusiveAmount),
          ],
        ],
      ),
    );
  }

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel:
                resolution !== "pending" && resolution.ok
                  ? `GST at ${output ? formatRatePercent(output.rate) : "standard rate"}`
                  : "Standard rate",
              calculationClass: entry.calculationClass,
              ruleStatus:
                resolution === "pending"
                  ? { label: "Resolving rules", tone: "neutral" }
                  : resolution.ok
                    ? draft
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
            }}
            methodologyHref={`/methodology/${entry.slug}`}
            actions={<ScenarioActions onSave={onSave} onShare={onShare} onReset={onReset} />}
          />
        }
        inputs={
          resolution !== "pending" && !resolution.ok ? (
            <RuleUnavailableState jurisdictionLabel="Australia" detail={resolution.reason} />
          ) : (
            <div className="grid gap-6">
              {/* Calculator mode lives above the financial inputs it controls. */}
              <div className="no-print flex justify-start border-b border-hairline pb-5">
                <SegmentedControl
                  label="Calculator mode"
                  value={uiMode}
                  onChange={setUiMode}
                  options={[
                    { value: "simple", label: "Simple" },
                    { value: "advanced", label: "Invoice" },
                  ]}
                />
              </div>
              {uiMode === "simple" ? (
                <>
                  {/* The control is inline-flex; as a bare grid item it would be
                    * stretched, painting an empty segment after the last option. */}
                  <div className="grid justify-items-start">
                    <SegmentedControl
                      label="GST operation"
                      value={simpleMode}
                      onChange={setSimpleMode}
                      options={SIMPLE_MODES}
                    />
                  </div>
                  <MoneyField
                    id="gst-amount"
                    label={simpleMode === "add" ? "Amount excluding GST" : "Amount including GST"}
                    description={
                      simpleMode === "add"
                        ? "The GST-exclusive price you are starting from."
                        : "The GST-inclusive price you are starting from."
                    }
                    value={amountRaw}
                    onChange={setAmountRaw}
                    error={parsed.amountError}
                  />
                  <div className="grid gap-4 border-t border-hairline pt-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                      Work back from a net amount
                    </span>
                    <MoneyField
                      id="gst-target-net"
                      label="Net amount you want to keep"
                      description="Solves for the invoice total whose GST-exclusive remainder is this amount. Leave it blank to ignore it."
                      value={targetNetRaw}
                      onChange={setTargetNetRaw}
                      error={!targetNet.ok && targetNet.error ? targetNet.error : undefined}
                    />
                  </div>
                </>

              ) : (
                <>
                  <div className="grid justify-items-start gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">Rounding</span>
                    <SegmentedControl
                      label="Rounding level"
                      value={roundingLevel}
                      onChange={setRoundingLevel}
                      options={[
                        { value: "per_line", label: "Per line" },
                        { value: "invoice_total", label: "Invoice total" },
                      ]}
                    />
                  </div>
                  <LineItemsEditor items={items} onChange={setItems} errors={parsed.itemErrors} />
                </>
              )}
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>
              No result can be shown while the required rule set is unavailable.
            </EmptyState>
          ) : (
            <>
              {result && !output && result.errors.length > 0 ? (
            <EngineFailureState referenceId={result.calculationId} />
          ) : !output ? (
            <EmptyState>
              Enter an amount to see the GST breakdown instantly, with the full working shown
              below the result.
            </EmptyState>
          ) : (
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              <PrimaryResult
                label={output.mode === "line_items" ? "Invoice total (inc GST)" : PRIMARY_LABELS[output.mode as SimpleMode]}
                amount={
                  output.mode === "line_items"
                    ? output.inclusiveAmount
                    : output.mode === "add"
                      ? output.inclusiveAmount
                      : output.mode === "remove"
                        ? output.exclusiveAmount
                        : output.gstAmount
                }
                qualifier={`At the standard GST rate of ${formatRatePercent(output.rate)} under the resolved rule pack.`}
              />
              <div className="grid gap-4 @sm:grid-cols-2 @xl:grid-cols-3">
                <ResultMetric label="Excluding GST" amount={output.exclusiveAmount} />
                <ResultMetric label="GST" amount={output.gstAmount} />
                <ResultMetric label="Including GST" amount={output.inclusiveAmount} />
              </div>
              {result && result.warnings.length > 0 ? (
                <ul className="grid gap-4">
                  {result.warnings.map((warning) => (
                    <li key={warning.code} className="nexus-panel-soft border-warn bg-warn-surface p-4 text-[13px] leading-5 text-ink-2">
                      {warning.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
              {uiMode === "simple" && reverseTarget ? (
                <section
                  aria-label="Invoice amount for a net target"
                  className="nexus-panel @container grid min-w-0 gap-5 p-6 md:p-8"
                >
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    To keep {formatMoney(moneyFromDecimalString("AUD", reverseTarget.target.toFixed(2), 2))} after GST
                  </h2>
                  {reverseTarget.ok ? (
                    <>
                      <div className="flex min-w-0 flex-col gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                          Invoice this amount
                        </span>
                        <span
                          role="status"
                          aria-live="polite"
                          data-money
                          className="break-words font-mono text-[length:var(--pc-text-result-xl)] font-medium leading-none tracking-tight tabular-nums text-ink"
                        >
                          {formatMoney(reverseTarget.verified.inclusiveAmount)}
                        </span>
                      </div>
                      <div className="grid gap-4 @sm:grid-cols-3">
                        <ResultMetric label="Excluding GST" amount={reverseTarget.verified.exclusiveAmount} />
                        <ResultMetric label="GST" amount={reverseTarget.verified.gstAmount} />
                        <ResultMetric label="Including GST" amount={reverseTarget.verified.inclusiveAmount} />
                      </div>
                      <p className="text-[12px] leading-5 text-ink-2">
                        Verified forward: running the GST engine on{" "}
                        {formatMoney(reverseTarget.verified.inclusiveAmount)} at{" "}
                        {formatRatePercent(reverseTarget.verified.rate)} leaves{" "}
                        {formatMoney(reverseTarget.verified.exclusiveAmount)} excluding GST
                        {reverseTarget.overshoot.isZero()
                          ? ", exactly the net amount entered"
                          : ` — ${formatMoney(moneyFromDecimalString("AUD", reverseTarget.overshoot.toFixed(2), 2))} above the net amount entered, because invoice amounts move in whole cents`}
                        . The solver reached this in {reverseTarget.iterations}{" "}
                        {reverseTarget.iterations === 1 ? "iteration" : "iterations"}
                        {reverseTarget.discontinuity ? ", stopping at the cent boundary inside the bracket" : ""}.
                      </p>
                    </>
                  ) : (
                    <p role="status" className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                      {reverseTarget.reason}
                    </p>
                  )}
                </section>
              ) : null}
              {registrationRules ? (
                <section
                  aria-label="GST registration thresholds"
                  className="nexus-panel-soft @container grid min-w-0 gap-4 p-6 md:p-8"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      GST registration thresholds
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      From the resolved rule pack
                    </span>
                  </div>
                  <dl className="grid gap-px border border-hairline bg-hairline @md:grid-cols-2">
                    <div className="grid content-start gap-1 bg-surface-2 p-5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                        GST turnover threshold
                      </dt>
                      <dd className="font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">
                        {threshold(registrationRules.generalThreshold)}
                      </dd>
                    </div>
                    <div className="grid content-start gap-1 bg-surface-2 p-5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                        Non-profit body threshold
                      </dt>
                      <dd className="font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">
                        {threshold(registrationRules.nonProfitThreshold)}
                      </dd>
                    </div>
                  </dl>
                  <ul className="grid gap-2 text-[13px] leading-5 text-ink-2">
                    {registrationRules.taxiRideSourcingAlwaysRequired ? (
                      <li>
                        Taxi, limousine and ride-sourcing drivers are required to register for GST
                        regardless of turnover.
                      </li>
                    ) : null}
                    <li>
                      Registration is required within {registrationRules.registrationDays} days of GST
                      turnover reaching the relevant threshold.
                    </li>
                  </ul>
                  <p className="text-[12px] leading-5 text-ink-3">
                    Reference figures only. This calculator does not assess whether you are registered or
                    required to register.
                  </p>
                </section>
              ) : null}
            </>
          )
        }
        explanation={
          result && output ? (
            <ExplainabilityTabs
              result={result}
              summary={
                <div className="grid gap-4">
                  <p className="max-w-2xl text-[14px] leading-6 text-ink">
                    {output.mode === "add"
                      ? `Adding ${formatRatePercent(output.rate)} GST to ${formatMoney(output.exclusiveAmount)} gives ${formatMoney(output.inclusiveAmount)}. The GST component is ${formatMoney(output.gstAmount)}.`
                      : output.mode === "line_items"
                        ? `This invoice totals ${formatMoney(output.inclusiveAmount)} including ${formatMoney(output.gstAmount)} GST across ${output.lines?.length ?? 0} lines (${output.roundingLevel === "per_line" ? "rounded per line" : "rounded at the invoice total"}).`
                        : `${formatMoney(output.inclusiveAmount)} including GST is ${formatMoney(output.exclusiveAmount)} excluding GST. The GST component is ${formatMoney(output.gstAmount)}.`}
                  </p>
                  <p className="text-[13px] leading-5 text-ink-3">
                    Figures are estimates under the assumptions shown; the Working tab traces every step.
                  </p>
                </div>
              }
              breakdown={
                output.lines && output.lines.length > 0 ? (
                  <div className="grid min-w-0 gap-4">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                      {output.lines.length} {output.lines.length === 1 ? "line" : "lines"} ·{" "}
                      {output.roundingLevel === "per_line" ? "rounded per line" : "rounded at the invoice total"}
                    </span>
                    <button
                      type="button"
                      onClick={onDownloadInvoiceCsv}
                      className="nexus-quiet-button no-print inline-flex min-h-11 items-center px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      Download invoice CSV
                    </button>
                  </div>
                  <div className="nexus-table max-w-full overflow-x-auto p-4 md:p-6">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <caption className="sr-only">GST breakdown per invoice line</caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Line</th>
                          <th scope="col" className="hidden py-2 pe-4 font-normal sm:table-cell">Treatment</th>
                          <th scope="col" className="hidden py-2 pe-4 text-right font-normal sm:table-cell">Ex GST</th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">GST</th>
                          <th scope="col" className="py-2 text-right font-normal">Inc GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {output.lines.map((line, index) => (
                          <tr key={line.id} className="border-b border-hairline">
                            <td className="py-2 pe-4 text-[13px] text-ink">
                              {line.label ?? `Line ${index + 1}`}
                              {line.quantity > 1 ? (
                                <span className="text-ink-3"> × {line.quantity}</span>
                              ) : null}
                            </td>
                            <td className="hidden py-2 pe-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 sm:table-cell">
                              {line.treatment.replace("_", " ")}
                            </td>
                            <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink sm:table-cell">
                              {formatMoney(line.exclusiveAmount)}
                            </td>
                            <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(line.gstAmount)}
                            </td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(line.inclusiveAmount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold">
                          <td className="py-2 pe-4 text-[13px] text-ink">Totals</td>
                          <td className="hidden py-2 pe-4 sm:table-cell" />
                          <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink sm:table-cell">
                            {formatMoney(output.exclusiveAmount)}
                          </td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMoney(output.gstAmount)}
                          </td>
                          <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMoney(output.inclusiveAmount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {reconciliation ? (
                    <div
                      className={`nexus-panel-soft grid min-w-0 gap-2 p-4 md:p-6 ${
                        reconciliation.matched ? "" : "border-warn bg-warn-surface"
                      }`}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                        Totals reconciliation
                      </span>
                      <dl className="grid gap-1.5">
                        {(
                          [
                            ["Lines excluding GST", reconciliation.sums.exclusive, reconciliation.differences.exclusive],
                            ["Lines GST", reconciliation.sums.gst, reconciliation.differences.gst],
                            ["Lines including GST", reconciliation.sums.inclusive, reconciliation.differences.inclusive],
                          ] as const
                        ).map(([label, sum, difference]) => (
                          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                            <dt className="text-[13px] leading-5 text-ink-2">{label}</dt>
                            <dd className="font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(sum)}
                              {isZeroMoney(difference) ? null : (
                                <span className="ps-2 text-ink-2">({formatMoney(difference)} against the invoice total)</span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-[12px] leading-5 text-ink-2">
                        {reconciliation.matched
                          ? `The ${reconciliation.lineCount} ${reconciliation.lineCount === 1 ? "line" : "lines"} sum to the invoice totals to the cent.`
                          : `The ${reconciliation.lineCount} lines differ from the invoice totals by the amounts shown, because rounding is applied at the invoice total rather than per line.`}
                      </p>
                    </div>
                  ) : null}
                  </div>
                ) : (
                  <dl className="nexus-table grid max-w-sm gap-2 p-4 md:p-6">
                    {(
                      [
                        ["Excluding GST", output.exclusiveAmount],
                        ["GST component", output.gstAmount],
                        ["Including GST", output.inclusiveAmount],
                      ] as const
                    ).map(([label, amount]) => (
                      <div key={label} className="flex items-baseline justify-between gap-6 rounded-[var(--pc-radius-control)] bg-surface px-3 py-2">
                        <dt className="text-[13px] text-ink-2">{label}</dt>
                        <dd className="font-mono text-[14px] tabular-nums text-ink">{formatMoney(amount)}</dd>
                      </div>
                    ))}
                  </dl>
                )
              }
              limitations={LIMITATIONS}
            />
          ) : null
        }
        disclosure={<UniversalDisclosure financialYear="current" />}
      />
    </>
  );
}
