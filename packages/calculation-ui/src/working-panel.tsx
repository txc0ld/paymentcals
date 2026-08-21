import type { ReactNode } from "react";

/**
 * C3 — explainability for calculators that call pure engines directly
 * (no CalculationResultV1 envelope). Accepts literal working steps,
 * assumptions, sources and limitations and renders them in the same
 * editorial band as ExplainabilityTabs.
 */
export interface WorkingSource {
  title: string;
  url: string;
  detail?: string;
}

export function WorkingPanel({
  summary,
  steps,
  assumptions,
  sources,
  limitations,
}: {
  summary?: ReactNode;
  /** Ordered working lines, e.g. "duty = base + rate × hundreds". */
  steps?: ReactNode[];
  assumptions?: string[];
  sources?: WorkingSource[];
  limitations?: string[];
}) {
  const blocks: Array<[string, ReactNode]> = [];
  if (summary) blocks.push(["Summary", <p key="s" className="max-w-2xl text-[14px] leading-6 text-ink">{summary}</p>]);
  if (steps && steps.length > 0) {
    blocks.push([
      "Working",
      <ol key="w" className="grid gap-2">
        {steps.map((step, index) => (
          <li key={index} className="border-l border-hairline-strong pl-3 font-mono text-[13px] leading-6 text-ink-2">
            {step}
          </li>
        ))}
      </ol>,
    ]);
  }
  if (assumptions && assumptions.length > 0) {
    blocks.push([
      "Assumptions",
      <ul key="a" className="grid gap-2">
        {assumptions.map((assumption) => (
          <li key={assumption} className="border-l border-hairline pl-3 text-[13px] leading-5 text-ink-2">
            {assumption}
          </li>
        ))}
      </ul>,
    ]);
  }
  if (sources && sources.length > 0) {
    blocks.push([
      "Sources",
      <ul key="src" className="grid gap-2">
        {sources.map((source) => (
          <li key={source.url} className="text-[13px] leading-5 text-ink-2">
            <a
              href={source.url}
              rel="noopener noreferrer"
              target="_blank"
              className="underline decoration-hairline-strong underline-offset-2 hover:decoration-current"
            >
              {source.title}
            </a>
            {source.detail ? <span className="text-ink-3"> — {source.detail}</span> : null}
          </li>
        ))}
      </ul>,
    ]);
  }
  if (limitations && limitations.length > 0) {
    blocks.push([
      "Limitations",
      <ul key="l" className="grid gap-2">
        {limitations.map((limitation) => (
          <li key={limitation} className="border-l border-hairline pl-3 text-[13px] leading-5 text-ink-2">
            {limitation}
          </li>
        ))}
      </ul>,
    ]);
  }
  if (blocks.length === 0) return null;
  return (
    <section aria-label="How this is calculated" className="nexus-panel grid gap-8 p-6 md:p-8">
      {blocks.map(([heading, body]) => (
        <div key={heading} className="grid gap-3">
          <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">{heading}</h2>
          {body}
        </div>
      ))}
    </section>
  );
}
