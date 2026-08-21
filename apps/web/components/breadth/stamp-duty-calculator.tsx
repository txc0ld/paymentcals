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
  ScenarioActions,
  SelectField,
  UniversalDisclosure,
  WorkingPanel,
  type WorkingSource,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { DutyRulesUnavailableError, generalDuty, type DutyComputation } from "@paymentcalcs/engine-property";
import { resolveRulePack, type ResolveOutcome } from "@paymentcalcs/rule-schema";
import {
  allAuRulePacks,
  auIntegrityManifest,
  type DutyBracket,
  type StampDutyRulePack,
  type StampDutyRules,
} from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type StateCode = (typeof STATES)[number];

const VALUATION_DATE = "2026-10-01";

type PercentBracket = NonNullable<StampDutyRules["generalPercent"]>["brackets"][number];
type PercentSlab = NonNullable<StampDutyRules["generalFormula"]>["slabs"][number];

const METHOD_LABEL: Record<DutyComputation["method"], string> = {
  per100: "Bracket base plus a rate per $100 or part thereof",
  percent: "Bracket base plus a percentage of the excess",
  formula: "Statutory formula, then percent-of-value slabs",
};

function resolveDuty(state: StateCode): Promise<ResolveOutcome> {
  return resolveRulePack(allAuRulePacks, auIntegrityManifest, {
    domain: "stamp-duty",
    jurisdiction: "AU",
    subdivision: state,
    valuationDate: VALUATION_DATE,
    allowDraftRules,
  });
}

