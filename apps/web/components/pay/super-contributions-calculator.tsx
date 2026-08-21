"use client";

import { useEffect, useMemo, useState } from "react";
import { Dec } from "@paymentcalcs/calculation-core";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  RuleUnavailableState,
  ScenarioActions,
  SelectField,
  UniversalDisclosure,
  formatMoney,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import {
  SuperThresholdUnavailableError,
  superBalanceCell,
  superBalanceSlice,
  superContributionSummary,
  type SuperContributionSummary,
} from "@paymentcalcs/engine-compensation";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import {
  allAuRulePacks,
  auIntegrityManifest,
  type SuperGuaranteeRulePack,
  type SuperStatisticsRulePack,
  type SuperThresholdsRulePack,
} from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, type FinancialYear } from "../../lib/pay-packs";
import { useScenarioActions } from "./use-scenario-actions";

const entry = getRegistryEntry("AU-PAY-016")!;

interface Packs {
  sg: SuperGuaranteeRulePack;
  thresholds: SuperThresholdsRulePack;
  statistics: SuperStatisticsRulePack;
  draft: boolean;
}

type Resolution = "pending" | { ok: true; packs: Packs } | { ok: false; reason: string };

const AGE_LABELS: Record<string, string> = {
  "a. Under 18": "Under 18",
  "b. 18 - 24": "18–24",
  "c. 25 - 29": "25–29",
  "d. 30 - 34": "30–34",
  "e. 35 - 39": "35–39",
  "f. 40 - 44": "40–44",
  "g. 45 - 49": "45–49",
  "h. 50 - 54": "50–54",
  "i. 55 - 59": "55–59",
  "j. 60 - 64": "60–64",
  "k. 65 - 69": "65–69",
  "l. 70 - 74": "70–74",
  "m. 75 and over": "75 and over",
};

