import Link from "next/link";
import { calculatorRegistry } from "@paymentcalcs/calculator-registry";
import { StrataCanvas } from "../components/strata-canvas";
import { StatCounter } from "../components/stat-counter";

/* Official publications the rule packs cite (see /sources). Text-only:
 * these are citations of sources, not endorsements. */
const SOURCE_AUTHORITIES = [
  "Australian Taxation Office",
  "Revenue NSW",
  "Queensland Revenue Office",
  "State Revenue Office Tasmania",
  "Reserve Bank of Australia",
];

const CAPABILITIES = [
  {
    title: "Versioned rule packs",
    body: "Every statutory rate and threshold lives in a hash-verified pack citing its official source. Nothing is hard-coded from memory.",
  },
  {
    title: "Deterministic engines",
    body: "Pure functions over exact integer-cent arithmetic. The same inputs produce the same result, every time, on your device.",
  },
  {
    title: "Fail-closed by design",
    body: "If a verified rule set cannot be loaded, the calculator says so. It never substitutes a guess, a stale year or a plausible number.",
    inverted: true,
  },
  {
    title: "Every result shows its working",
    body: "Formulas, intermediate values, assumptions, sources and limitations render beside every figure — not behind a support ticket.",
    wide: true,
  },
  {
    title: "Private by default",
    body: "Calculations run client-side. Scenarios save to your browser. No accounts, no cookies, no ads.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* S1 — Hero */}
      <section className="relative -mt-16 overflow-hidden bg-canvas">
        <StrataCanvas />
        <div className="hero-grid-lines" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[100rem] flex-col justify-center px-4 py-28 md:px-8">
          <span className="editorial-badge reveal-up mb-10 inline-flex w-fit items-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            Rule_Grid // {calculatorRegistry.length} calculators
          </span>
          <h1 className="reveal-up delay-1 max-w-[12ch] text-[length:var(--pc-text-h1)] font-medium leading-[0.92] tracking-[var(--pc-tracking-tight)] text-ink [text-wrap:balance]">
            Know the <span className="text-ink-3">number.</span>
          </h1>
          <p className="reveal-up delay-2 mt-8 max-w-md text-[length:var(--pc-text-body)] leading-relaxed text-ink-2">
            Deterministic Australian money calculators. Official rules, exact arithmetic, full
            working.
          </p>
          <div className="reveal-up delay-2 mt-12">
            <Link href="/calculators" className="btn-editorial group inline-flex min-h-12 items-center gap-4 px-8 py-4 font-mono text-sm font-semibold uppercase tracking-[0.16em]">
              <span className="relative z-10">Open calculators</span>
              <span aria-hidden="true" className="relative z-10">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* S2 — Sources row */}
      <section aria-label="Rule sources" className="border-y border-hairline px-4 py-10 md:px-8">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-baseline gap-x-12 gap-y-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
            Rules cited from
          </span>
          {SOURCE_AUTHORITIES.map((name) => (
            <span
              key={name}
              className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-3 transition-colors duration-500 hover:text-ink"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* S3 — Platform preview */}
      <section aria-label="Interface preview" className="px-4 py-24 md:px-8 md:py-32">
        <div className="reveal-up mx-auto w-full max-w-[100rem]">
          <div className="glass-panel relative aspect-[16/10] w-full overflow-hidden border border-hairline md:aspect-[21/9]">
            <div className="flex items-center gap-4 border-b border-hairline px-5 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-ink/30" />
                <span className="h-2 w-2 rounded-full bg-ink/30" />
                <span className="h-2 w-2 rounded-full bg-ink/30" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                Pay Calculator — FY 2026-27
              </span>
            </div>
            <div className="grid gap-8 p-6 md:grid-cols-[1fr_1.4fr] md:p-10">
              <div className="grid content-start gap-5">
                <div className="flex gap-6 border-b border-hairline pb-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                  <span className="border-b border-ink pb-3 text-ink">Result</span>
                  <span className="text-ink-3">Working</span>
                  <span className="text-ink-3">Assumptions</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  Take-home per month
                </span>
                <span className="font-mono text-4xl tabular-nums text-ink md:text-5xl" aria-hidden="true">
                  $—,———
                </span>
                <span className="text-[13px] leading-5 text-ink-3">
                  Liability and withholding shown separately, with every step of the working.
                </span>
              </div>
              <div className="hidden items-end gap-3 md:flex" aria-hidden="true">
                {[0.35, 0.55, 0.45, 0.7, 0.9].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h * 100}%` }}
                    className={`flex-1 ${i === 4 ? "bar-glow bg-accent" : "bg-ink/15"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* S4 — Capabilities bento */}
      <section aria-labelledby="capabilities-heading" className="px-4 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto w-full max-w-[100rem]">
          <h2
            id="capabilities-heading"
            className="reveal-up mb-12 max-w-[16ch] text-[length:var(--pc-text-h2)] font-medium leading-[0.96] tracking-[var(--pc-tracking-tight)] text-ink"
          >
            Built like an instrument, not a brochure.
          </h2>
          <div className="swiss-grid grid-cols-1 md:grid-cols-3">
            {CAPABILITIES.map((cap, index) => (
              <div
                key={cap.title}
                className={`hover-lift reveal-up grid content-start gap-4 p-8 ${index < 3 ? `delay-${index}` : ""} ${
                  cap.inverted ? "bg-ink text-canvas" : "bg-canvas"
                } ${cap.wide ? "md:col-span-2" : ""}`}
              >
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.2em] ${cap.inverted ? "text-canvas/60" : "text-ink-3"}`}
                >
                  0{index + 1}
                </span>
                <h3 className="text-xl font-medium leading-tight">{cap.title}</h3>
                <p className={`text-[14px] leading-6 ${cap.inverted ? "text-canvas/70" : "text-ink-2"}`}>
                  {cap.body}
                </p>
              </div>
            ))}
            <Link
              href="/calculators"
              className="hover-lift reveal-up group grid content-between gap-8 bg-canvas p-8 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-focus md:col-span-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">Index</span>
              <span className="flex items-end justify-between gap-4">
                <span className="text-xl font-medium leading-tight text-ink">
                  All {calculatorRegistry.length} calculators
                </span>
                <span aria-hidden="true" className="font-mono text-ink transition-transform duration-500 ease-[var(--pc-ease)] group-hover:-translate-y-1 group-hover:translate-x-1">
                  ↗
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* S5 — Metrics */}
      <section aria-label="Build status" className="border-t border-hairline px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid w-full max-w-[100rem] gap-12 md:grid-cols-3">
          {[
            { value: calculatorRegistry.length, suffix: "", label: "Calculators live in this build" },
            { value: 22, suffix: "", label: "Versioned rule packs, each citing its source" },
            { value: 100, suffix: "%", label: "Of results render their full working" },
          ].map((stat, index) => (
            <div key={stat.label} className={`reveal-up delay-${index} grid gap-3 border-l border-hairline pl-6`}>
              <span className="font-mono text-6xl tabular-nums tracking-tight text-ink md:text-7xl">
                <StatCounter value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
