"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  SegmentedControl,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import type { LedgerEvent, LedgerInput } from "@paymentcalcs/engine-mortgage-ledger";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { DeltaCell, MetricCell, diffMajor } from "./result-parts";
import { ScheduleView } from "./schedule-view";
import { TimelineEditor, type DraftEvent } from "./timeline-editor";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";

const entry = getRegistryEntry("AU-HOME-002")!;

function toLedgerEvents(drafts: DraftEvent[]): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  for (const draft of drafts) {
    const amount = draft.amountRaw.trim().replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(amount) || !draft.date) continue;
    switch (draft.kind) {
      case "rate_change":
        events.push({ type: "rate_change", effectiveDate: draft.date, annualRate: (Number.parseFloat(amount) / 100).toString() });
        break;
      case "extra_recurring":
        events.push({ type: "extra_recurring", startDate: draft.date, amount });
        break;
      case "extra_oneoff":
        events.push({ type: "extra_oneoff", effectiveDate: draft.date, amount });
        break;
      case "offset_deposit":
        events.push({ type: "offset_deposit", effectiveDate: draft.date, amount });
        break;
      case "offset_withdrawal":
        events.push({ type: "offset_withdrawal", effectiveDate: draft.date, amount });
        break;
      case "fee_annual":
        events.push({ type: "fee_annual", startDate: draft.date, amount, financed: false });
        break;
    }
  }
  return events;
}

interface ScenarioState {
  basics: LoanBasicsState;
  offsetOpeningRaw: string;
  events: DraftEvent[];
}

const EMPTY_SCENARIO: ScenarioState = {
  basics: LOAN_BASICS_DEFAULTS,
  offsetOpeningRaw: "",
  events: [],
};

function buildJob(scenario: ScenarioState) {
  const parsed = parseLoanBasics(scenario.basics);
  if (!parsed.ok) return { job: null, errors: parsed.errors };
  const offset = parseMoneyInput(scenario.offsetOpeningRaw);
  const input: LedgerInput = {
    openingPrincipal: parsed.principal,
    annualRate: parsed.annualRate,
    termPeriods: parsed.termPeriods,
    repaymentFrequency: parsed.frequency,
    firstRepaymentDate: "2026-10-01",
    repaymentType: "principal_and_interest",
    interestOnlyPeriods: parsed.ioPeriods,
    repaymentResetPolicy: "recalculate_to_term",
    offsetOpeningBalance:
      scenario.offsetOpeningRaw.trim() && offset.ok ? scenario.offsetOpeningRaw.trim().replace(/,/g, "") : "0",
    events: toLedgerEvents(scenario.events),
  };
  return { job: { kind: "run" as const, input }, errors: parsed.errors };
}