export function SuperContributionsCalculator() {
  const [financialYear, setFinancialYear] = useState<FinancialYear>("2026-27");
  const [salaryRaw, setSalaryRaw] = useState("");
  const [sacrificeRaw, setSacrificeRaw] = useState("");
  const [ageRange, setAgeRange] = useState("f. 40 - 44");
  const [sex, setSex] = useState<"Male" | "Female">("Female");
  const [incomeRange, setIncomeRange] = useState<string>("");
  const [resolution, setResolution] = useState<Resolution>("pending");

  const scenario = useScenarioActions({
    calculatorId: entry.id,
    state: { financialYear, salaryRaw, sacrificeRaw, ageRange, sex, incomeRange },
    onHydrate: (saved) => {
      if (FINANCIAL_YEARS.includes(saved.financialYear as FinancialYear)) {
        setFinancialYear(saved.financialYear as FinancialYear);
      }
      if (typeof saved.salaryRaw === "string") setSalaryRaw(saved.salaryRaw);
      if (typeof saved.sacrificeRaw === "string") setSacrificeRaw(saved.sacrificeRaw);
      if (saved.ageRange && saved.ageRange in AGE_LABELS) setAgeRange(saved.ageRange);
      if (saved.sex === "Male" || saved.sex === "Female") setSex(saved.sex);
      if (typeof saved.incomeRange === "string") setIncomeRange(saved.incomeRange);
    },
  });

  useEffect(() => {
    let cancelled = false;
    const valuationDate = `${financialYear.slice(0, 4)}-10-01`;
    const query = { jurisdiction: "AU", allowDraftRules };
    Promise.all([
      resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "super-guarantee", valuationDate }),
      resolveRulePack(allAuRulePacks, auIntegrityManifest, {
        ...query,
        domain: "super-thresholds",
        valuationDate: new Date().toISOString().slice(0, 10),
      }),
      resolveRulePack(allAuRulePacks, auIntegrityManifest, {
        ...query,
        domain: "super-statistics",
        valuationDate: new Date().toISOString().slice(0, 10),
      }),
    ]).then(([sg, thresholds, statistics]) => {
      if (cancelled) return;
      if (!sg.ok) return setResolution({ ok: false, reason: `super guarantee rules: ${sg.reason}` });
      if (!thresholds.ok) return setResolution({ ok: false, reason: `super thresholds: ${thresholds.reason}` });
      if (!statistics.ok) return setResolution({ ok: false, reason: `super statistics: ${statistics.reason}` });
      setResolution({
        ok: true,
        packs: {
          sg: sg.pack as SuperGuaranteeRulePack,
          thresholds: thresholds.pack as SuperThresholdsRulePack,
          statistics: statistics.pack as SuperStatisticsRulePack,
          draft: sg.draft || thresholds.draft || statistics.draft,
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  const salary = useMemo(() => parseMoneyInput(salaryRaw), [salaryRaw]);
  const sacrifice = useMemo(() => (sacrificeRaw.trim() ? parseMoneyInput(sacrificeRaw) : null), [sacrificeRaw]);

  const summary = useMemo((): { ok: true; value: SuperContributionSummary } | { ok: false; reason: string } | null => {
    if (resolution === "pending" || !resolution.ok || !salary.ok) return null;
    if (sacrifice !== null && !sacrifice.ok) return null;
    try {
      const major = (m: { minorUnits: string }) => new Dec(m.minorUnits).div(100).toFixed(2);
      return {
        ok: true,
        value: superContributionSummary(
          resolution.packs.sg.rules,
          resolution.packs.thresholds.rules,
          financialYear,
          major(salary.money),
          sacrifice ? major(sacrifice.money) : "0",
        ),
      };
    } catch (error) {
      if (error instanceof SuperThresholdUnavailableError) return { ok: false, reason: error.message };
      if (error instanceof RangeError) return { ok: false, reason: error.message };
      throw error;
    }
  }, [resolution, salary, sacrifice, financialYear]);

  const statistics = resolution !== "pending" && resolution.ok ? resolution.packs.statistics.rules : null;
  const incomeRanges = useMemo(() => {
    if (!statistics) return [];
    return [...new Set(statistics.cells.map((cell) => cell.taxableIncomeRange))].sort();
  }, [statistics]);
  const effectiveIncomeRange = incomeRange || incomeRanges[0] || "";
  const cell = statistics ? superBalanceCell(statistics, ageRange, sex, effectiveIncomeRange) : null;
  const slice = statistics ? superBalanceSlice(statistics, sex, effectiveIncomeRange) : [];
  const capUsed =
    summary && summary.ok
      ? Math.min(100, Number(new Dec(summary.value.concessionalTotal).div(new Dec(summary.value.concessionalCap)).times(100).toFixed(1)))
      : 0;

  return (
    <>
      {resolution !== "pending" && resolution.ok && resolution.packs.draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel: `FY ${financialYear}`,
              calculationClass: entry.calculationClass,
              ruleStatus:
                resolution === "pending"
                  ? { label: "Resolving rules", tone: "neutral" }
                  : resolution.ok
                    ? resolution.packs.draft
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
            }}
            methodologyHref={`/methodology/${entry.slug}`}
            actions={
              <ScenarioActions
                onSave={scenario.onSave}
                onShare={scenario.onShare}
                onReset={() => {
                  setFinancialYear("2026-27");
                  setSalaryRaw("");
                  setSacrificeRaw("");
                  setAgeRange("f. 40 - 44");
                  setSex("Female");
                  setIncomeRange("");
                }}
              />
            }
          />
        }
        inputs={
          resolution !== "pending" && !resolution.ok ? (
            <RuleUnavailableState jurisdictionLabel={`Australia FY ${financialYear}`} detail={resolution.reason} />
          ) : (
            <div className="grid gap-6">
              <SelectField
                id="sup-fy"
                label="Financial year"
                value={financialYear}
                onChange={(value) => setFinancialYear(value as FinancialYear)}
                options={FINANCIAL_YEARS.map((fy) => ({ value: fy, label: `FY ${fy}` }))}
              />
              <MoneyField
                id="sup-salary"
                label="Annual base salary"
                description="Ordinary time earnings before tax, excluding employer super."
                value={salaryRaw}
                onChange={setSalaryRaw}
                error={!salary.ok && salary.error ? salary.error : undefined}
              />
              <MoneyField
                id="sup-sacrifice"
                label="Salary sacrifice to super (annual)"
                description="Pre-tax contributions you choose to add. Counts toward the concessional cap."
                value={sacrificeRaw}
                onChange={setSacrificeRaw}
                error={sacrifice && !sacrifice.ok && sacrifice.error ? sacrifice.error : undefined}
              />
              <fieldset className="nexus-panel-soft grid gap-4 p-5">
                <legend className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Balance comparison group
                </legend>
                <SelectField
                  id="sup-age"
                  label="Age group"
                  value={ageRange}
                  onChange={setAgeRange}
                  options={Object.entries(AGE_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <SelectField
                  id="sup-sex"
                  label="Sex (as published)"
                  value={sex}
                  onChange={(value) => setSex(value as "Male" | "Female")}
                  options={[
                    { value: "Female", label: "Female" },
                    { value: "Male", label: "Male" },
                  ]}
                />
                <SelectField
                  id="sup-income-range"
                  label="Taxable income range"
                  value={effectiveIncomeRange}
                  onChange={setIncomeRange}
                  options={incomeRanges.map((value) => ({ value, label: value.replace(/^[a-z]\.\s*/, "") }))}
                />
              </fieldset>
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>No result can be shown while the required rule packs are unavailable.</EmptyState>
          ) : summary && !summary.ok ? (
            <EmptyState>{summary.reason}</EmptyState>
          ) : !summary || !salary.ok ? (
            <EmptyState>
              Enter your salary to see employer super at the official rate, concessional cap headroom
              and the published balance ranges for your age group.
            </EmptyState>
          ) : (
            <div className="grid gap-6">
              <div className="nexus-result grid gap-6 p-6 md:p-8">
                <PrimaryResult
                  label="Employer super per year"
                  amount={moneyFromDecimalString("AUD", summary.value.sgAmount, 2)}
                  qualifier={`Super guarantee at ${formatRatePercent(summary.value.sgRate)} under FY ${financialYear} rules, on ordinary time earnings up to the maximum contribution base. Paid to your fund, never counted as take-home cash.`}
                />
                <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 @md:grid-cols-3">
                  <ResultMetric
                    label="Concessional total"
                    amount={moneyFromDecimalString("AUD", summary.value.concessionalTotal, 2)}
                    detail="Employer super + salary sacrifice"
                  />
                  <ResultMetric
                    label="Cap headroom"
                    amount={moneyFromDecimalString("AUD", summary.value.capRemaining, 2)}
                    detail={`Concessional cap ${formatMajor(summary.value.concessionalCap)} for FY ${financialYear}`}
                  />
                  <ResultMetric
                    label="Over the cap by"
                    amount={moneyFromDecimalString("AUD", summary.value.overCapBy, 2)}
                    detail={Number(summary.value.overCapBy) > 0 ? "Amounts over the cap attract extra tax" : "Within the cap"}
                  />
                </div>
                <div className="grid gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                    Concessional cap used
                  </span>
                  <div aria-hidden="true" className="flex h-3 w-full overflow-hidden border border-hairline">
                    <div className={capUsed >= 100 ? "bg-warn" : "bg-positive"} style={{ width: `${capUsed}%` }} />
                  </div>
                  <span className="font-mono text-[12px] tabular-nums text-ink-2">
                    {capUsed}% of {formatMajor(summary.value.concessionalCap)}
                  </span>
                </div>
                {Number(summary.value.division293Excess) > 0 ? (
                  <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                    Income plus concessional contributions exceed the Division 293 threshold
                    ({formatMajor(summary.value.division293Threshold)}) by{" "}
                    {formatMoney(moneyFromDecimalString("AUD", summary.value.division293Excess, 2))}; additional
                    contributions tax can apply to the lesser of the excess and the contributions.
                  </p>
                ) : null}
              </div>

              {statistics && cell ? (
                <section aria-label="Super balance range" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      Super balance range — {AGE_LABELS[ageRange] ?? ageRange}, {sex.toLowerCase()}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      ATO statistics, {statistics.incomeYear}
                    </span>
                  </div>
                  <div className="grid gap-px border border-hairline bg-hairline @md:grid-cols-3">
                    {(
                      [
                        ["Median balance", formatMajor(cell.medianBalance), "Half the group sits below this"],
                        ["Average balance", formatMajor(cell.averageBalance), "Pulled up by large balances"],
                        ["People in this group", Number(cell.individuals).toLocaleString("en-AU"), cell.taxableIncomeRange.replace(/^[a-z]\.\s*/, "")],
                      ] as const
                    ).map(([label, value, detail]) => (
                      <div key={label} className="grid content-start gap-1 bg-surface-2 p-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
                        <span className="font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">{value}</span>
                        <span className="text-[12px] leading-4 text-ink-3">{detail}</span>
                      </div>
                    ))}
                  </div>
                  {slice.length > 2 ? (
                    <>
                      <svg
                        viewBox="0 0 600 150"
                        role="img"
                        aria-label={`Median super balances across age groups for ${sex.toLowerCase()} taxpayers in the selected income range; your selected age group is highlighted`}
                        className="h-auto w-full"
                      >
                        {(() => {
                          const max = Math.max(...slice.map((c) => Number(c.medianBalance))) || 1;
                          const bw = 600 / slice.length;
                          return slice.map((c, i) => {
                            const h = (Number(c.medianBalance) / max) * 128;
                            const active = c.ageRange === ageRange;
                            return (
                              <rect
                                key={c.ageRange}
                                x={i * bw + 3}
                                y={146 - h}
                                width={bw - 6}
                                height={h}
                                fill={active ? "var(--pc-accent)" : "currentColor"}
                                className={active ? undefined : "text-ink/25"}
                              />
                            );
                          });
                        })()}
                      </svg>
                      <p className="text-[12px] leading-5 text-ink-3">
                        Median balances by age group for {sex.toLowerCase()} taxpayers in the{" "}
                        {effectiveIncomeRange.replace(/^[a-z]\.\s*/, "")} range, published cell by cell — the
                        source releases no all-income aggregate, so groups are never blended here.
                      </p>
                    </>
                  ) : null}
                </section>
              ) : statistics && !cell ? (
                <p className="text-[13px] leading-5 text-ink-3">
                  The ATO publishes no cell for this exact age, sex and income combination (small groups
                  are suppressed for privacy), so nothing is shown rather than an estimate.
                </p>
              ) : null}
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear={financialYear} />}
      />
    </>
  );
}
