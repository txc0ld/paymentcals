import Link from "next/link";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";

const FEATURED_IDS = [
  "AU-PAY-001",
  "AU-HOME-001",
  "AU-HOME-002",
  "AU-HOME-017",
  "AU-PAY-004",
  "AU-DEBT-012",
  "GL-SAVE-002",
  "AU-BIZ-006",
  "AU-PAY-013",
] as const;

export default function HomePage() {
  const featuredCalculators = FEATURED_IDS.map(
    (id) => calculatorRegistry.find((entry) => entry.id === id)!,
  );

  return (
    <>
      <section className="nexus-hero relative overflow-hidden">
        <div className="nexus-orbit" aria-hidden="true" />
        <div className="nexus-matrix" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[inherit] w-full max-w-[1280px] flex-col justify-center px-4 py-24 md:px-8 md:py-32">
          <span className="nexus-badge reveal-up mb-8 inline-flex w-fit items-center gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--pc-accent-text)] before:h-2 before:w-2 before:rounded-[2px] before:bg-positive before:content-['']">
            {calculatorRegistry.length} calculators // AU rule grid
          </span>
          <h1 className="reveal-up reveal-delay-1 max-w-[9ch] text-[length:var(--pc-text-h1)] leading-[0.94] text-ink [font-size:clamp(3.5rem,10vw,8.5rem)] [text-wrap:balance]">
            Know the number.
          </h1>
          <Link
            href="/calculators"
            className="nexus-primary reveal-up reveal-delay-2 mt-10 inline-flex min-h-12 w-fit items-center gap-3 bg-accent px-7 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-accent-contrast focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            Open calculators
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="calculators-heading" className="mx-auto w-full max-w-[1280px] px-4 py-20 md:px-8 md:py-28">
        <div className="reveal-up mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
          <h2 id="calculators-heading" className="text-[length:var(--pc-text-h2)] leading-none text-ink">
            Rule grid
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
            Featured // {featuredCalculators.length} nodes
          </span>
        </div>
        <div className="nexus-grid nexus-feature-grid sm:grid-cols-2 lg:grid-cols-4">
          {featuredCalculators.map((entry, index) => (
            <Link
              key={entry.id}
              href={routePath(entry)}
              className={`reveal-up group grid min-h-52 content-between gap-8 p-6 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus ${index < 4 ? `reveal-delay-${index + 1}` : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="nexus-badge px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  {entry.id}
                </span>
                <span aria-hidden="true" className="nexus-arrow grid h-10 w-10 place-items-center font-mono">
                  ↗
                </span>
              </div>
              <span className={`${index === 0 ? "max-w-[12ch] text-3xl md:text-4xl" : "text-xl"} font-semibold leading-tight text-ink`}>
                {entry.displayName}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Method" className="nexus-method px-4 py-8 md:px-8">
        <ol className="mx-auto grid w-full max-w-[1180px] gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2 md:grid-cols-3 md:gap-8">
          <li className="reveal-up">01 // Versioned official rules</li>
          <li className="reveal-up reveal-delay-1">02 // Exact arithmetic</li>
          <li className="reveal-up reveal-delay-2">03 // Working shown</li>
        </ol>
      </section>
    </>
  );
}