export function MortgageSimulator() {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [active, setActive] = useState<"A" | "B">("A");
  const [scenarioA, setScenarioA] = useState<ScenarioState>(EMPTY_SCENARIO);
  const [scenarioB, setScenarioB] = useState<ScenarioState | null>(null);

  const builtA = useMemo(() => buildJob(scenarioA), [scenarioA]);
  const builtB = useMemo(() => (scenarioB ? buildJob(scenarioB) : { job: null, errors: {} }), [scenarioB]);

  const resultA = useLedgerJob<SLedgerResult>(builtA.job);
  const resultB = useLedgerJob<SLedgerResult>(mode === "compare" ? builtB.job : null);

  const editing = active === "B" && scenarioB ? scenarioB : scenarioA;
  const setEditing = (updater: (s: ScenarioState) => ScenarioState) => {
    if (active === "B" && scenarioB) setScenarioB(updater(scenarioB));
    else setScenarioA(updater(scenarioA));
  };
  const editingErrors = active === "B" ? builtB.errors : builtA.errors;

  function enterCompare() {
    // MORT-AC-006: Compare starts from identical facts unless overridden.
    setScenarioB(structuredClone(scenarioA));
    setMode("compare");
    setActive("B");
  }

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
            periodLabel: "Scheduled model",
            calculationClass: entry.calculationClass,
            ruleStatus: { label: "No statutory rules required", tone: "neutral" },
          }}
          modeControl={
            <SegmentedControl
              label="Simulator mode"
              value={mode}
              onChange={(next) => {
                if (next === "compare" && !scenarioB) enterCompare();
                else setMode(next);
              }}
              options={[
                { value: "single", label: "Single" },
                { value: "compare", label: "Compare" },
              ]}
            />
          }
        />
      }
      inputs={
        <div className="grid gap-6">
          {mode === "compare" ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SegmentedControl
                label="Scenario being edited"
                value={active}
                onChange={setActive}
                options={[
                  { value: "A", label: "Scenario A" },
                  { value: "B", label: "Scenario B" },
                ]}
              />
              <Badge tone="neutral">B starts as a copy of A</Badge>
            </div>
          ) : null}
          <LoanBasicsFields
            state={editing.basics}
            onChange={(patch) => setEditing((s) => ({ ...s, basics: { ...s.basics, ...patch } }))}
            errors={editingErrors}
          />
          <MoneyField
            id="sim-offset"
            label="Offset balance today"
            value={editing.offsetOpeningRaw}
            onChange={(offsetOpeningRaw) => setEditing((s) => ({ ...s, offsetOpeningRaw }))}
          />
          <TimelineEditor
            events={editing.events}
            onChange={(events) => setEditing((s) => ({ ...s, events }))}
          />
        </div>
      }
      results={
        !resultA.result ? (
          <EmptyState>
            Enter the loan to simulate it through dated rate changes, extra repayments, offsets and
            fees on a scheduled ledger.
          </EmptyState>
        ) : (
          <div className="grid gap-6">
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              {/* The primary amount and the badge only fit on one line once the
                * panel is wide; in the 470px results column at lg they cannot,
                * so the badge drops below rather than forcing an overflow. */}
              <div className="grid min-w-0 gap-4 @xl:flex @xl:items-start @xl:justify-between">
                <PrimaryResult
                  label={mode === "compare" ? "Scenario A · total interest" : "Total interest over the loan"}
                  amount={moneyFromDecimalString("AUD", resultA.result.totalInterest, 2)}
                  qualifier={`Initial repayment ${formatMajor(resultA.result.scheduledPaymentInitial)}; paid off ${resultA.result.payoffDate ?? "beyond term"} (${periodsToYearsLabel(resultA.result.periodsUsed, PPY[scenarioA.basics.frequency])}).`}
                />
                <span className="justify-self-start @xl:shrink-0">
                  <Badge tone="neutral">Scheduled model</Badge>
                </span>
              </div>
              {mode === "compare" && resultB.result ? (
                <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
                  <ResultMetric
                    label="Scenario B · total interest"
                    amount={moneyFromDecimalString("AUD", resultB.result.totalInterest, 2)}
                    detail={`paid off ${resultB.result.payoffDate ?? "beyond term"}`}
                  />
                  {/* Exact decimal subtraction of the two serialized totals — never floats. */}
                  <DeltaCell
                    label="Interest difference (A − B)"
                    signedValue={diffMajor(resultA.result.totalInterest, resultB.result.totalInterest)}
                    detail={
                      resultA.result.totalInterest === resultB.result.totalInterest
                        ? "the two scenarios cost the same in interest"
                        : `A pays ${diffMajor(resultA.result.totalInterest, resultB.result.totalInterest).startsWith("-") ? "less" : "more"} interest than B`
                    }
                  />
                  <MetricCell
                    label="Time difference"
                    value={periodsToYearsLabel(
                      Math.abs(resultA.result.periodsUsed - resultB.result.periodsUsed),
                      PPY[scenarioA.basics.frequency],
                    )}
                    detail={
                      resultA.result.periodsUsed === resultB.result.periodsUsed
                        ? "both pay off on the same schedule"
                        : resultA.result.periodsUsed > resultB.result.periodsUsed
                          ? "B pays off sooner"
                          : "A pays off sooner"
                    }
                  />
                </div>
              ) : null}
              {resultA.result.negativeAmortisation ? (
                <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                  Scenario A does not amortise under these settings; the unresolved balance is shown
                  in the schedule.
                </p>
              ) : null}
            </div>
          </div>
        )
      }
      explanation={
        resultA.result ? (
          <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
            <ScheduleView
              result={mode === "compare" && active === "B" && resultB.result ? resultB.result : resultA.result}
              calculatorId={entry.id}
              frequency={editing.basics.frequency}
            />
          </div>
        ) : null
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