function useDutyResolution(state: StateCode) {
  const [resolution, setResolution] = useState<ResolveOutcome | "pending">("pending");
  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolveDuty(state).then((outcome) => {
      if (!cancelled) setResolution(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);
  return resolution;
}

/** Every state's pack, resolved once, so the comparison never reuses one state's rules. */
function useAllDutyResolutions() {
  const [all, setAll] = useState<Record<StateCode, ResolveOutcome> | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all(STATES.map((code) => resolveDuty(code))).then((outcomes) => {
      if (cancelled) return;
      const map = {} as Record<StateCode, ResolveOutcome>;
      STATES.forEach((code, index) => {
        map[code] = outcomes[index]!;
      });
      setAll(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return all;
}

function dutyFor(resolution: ResolveOutcome | undefined, value: DecimalValue) {
  if (!resolution || !resolution.ok) return "unsupported" as const;
  try {
    return generalDuty(value, (resolution.pack as StampDutyRulePack).rules);
  } catch (error) {
    if (error instanceof DutyRulesUnavailableError) return "unsupported" as const;
    throw error;
  }
}

function computeDuty(resolution: ResolveOutcome | "pending", valueRaw: string) {
  if (resolution === "pending" || !resolution.ok) return null;
  const parsed = parseMoneyInput(valueRaw);
  if (!parsed.ok) return null;
  const value = new Dec(moneyToDecimalString(parsed.money)) as DecimalValue;
  if (value.lessThan(0)) return null;
  return dutyFor(resolution, value);
}

const dollars = (value: string) => formatMajor(`${value}.00`);

function bandRange(over: string, upTo: string | null): string {
  return upTo === null ? `Over ${dollars(over)}` : `${dollars(over)} – ${dollars(upTo)}`;
}

/** Every published row of the selected state's ladder, with the applied row marked. */
function BracketLadder({
  state,
  rules,
  duty,
}: {
  state: StateCode;
  rules: StampDutyRules;
  duty: DutyComputation | null;
}) {
  const per100 = rules.general?.brackets ?? null;
  const percent = rules.generalPercent?.brackets ?? null;
  const formula = rules.generalFormula ?? null;

  const rowClass = (applied: boolean) =>
    applied ? "border-b-2 border-[var(--pc-accent)]" : "border-b border-hairline";
  const appliedMark = (applied: boolean) =>
    applied ? (
      <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)]">
        · Applied
      </span>
    ) : null;

  if (per100) {
    return (
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">
            Every published {state} general transfer duty band, with the band applied to your value marked
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <th scope="col" className="py-2 pe-4 font-normal">Dutiable value</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Base duty</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Per $100</th>
              <th scope="col" className="py-2 text-right font-normal">Applies to</th>
            </tr>
          </thead>
          <tbody>
            {per100.map((bracket: DutyBracket) => {
              const applied = duty?.method === "per100" && duty.bracketOver === bracket.over;
              return (
                <tr key={bracket.over} aria-current={applied ? "true" : undefined} className={rowClass(applied)}>
                  <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">
                    {bandRange(bracket.over, bracket.upTo)}
                    {appliedMark(applied)}
                  </td>
                  <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                    {formatMajor(bracket.baseAmount)}
                  </td>
                  <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                    {formatMajor(bracket.ratePer100)}
                  </td>
                  <td className="py-2 text-right font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                    {bracket.appliesTo === "total" ? "Whole value" : "Excess"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (percent) {
    return (
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">
            Every published {state} general transfer duty band, with the band applied to your value marked
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <th scope="col" className="py-2 pe-4 font-normal">Dutiable value</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Base duty</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Percent</th>
              <th scope="col" className="py-2 text-right font-normal">Applies to</th>
            </tr>
          </thead>
          <tbody>
            {percent.map((bracket: PercentBracket) => {
              const applied = duty?.method === "percent" && duty.bracketOver === bracket.over;
              return (
                <tr key={bracket.over} aria-current={applied ? "true" : undefined} className={rowClass(applied)}>
                  <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">
                    {bandRange(bracket.over, bracket.upTo)}
                    {appliedMark(applied)}
                  </td>
                  <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                    {formatMajor(bracket.baseAmount)}
                  </td>
                  <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                    {new Dec(bracket.percent).times(100).toFixed(2)}%
                  </td>
                  <td className="py-2 text-right font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                    {bracket.appliesTo === "total" ? "Whole value" : "Excess"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (formula) {
    return (
      <div className="grid min-w-0 gap-4">
        <p className="font-mono text-[13px] leading-6 text-ink">
          D = {formula.quadraticCoefficient} × V² + {formula.linearCoefficient} × V, where V = dutiable
          value ÷ {Number(formula.variableDivisor).toLocaleString("en-AU")}, for values up to{" "}
          {dollars(formula.upTo)}.
        </p>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <caption className="sr-only">
              The {state} percent-of-value slabs above the formula ceiling, with the slab applied to your
              value marked
            </caption>
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th scope="col" className="py-2 pe-4 font-normal">Dutiable value</th>
                <th scope="col" className="py-2 text-right font-normal">Percent of the whole value</th>
              </tr>
            </thead>
            <tbody>
              {formula.slabs.map((slab: PercentSlab) => {
                const applied =
                  duty?.method === "formula" &&
                  duty.percent !== null &&
                  duty.percent.equals(new Dec(slab.percentOfTotal));
                return (
                  <tr key={slab.from} aria-current={applied ? "true" : undefined} className={rowClass(applied)}>
                    <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">
                      {slab.fromInclusive ? `${dollars(slab.from)} or more` : `More than ${dollars(slab.from)}`}
                      {appliedMark(applied)}
                    </td>
                    <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                      {new Dec(slab.percentOfTotal).times(100).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] leading-5 text-ink-3">
          Below the formula ceiling the statutory quadratic applies instead of a band; the result is
          floored to the nearest 5 cents, matching the Territory Revenue Office calculator.
        </p>
      </div>
    );
  }

  return (
    <p className="text-[13px] leading-5 text-ink-2">
      The {state} duty rates have not been transcribed and verified yet, so no ladder is shown.
    </p>
  );
}

export function StampDutyCalculator({ variant }: { variant: "duty" | "buying_costs" }) {
  const entry = getRegistryEntry(variant === "duty" ? "AU-HOME-017" : "AU-HOME-018")!;
  const [state, setState] = useState<StateCode>("NSW");
  const [valueRaw, setValueRaw] = useState("");
  const [legalRaw, setLegalRaw] = useState("");
  const [inspectionsRaw, setInspectionsRaw] = useState("");
  const [otherRaw, setOtherRaw] = useState("");

  const resolution = useDutyResolution(state);
  const allResolutions = useAllDutyResolutions();
  const duty = useMemo(() => computeDuty(resolution, valueRaw), [resolution, valueRaw]);

  const unsupported =
    duty === "unsupported" || (resolution !== "pending" && !resolution.ok);
  const draft = resolution !== "pending" && resolution.ok && resolution.draft;
  const appliedDuty = duty !== null && duty !== "unsupported" ? duty : null;
  const rules =
    resolution !== "pending" && resolution.ok ? (resolution.pack as StampDutyRulePack).rules : null;
  const sources: WorkingSource[] =
    resolution !== "pending" && resolution.ok
      ? resolution.pack.sources.map((source) => ({
          title: `${source.authority} — ${source.title}`,
          url: source.url,
          detail: `retrieved ${source.retrievedAt.slice(0, 10)}`,
        }))
      : [];

  const enteredValue = useMemo(() => {
    const parsed = parseMoneyInput(valueRaw);
    return parsed.ok ? moneyToDecimalString(parsed.money) : null;
  }, [valueRaw]);

  const extras = useMemo(() => {
    const sum = [legalRaw, inspectionsRaw, otherRaw].reduce((acc, raw) => {
      const parsed = parseMoneyInput(raw);
      return parsed.ok ? acc.plus(new Dec(moneyToDecimalString(parsed.money))) : acc;
    }, new Dec(0));
    return sum as DecimalValue;
  }, [legalRaw, inspectionsRaw, otherRaw]);

  // The same entered value put through every state's own published method.
  // Presentation order is fixed; nothing here ranks or orders by amount.
  const comparison = useMemo(() => {
    if (!allResolutions) return null;
    const parsed = parseMoneyInput(valueRaw);
    if (!parsed.ok) return null;
    const value = new Dec(moneyToDecimalString(parsed.money)) as DecimalValue;
    if (value.lessThan(0)) return null;
    return STATES.map((code) => ({ code, computation: dutyFor(allResolutions[code], value) }));
  }, [allResolutions, valueRaw]);

  function onReset() {
    setValueRaw("");
    setLegalRaw("");
    setInspectionsRaw("");
    setOtherRaw("");
    setState("NSW");
  }

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
            methodologyHref={`/methodology/${entry.slug}`}
            actions={<ScenarioActions onReset={onReset} />}
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
            <div className="nexus-panel-soft grid min-w-0 gap-4 p-6 text-center md:p-8">
              <Badge tone="warn">{state} not yet supported</Badge>
              <p className="mx-auto max-w-md text-[14px] leading-6 text-ink-2">
                The official {state} duty rates have not been transcribed and verified yet, so no
                figure is shown. This calculator never substitutes another state&rsquo;s rates.
              </p>
            </div>
          ) : !appliedDuty ? (
            <EmptyState>Enter the property value to estimate the general transfer duty.</EmptyState>
          ) : (
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              <PrimaryResult
                label={variant === "duty" ? `Estimated ${state} transfer duty` : "Estimated upfront costs"}
                amount={moneyFromDecimalString(
                  "AUD",
                  variant === "duty" ? appliedDuty.duty.toFixed(2) : appliedDuty.duty.plus(extras).toFixed(2),
                  2,
                )}
                qualifier={
                  variant === "duty"
                    ? `${
                        appliedDuty.method === "per100" && appliedDuty.bracketOver !== null && appliedDuty.bracketBase && appliedDuty.ratePer100
                          ? appliedDuty.appliedToTotal
                            ? `Flat ${appliedDuty.ratePer100.toFixed(2)} per $100 or part thereof of the whole value.`
                            : `Bracket over ${formatMajor(appliedDuty.bracketOver)}: ${formatMajor(appliedDuty.bracketBase.toFixed(2))} plus ${appliedDuty.ratePer100.toFixed(2)} per $100 or part thereof.`
                          : appliedDuty.method === "percent" && appliedDuty.percent
                            ? appliedDuty.appliedToTotal
                              ? `Flat ${appliedDuty.percent.times(100).toFixed(2)}% of the whole dutiable value.`
                              : `Band over ${formatMajor(appliedDuty.bracketOver ?? "0")}: ${formatMajor((appliedDuty.bracketBase ?? appliedDuty.duty).toFixed(2))} plus ${appliedDuty.percent.times(100).toFixed(2)}% of the excess.`
                            : appliedDuty.formulaText
                              ? `Statutory formula: ${appliedDuty.formulaText}.`
                              : appliedDuty.percent
                                ? `Statutory slab: ${appliedDuty.percent.times(100).toFixed(2)}% of the whole dutiable value.`
                                : ""
                      }${appliedDuty.minimumApplied ? " The statutory minimum applied." : ""}`
                    : `Includes ${formatMajor(appliedDuty.duty.toFixed(2))} estimated ${state} transfer duty at general rates plus the costs you entered.`
                }
              />
              {variant === "buying_costs" ? (
                <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2">
                  <ResultMetric label="Transfer duty" amount={moneyFromDecimalString("AUD", appliedDuty.duty.toFixed(2), 2)} />
                  <ResultMetric label="Your entered costs" amount={moneyFromDecimalString("AUD", extras.toFixed(2), 2)} />
                </div>
              ) : null}
              {/* The rate actually applied, read straight from the resolved
                * duty pack — never a rate held in this component. */}
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Applied from the {state} duty rules
                </h3>
                {appliedDuty.method !== "formula" && appliedDuty.bracketOver !== null ? (
                  <div className="overflow-x-auto">
                    <table className="nexus-table w-full border-collapse text-left">
                      <caption className="sr-only">The general transfer duty band applied to this value</caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">
                            {appliedDuty.appliedToTotal ? "Whole value" : "Value over"}
                          </th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">Base duty</th>
                          <th scope="col" className="py-2 text-right font-normal">
                            {appliedDuty.method === "per100" ? "Per $100" : "Percent"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink">
                            {appliedDuty.appliedToTotal ? "—" : formatMajor(appliedDuty.bracketOver)}
                          </td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMajor((appliedDuty.bracketBase ?? new Dec(0)).toFixed(2))}
                          </td>
                          <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                            {appliedDuty.method === "per100" && appliedDuty.ratePer100
                              ? formatMajor(appliedDuty.ratePer100.toFixed(2))
                              : appliedDuty.percent
                                ? `${appliedDuty.percent.times(100).toFixed(2)}%`
                                : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <p className="text-[12px] leading-5 text-ink-3">
                  {appliedDuty.method === "per100" && appliedDuty.hundredsCounted
                    ? `${appliedDuty.hundredsCounted.toFixed(0)} whole or part hundreds counted ${appliedDuty.appliedToTotal ? "across the whole value" : "above the band threshold"}.`
                    : appliedDuty.method === "percent"
                      ? appliedDuty.appliedToTotal
                        ? "This band applies its percentage to the whole dutiable value, not just the excess."
                        : "The percentage applies to the value above the band threshold, exact to the cent."
                      : appliedDuty.formulaText
                        ? `${appliedDuty.formulaText}; the result is floored to the nearest 5 cents, matching the Territory Revenue Office calculator.`
                        : "Statutory percentage of the whole dutiable value, floored to the nearest 5 cents."}
                  {appliedDuty.minimumApplied ? " The statutory minimum duty applied instead." : ""}
                </p>
              </div>
            </div>
          )
        }
        explanation={
          <div className="grid min-w-0 gap-8">
            {rules ? (
              <section aria-label={`${state} duty ladder`} className="nexus-panel @container grid min-w-0 gap-4 p-6 md:p-8">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    {state} general transfer duty — every published band
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    From the resolved rule pack
                  </span>
                </div>
                <BracketLadder state={state} rules={rules} duty={appliedDuty} />
              </section>
            ) : null}
            {comparison ? (
              <section aria-label="Duty across states and territories" className="nexus-panel grid min-w-0 gap-4 p-6 md:p-8">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                  The same value under each jurisdiction&rsquo;s own method
                </h2>
                <div className="min-w-0 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <caption className="sr-only">
                      General transfer duty on the entered value in each state and territory, each computed with
                      that jurisdiction&rsquo;s own published method, listed in a fixed order
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Jurisdiction</th>
                        <th scope="col" className="py-2 pe-4 font-normal">Published method</th>
                        <th scope="col" className="py-2 text-right font-normal">General duty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map(({ code, computation }) => {
                        const selected = code === state;
                        return (
                          <tr
                            key={code}
                            aria-current={selected ? "true" : undefined}
                            className={selected ? "border-b-2 border-[var(--pc-accent)]" : "border-b border-hairline"}
                          >
                            <th scope="row" className="py-2 pe-4 text-left font-mono text-[13px] font-normal tracking-[0.1em] text-ink">
                              {code}
                              {selected ? (
                                <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)]">
                                  · Selected
                                </span>
                              ) : null}
                            </th>
                            <td className="py-2 pe-4 text-[13px] leading-5 text-ink-2">
                              {computation === "unsupported"
                                ? "Rates not yet transcribed and verified"
                                : METHOD_LABEL[computation.method]}
                            </td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                              {computation === "unsupported" ? "—" : formatMajor(computation.duty.toFixed(2))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[12px] leading-5 text-ink-2">
                  Each figure is computed from that jurisdiction&rsquo;s own rule pack and its own published
                  method — per-$100 bands, percentage bands or a statutory formula. The rows are listed in a
                  fixed order and are not ranked. They are not directly comparable as a like-for-like cost:
                  thresholds, concessions, first-home schemes, foreign surcharges and land-tax treatment differ by
                  jurisdiction and none of them are modelled here.
                </p>
              </section>
            ) : null}
            <WorkingPanel
              summary={
                appliedDuty && enteredValue
                  ? `General transfer duty on ${formatMajor(enteredValue)} in ${state}, computed by the method that jurisdiction publishes: ${METHOD_LABEL[appliedDuty.method].toLowerCase()}.`
                  : "Choose a jurisdiction and enter a dutiable value to see the band that applies and how it is built."
              }
              steps={[
                "The dutiable value selects one published band (or, in the Northern Territory, the statutory formula or a percent-of-value slab).",
                "Per-$100 bands: duty = base amount + rate per $100 × the number of whole or part hundreds above the threshold.",
                "Percentage bands: duty = base amount + percent × the value above the threshold, or percent × the whole value for a slab row.",
                "Statutory formula: D = a × V² + b × V with V = value ÷ 1,000, floored to the nearest 5 cents.",
                "Any statutory minimum duty is applied last.",
              ]}
              assumptions={[
                "General (non-concessional) rates only, at the rule pack's effective date.",
                "The dutiable value is the figure you enter; revenue offices may assess a different value.",
                `Valuation date ${VALUATION_DATE} selects the effective rule pack for every jurisdiction shown.`,
              ]}
              sources={sources}
              limitations={[
                "Concessions, exemptions, first-home and off-the-plan schemes, pensioner rates and foreign-purchaser surcharges are not modelled.",
                "Mortgage registration, transfer registration and other lodgement fees are separate from duty and are not included.",
                "GST treatment of new residential property, and the margin scheme, are out of scope.",
                "Where a jurisdiction's rates have not been transcribed and verified, the row shows no figure rather than an estimate.",
              ]}
            />
          </div>
        }
        disclosure={<UniversalDisclosure financialYear="current" />}
      />
    </>
  );
}
