import Link from "next/link";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";

const ROADMAP: Array<{ group: string; count: number; detail: string }> = [
  { group: "Property & Mortgage", count: 11, detail: "Repayments, simulator, stamp duty, LVR" },
  { group: "Loans & Debt", count: 3, detail: "Loans, car loans, credit-card payoff" },
  { group: "Savings", count: 2, detail: "Compound interest, savings goals" },
  { group: "Business", count: 1, detail: "Contractor day rate" },
];

export default function HomePage() {
  return (
    <>
      {/* HERO — Swiss editorial: grid lines, huge clamp type, mono badge. */}
      <section className="hero-candy relative overflow-hidden pb-8">
        <div className="grid-lines" aria-hidden="true" />
        <div className="dot-matrix" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col justify-center px-4 py-20 md:px-8 md:py-28 lg:min-h-[680px]">
          <span className="clay-chip mb-8 inline-flex w-fit items-center gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2 before:h-2 before:w-2 before:rounded-full before:bg-positive before:content-['']">
            Deterministic engine // AU
          </span>
          <h1 className="max-w-[13ch] text-[length:var(--pc-text-h1)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink [text-wrap:balance]">
            Money answers, <span className="text-ink-3">with the working shown.</span>
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-7 text-ink-2 lg:max-w-lg">
            Australian pay, tax, mortgage and business calculators built like instruments: versioned
            official rules, exact arithmetic, and a full trace of every figure, with assumptions,
            sources and limitations included.
          </p>
          <div className="mt-10 flex max-w-xl flex-wrap items-center gap-5">
            <Link
              href="/au/business/gst-calculator"
              className="btn-editorial inline-flex min-h-12 items-center gap-3 bg-accent px-7 py-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-contrast focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              Open the GST calculator
              <span aria-hidden="true">↗</span>
            </Link>
            <span className="clay-chip px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
              No account · runs on your device
            </span>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Principles" className="relative z-10 -mt-2 px-4 md:px-8">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Versioned rules", "Every statutory number cites its official source and review date."],
            ["Exact arithmetic", "Integer cents and audited decimals. Never floating-point money."],
            ["Local first", "Calculations run in your browser. Your numbers stay on your device."],
          ].map(([title, copy]) => (
            <div key={title} className="clay-panel-soft grid min-w-0 gap-3 p-6 sm:-rotate-1 sm:even:rotate-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">{title}</span>
              <p className="text-[13px] leading-5 text-ink-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE CALCULATORS — registry-driven. */}
      <section aria-labelledby="calculators-heading" className="mx-auto w-full max-w-[1280px] px-4 py-24 md:px-8 md:py-32">
        <div className="reveal-up mb-12 flex flex-wrap items-end justify-between gap-5">
          <h2 id="calculators-heading" className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
            Calculators
          </h2>
          <span className="clay-chip px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
            {calculatorRegistry.length} live · preview build
          </span>
        </div>
        <div className="swiss-grid reveal-up sm:grid-cols-2 lg:grid-cols-3">
          {calculatorRegistry.map((entry) => (
            <Link
              key={entry.id}
              href={routePath(entry)}
              className="group grid min-h-52 content-between gap-8 p-7 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {entry.id}
                </span>
                <span
                  aria-hidden="true"
                  className="clay-arrow grid h-10 w-10 place-items-center rounded-full bg-accent font-mono text-accent-contrast shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_color-mix(in_srgb,var(--pc-accent)_72%,#0b0d0f)]"
                >
                  ↗
                </span>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xl font-semibold text-ink">{entry.displayName}</span>
                <span className="text-[13px] leading-5 text-ink-3">{entry.seo.description}</span>
              </div>
            </Link>
          ))}
          {ROADMAP.map((item) => (
            <div key={item.group} className="grid min-h-52 content-between gap-8 p-7 opacity-80">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                In build · {item.count} routes
              </span>
              <div className="grid gap-1.5">
                <span className="text-xl font-semibold text-ink-2">{item.group}</span>
                <span className="text-[13px] leading-5 text-ink-3">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METHOD BAND */}
      <section aria-labelledby="method-heading" className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="clay-method mx-auto grid w-full max-w-[1180px] gap-12 px-6 py-12 md:grid-cols-[0.8fr_1.2fr] md:px-12 md:py-16">
          <h2 id="method-heading" className="reveal-up max-w-[14ch] text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
            Built to be checked, not believed.
          </h2>
          <ol className="reveal-up reveal-delay-1 grid content-start gap-5">
            {[
              ["01", "Official rule packs", "Rates and thresholds live in versioned, hash-verified rule packs citing ATO and state revenue sources. Never hard-coded."],
              ["02", "Deterministic engines", "The same inputs always produce the same result, reconciled to the cent and replayable from the calculation trace."],
              ["03", "Full explainability", "Every result carries its working, assumptions by category, sources and limitations, one tab away."],
            ].map(([number, title, copy]) => (
              <li key={number} className="clay-panel-soft grid min-w-0 grid-cols-[auto_1fr] gap-4 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-mono text-[11px] text-accent-contrast shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_color-mix(in_srgb,var(--pc-accent)_72%,#0b0d0f)]">{number}</span>
                <div className="grid min-w-0 gap-1">
                  <span className="text-[15px] font-medium text-ink">{title}</span>
                  <p className="text-[13px] leading-5 text-ink-2">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
