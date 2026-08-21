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
  methodologyHref,
}: {
  meta: CalculatorHeaderMeta;
  modeControl?: ReactNode;
  actions?: ReactNode;
  /** C2 — link to the calculator's methodology page, e.g. `/methodology/<slug>`. */
  methodologyHref?: string;
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
      {/* Each rule travels with the item that follows it, so a wrapped meta
       * line never ends on a dangling separator. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        <span>{meta.jurisdictionLabel}</span>
        <span className="flex min-w-0 items-center gap-x-4">
          <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hairline-strong" />
          <span>{meta.periodLabel}</span>
        </span>
        <span className="flex min-w-0 items-center gap-x-4">
          <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hairline-strong" />
          <span title={CLASS_DESCRIPTIONS[meta.calculationClass]}>
            {CLASS_DESCRIPTIONS[meta.calculationClass]}
          </span>
        </span>
        <Badge tone={meta.ruleStatus.tone}>{meta.ruleStatus.label}</Badge>
        {methodologyHref ? (
          <a
            href={methodologyHref}
            className="text-[var(--pc-accent-text)] underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Methodology
          </a>
        ) : null}
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
      {/* Both columns are query containers: the inputs column is only
       * 360–440px wide on a 1440px screen, so anything laid out inside them
       * must respond to the column, never to the viewport. */}
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(360px,440px)_1fr] lg:items-start lg:gap-12">
        <section aria-label="Inputs" className="nexus-panel @container grid min-w-0 gap-6 p-6 md:p-8">
          {inputs}
        </section>
        <section aria-label="Results" className="@container grid min-w-0 gap-6 lg:sticky lg:top-24">
          {results}
        </section>
      </div>
      {explanation}
      {disclosure}
    </div>
  );
}
