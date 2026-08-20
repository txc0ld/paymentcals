"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  SelectField,
  UniversalDisclosure,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { DutyRulesUnavailableError, generalDuty } from "@paymentcalcs/engine-property";
import { resolveRulePack, type ResolveOutcome } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type StampDutyRulePack } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type StateCode = (typeof STATES)[number];

function useDutyResolution(state: StateCode) {
  const [resolution, setResolution] = useState<ResolveOutcome | "pending">("pending");
  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "stamp-duty",
      jurisdiction: "AU",
      subdivision: state,
      valuationDate: "2026-10-01",
      allowDraftRules,
    }).then((outcome) => {
      if (!cancelled) setResolution(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);
  return resolution;
}

function computeDuty(resolution: ResolveOutcome | "pending", valueRaw: string) {
  if (resolution === "pending" || !resolution.ok) return null;
  const parsed = parseMoneyInput(valueRaw);
  if (!parsed.ok) return null;
  try {
    return generalDuty(
      new Dec(moneyToDecimalString(parsed.money)) as DecimalValue,
      (resolution.pack as StampDutyRulePack).rules,
    );
  } catch (error) {
    if (error instanceof DutyRulesUnavailableError) return "unsupported" as const;
    return null;
  }
}

export function StampDutyCalculator({ variant }: { variant: "duty" | "buying_costs" }) {
  const entry = getRegistryEntry(variant === "duty" ? "AU-HOME-017" : "AU-HOME-018")!;
  const [state, setState] = useState<StateCode>("NSW");
  const [valueRaw, setValueRaw] = useState("");
  const [legalRaw, setLegalRaw] = useState("");
  const [inspectionsRaw, setInspectionsRaw] = useState("");
  const [otherRaw, setOtherRaw] = useState("");

  const resolution = useDutyResolution(state);
  const duty = useMemo(() => computeDuty(resolution, valueRaw), [resolution, valueRaw]);

  const unsupported =
    duty === "unsupported" || (resolution !== "pending" && !resolution.ok);
  const draft = resolution !== "pending" && resolution.ok && resolution.draft;

  const extras = useMemo(() => {
    const sum = [legalRaw, inspectionsRaw, otherRaw].reduce((acc, raw) => {
      const parsed = parseMoneyInput(raw);
      return parsed.ok ? acc.plus(new Dec(moneyToDecimalString(parsed.money))) : acc;
    }, new Dec(0));
    return sum as DecimalValue;
  }, [legalRaw, inspectionsRaw, otherRaw]);

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: `Australia · ${state}`,
              periodLabel: "General rates only",
              calculationClass: entry.calculationClass,
              ruleStatus: unsupported
                ? { label: `${state} not yet supported`, tone: "warn" }
                : draft
                  ? { label: "Draft rules — not verified", tone: "draft" }
                  : resolution === "pending"
                    ? { label: "Resolving rules", tone: "neutral" }
                    : { label: "Current", tone: "neutral" },
            }}
          />
        }
        inputs={
          <div className="grid gap-6">
            <SelectField
              id="duty-state"
              label="State or territory"
              value={state}
              onChange={setState}
              options={STATES.map((code) => ({ value: code, label: code }))}
            />
            <MoneyField
              id="duty-value"
              label={variant === "duty" ? "Dutiable value (usually the price)" : "Property price"}
              value={valueRaw}
              onChange={setValueRaw}
            />
            {variant === "buying_costs" ? (
              <>
                <MoneyField id="cost-legal" label="Conveyancing and legal" value={legalRaw} onChange={setLegalRaw} />
                <MoneyField id="cost-inspections" label="Inspections" value={inspectionsRaw} onChange={setInspectionsRaw} />
                <MoneyField id="cost-other" label="Other upfront costs" value={otherRaw} onChange={setOtherRaw} />
              </>
            ) : null}
            <p className="text-[13px] leading-5 text-ink-3">
              General rates only: concessions, exemptions, first-home schemes and foreign surcharges
              are not modelled, and GST treatment of new property is out of scope.
            </p>
          </div>
        }
        results={
          unsupported ? (
            <div className="nexus-panel-soft grid gap-3 p-8 text-center">
              <Badge tone="warn">{state} not yet supported</Badge>
              <p className="mx-auto max-w-md text-[14px] leading-6 text-ink-2">
                The official {state} duty rates have not been transcribed and verified yet, so no
                figure is shown. This calculator never substitutes another state's rates.
              </p>
            </div>
          ) : !duty ? (
            <EmptyState>Enter the property value to estimate the general transfer duty.</EmptyState>
          ) : (
            <div className="nexus-result grid gap-6 p-6">
              <PrimaryResult
                label={variant === "duty" ? `Estimated ${state} transfer duty` : "Estimated upfront costs"}
                amount={moneyFromDecimalString(
                  "AUD",
                  variant === "duty" ? duty.duty.toFixed(2) : duty.duty.plus(extras).toFixed(2),
                  2,
                )}
                qualifier={
                  variant === "duty"
                    ? `Bracket over ${formatMajor(duty.bracketOver)}: ${formatMajor(duty.bracketBase.toFixed(2))} plus ${duty.ratePer100.toFixed(2)} per $100 or part thereof.${duty.minimumApplied ? " The statutory minimum applied." : ""}`
                    : `Includes ${formatMajor(duty.duty.toFixed(2))} estimated ${state} transfer duty at general rates plus the costs you entered.`
                }
              />
              {variant === "buying_costs" ? (
                <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                  <ResultMetric label="Transfer duty" amount={moneyFromDecimalString("AUD", duty.duty.toFixed(2), 2)} />
                  <ResultMetric label="Your entered costs" amount={moneyFromDecimalString("AUD", extras.toFixed(2), 2)} />
                </div>
              ) : null}
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear="current" />}
      />
    </>
  );
}
