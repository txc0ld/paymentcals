import Link from "next/link";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";

const ROADMAP: Array<{ group: string; count: number; detail: string }> = [
  { group: "Pay & Tax", count: 9, detail: "Take-home, net-to-gross, PAYG withholding, HELP" },
  { group: "Property & Mortgage", count: 11, detail: "Repayments, simulator, stamp duty, LVR" },
  { group: "Loans & Debt", count: 3, detail: "Loans, car loans, credit-card payoff" },
  { group: "Savings", count: 2, detail: "Compound interest, savings goals" },
  { group: "Business", count: 2, detail: "GST, contractor day rate" },
];

export default function HomePage() {
  return (
    <>
      {/* HERO — Swiss editorial: grid lines, huge clamp type, mono badge. */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="grid-lines" aria-hidden="true" />
        <div className="dot-matrix" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 py-24 md:px-8 md:py-36">
          <span className="mb-8 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 before:h-px before:w-10 before:bg-hairline-strong before:content-['']">
            Deterministic engine // AU
          </span>
          <h1 className="max-w-[16ch] text-[length:var(--pc-text-h1)] font-medium leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
            Money answers, <span className="text-ink-3">with the working shown.</span>
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-7 text-ink-2">
            Australian pay, tax, mortgage and business calculators built like instruments: versioned
            official rules, exact arithmetic, and a full trace of every figure — assumptions,
            sources and limitations included.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/au/business/gst-calculator"
              className="btn-editorial inline-flex min-h-12 items-center gap-3 bg-accent px-7 py-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-contrast transition-transform duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Open the GST calculator
              <span aria-hidden="true">↗</span>
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              No account · runs on your device
            </span>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Principles" className="border-b border-hairline">
        <div className="mx-auto grid w-full max-w-[1360px] grid-cols-1 divide-y divide-hairline px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:px-8">
          {[
            ["Versioned rules", "Every statutory number cites its official source and review date."],
            ["Exact arithmetic", "Integer cents and audited decimals — never floating-point money."],
            ["Local first", "Calculations run in your browser. Your numbers stay on your device."],
          ].map(([title, copy]) => (
            <div key={title} className="grid gap-2 py-8 sm:px-8 sm:first:ps-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{title}</span>
              <p className="text-[13px] leading-5 text-ink-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE CALCULATORS — registry-driven. */}
      <section aria-labelledby="calculators-heading" className="mx-auto w-full max-w-[1360px] px-4 py-24 md:px-8">
        <div className="reveal-up mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 id="calculators-heading" className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
            Calculators
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {calculatorRegistry.length} live · preview build
          </span>
        </div>
        <div className="swiss-grid reveal-up sm:grid-cols-2 lg:grid-cols-3">
          {calculatorRegistry.map((entry) => (
            <Link
              key={entry.id}
              href={routePath(entry)}
              className="group grid min-h-44 content-between gap-6 p-6 transition-colors duration-[var(--pc-duration)] ease-[var(--pc-ease)] hover:bg-surface"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {entry.id}
                </span>
                <span
                  aria-hidden="true"
                  className="text-ink-3 transition-transform duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                >
                  ↗
                </span>
              </div>
              <div className="grid gap-1.5">
                <span className="text-lg font-medium text-ink">{entry.displayName}</span>
                <span className="text-[13px] leading-5 text-ink-3">{entry.seo.description}</span>
              </div>
            </Link>
          ))}
          {ROADMAP.map((item) => (
            <div key={item.group} className="grid min-h-44 content-between gap-6 p-6 opacity-70">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                In build · {item.count} routes
              </span>
              <div className="grid gap-1.5">
                <span className="text-lg font-medium text-ink-2">{item.group}</span>
                <span className="text-[13px] leading-5 text-ink-3">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METHOD BAND */}
      <section aria-labelledby="method-heading" className="border-t border-hairline">
        <div className="mx-auto grid w-full max-w-[1360px] gap-12 px-4 py-24 md:grid-cols-2 md:px-8">
          <h2 id="method-heading" className="reveal-up max-w-[14ch] text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
            Built to be checked, not believed.
          </h2>
          <ol className="reveal-up reveal-delay-1 grid content-start gap-6">
            {[
              ["01", "Official rule packs", "Rates and thresholds live in versioned, hash-verified rule packs citing ATO and state revenue sources — never hard-coded."],
              ["02", "Deterministic engines", "The same inputs always produce the same result, reconciled to the cent and replayable from the calculation trace."],
              ["03", "Full explainability", "Every result carries its working, assumptions by category, sources and limitations — one tab away."],
            ].map(([number, title, copy]) => (
              <li key={number} className="grid grid-cols-[auto_1fr] gap-4 border-t border-hairline pt-5">
                <span className="font-mono text-[11px] text-ink-3">{number}</span>
                <div className="grid gap-1">
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
