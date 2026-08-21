import type { ReactNode } from "react";
import { Badge } from "./primitives";

export interface CalculatorHeaderMeta {
  title: string;
  jurisdictionLabel: string;
  periodLabel: string;
  calculationClass: "A" | "B" | "C" | "D";
  ruleStatus: { label: string; tone: "neutral" | "warn" | "draft" };
}

const CLASS_DESCRIPTIONS: Record<CalculatorHeaderMeta["calculationClass"], string> = {
  A: "Class A · deterministic arithmetic",
  B: "Class B · rule-based estimate",
  C: "Class C · indicative range",
  D: "Class D · long-horizon projection",
};

/** §9.1 header: title · jurisdiction · period · class · rule status · actions. */
export function CalculatorHeader({
  meta,
  modeControl,
  actions,
}: {
  meta: CalculatorHeaderMeta;
  modeControl?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="nexus-panel grid min-w-0 gap-5 p-6 md:p-8">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {/* Accent titles (owner directive): display-size text, so the 3.75:1
         * light-theme ratio meets the WCAG large-text threshold. */}
        <h1 className="text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-accent">
          {meta.title}
        </h1>
        {modeControl}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        <span>{meta.jurisdictionLabel}</span>
        <span aria-hidden="true" className="h-3 w-px bg-hairline-strong" />
        <span>{meta.periodLabel}</span>
        <span aria-hidden="true" className="h-3 w-px bg-hairline-strong" />
        <span title={CLASS_DESCRIPTIONS[meta.calculationClass]}>
          {CLASS_DESCRIPTIONS[meta.calculationClass]}
        </span>
        <Badge tone={meta.ruleStatus.tone}>{meta.ruleStatus.label}</Badge>
        {actions ? <span className="ms-auto flex max-w-full flex-wrap items-center gap-2">{actions}</span> : null}
      </div>
    </header>
  );
}

/**
 * §9.1 desktop layout: inputs left (360–460px), results right, full-width
 * explanation band below. Mobile: single column, results after inputs.
 */
export function CalculatorShell({
  header,
  inputs,
  results,
  explanation,
  disclosure,
}: {
  header: ReactNode;
  inputs: ReactNode;
  results: ReactNode;
  explanation: ReactNode;
  disclosure: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[100rem] gap-8 px-4 py-10 md:gap-12 md:px-8 md:py-16">
      {header}
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(360px,440px)_1fr] lg:items-start lg:gap-12">
        <section aria-label="Inputs" className="nexus-panel grid min-w-0 gap-6 p-6 md:p-8">
          {inputs}
        </section>
        <section aria-label="Results" className="grid min-w-0 gap-6 lg:sticky lg:top-24">
          {results}
        </section>
      </div>
      {explanation}
      {disclosure}
    </div>
  );
}
