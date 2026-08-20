"use client";

import { useId, useState, type ReactNode } from "react";
import type {
  AssumptionCategory,
  CalculationResultV1,
} from "@paymentcalcs/calculation-core";

const TABS = ["Summary", "Breakdown", "Working", "Assumptions", "Sources", "Limitations"] as const;
type TabName = (typeof TABS)[number];

/** §9.5 category labels, exact wording. */
const CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  official_rule: "Official rule",
  contract_setting: "Contract setting",
  user_input: "User input",
  editable_default: "Editable default",
  projection: "Projection assumption",
};

export function ExplainabilityTabs({
  result,
  summary,
  breakdown,
  limitations,
}: {
  result: CalculationResultV1<unknown>;
  summary: ReactNode;
  breakdown: ReactNode;
  limitations: readonly string[];
}) {
  const [active, setActive] = useState<TabName>("Summary");
  const baseId = useId();
  const activeIndex = TABS.indexOf(active);

  function onKeyDown(event: React.KeyboardEvent) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const nextTab = TABS[(activeIndex + delta + TABS.length) % TABS.length]!;
    setActive(nextTab);
    document.getElementById(`${baseId}-tab-${nextTab}`)?.focus();
  }

  return (
    <section aria-label="How this was calculated" className="min-w-0 border border-hairline bg-surface">
      <div
        role="tablist"
        aria-label="Explanation sections"
        onKeyDown={onKeyDown}
        className="flex flex-wrap border-b border-hairline"
      >
        {TABS.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              role="tab"
              id={`${baseId}-tab-${tab}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab)}
              className={`relative min-h-11 px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                selected
                  ? "text-ink after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-ink"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="p-5 md:p-6"
      >
        {active === "Summary" ? summary : null}
        {active === "Breakdown" ? breakdown : null}

        {active === "Working" ? (
          result.trace && result.trace.steps.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {result.trace.steps.map((step) => (
                <li key={step.id} className="grid gap-1 border-l border-hairline-strong pl-4">
                  <span className="text-[13px] text-ink-2">{step.label}</span>
                  {step.expression ? (
                    <code className="font-mono text-[13px] text-ink-3">{step.expression}</code>
                  ) : null}
                  {step.substitution ? (
                    <code className="font-mono text-[13px] tabular-nums text-ink">
                      {step.substitution} = {step.value}
                    </code>
                  ) : null}
                  {step.formulaId ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      Formula {step.formulaId}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-ink-3">
              The full working appears here after a calculation runs.
            </p>
          )
        ) : null}

        {active === "Assumptions" ? (
          <ul className="flex flex-col divide-y divide-hairline">
            {result.assumptions.map((assumption) => (
              <li key={assumption.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] text-ink">{assumption.label}</span>
                  <span className="border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
                    {CATEGORY_LABELS[assumption.category]}
                  </span>
                </div>
                <span className="font-mono text-[13px] tabular-nums text-ink-2">
                  {String(assumption.value)}
                  {assumption.unit === "rate" ? "" : assumption.unit ? ` ${assumption.unit}` : ""}
                </span>
                <p className="text-[13px] leading-5 text-ink-3">{assumption.explanation}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {active === "Sources" ? (
          result.sources.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {result.sources.map((source) => (
                <li key={source.sourceId} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                  <span className="text-[14px] text-ink">{source.title}</span>
                  <span className="text-[13px] text-ink-2">{source.authority}</span>
                  <a
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="break-all font-mono text-[12px] text-info underline decoration-hairline-strong underline-offset-2 hover:decoration-current"
                  >
                    {source.url}
                  </a>
                  <span className="font-mono text-[11px] text-ink-3">
                    Retrieved {source.retrievedAt.slice(0, 10)}
                    {source.rulePackId ? ` · rule pack ${source.rulePackId}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">No external sources apply to this calculation.</p>
          )
        ) : null}

        {active === "Limitations" ? (
          <ul className="flex list-none flex-col gap-2">
            {limitations.map((limitation) => (
              <li key={limitation} className="border-l border-hairline-strong pl-4 text-[13px] leading-5 text-ink-2">
                {limitation}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
