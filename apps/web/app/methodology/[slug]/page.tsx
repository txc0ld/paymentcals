import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";
import { allAuRulePacks } from "@paymentcalcs/rules-au";
import { ENGINE_NOTES } from "../../../lib/engine-notes";

/** §24 / §13.29: one methodology page per calculator, from the registry. */

export function generateStaticParams() {
  return calculatorRegistry.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = calculatorRegistry.find((candidate) => candidate.slug === slug);
  if (!entry) return {};
  return {
    title: `${entry.displayName} — Methodology`,
    description: `How the ${entry.displayName} calculates: engines, formulas, rule packs and limitations.`,
    alternates: { canonical: `/methodology/${slug}` },
  };
}

export default async function MethodologyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = calculatorRegistry.find((candidate) => candidate.slug === slug);
  if (!entry) notFound();

  const packs = allAuRulePacks.filter((pack) => entry.rulePackDependencies.includes(pack.domain));

  return (
    <article className="mx-auto w-full max-w-[100rem] px-4 py-16 md:px-8 md:py-24">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
        Methodology · {entry.id}
      </p>
      <h1 className="max-w-[18ch] text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
        {entry.displayName}
      </h1>
      <p className="mt-4 max-w-[65ch] text-[15px] leading-7 text-ink-2">{entry.seo.description}</p>

      {/* max-w-5xl is the page measure; the intro above shares it so the
       * section rules and the engine grid line up on the same right edge. */}
      <div className="mt-14 max-w-5xl border-t border-hairline pt-8">
        <h2 className="text-[length:var(--pc-text-h3)] font-semibold tracking-tight text-ink">Engines and formulas</h2>
        {/* rule-grid: engine counts are odd as often as not, and a gap-px fill
         * would paint the unfilled cell of the last row as a solid block. */}
        <ul className="rule-grid mt-6 md:grid-cols-2">
          {entry.engineDependencies.map((engineId) => {
            const note = ENGINE_NOTES[engineId];
            if (!note) return null;
            return (
              <li key={engineId} className="grid content-start gap-2 bg-surface p-6 md:p-8">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                  {engineId} · {note.name}
                </span>
                <p className="text-[14px] leading-6 text-ink-2">{note.method}</p>
                {note.formulas.length > 0 ? (
                  <p className="font-mono text-[11px] text-ink-3">Registered formulas: {note.formulas.join(" · ")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>

      {packs.length > 0 ? (
        <>
          <h2 className="mt-12 border-t border-hairline pt-8 text-[length:var(--pc-text-h3)] font-semibold tracking-tight text-ink">Rule packs</h2>
          <p className="mt-2 text-[14px] leading-6 text-ink-2">
            Statutory values come only from versioned, hash-verified rule packs citing official
            sources. Current status of the packs this calculator can use:
          </p>
          <ul className="mt-4 grid gap-2">
            {packs.map((pack) => (
              <li key={pack.rulePackId} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
                <span className="font-mono text-[13px] text-ink">{pack.rulePackId}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {pack.status} · v{pack.rulesVersion}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="mt-12 border-t border-hairline pt-8 text-[length:var(--pc-text-h3)] font-semibold tracking-tight text-ink">Verification</h2>
      <p className="mt-2 text-[14px] leading-6 text-ink-2">
        Engines carry boundary tests at every bracket edge, property-based tests, reconciliation
        invariants and, where official worked examples exist, tests that reproduce them exactly.
        The full source register is on the <Link href="/sources" className="inline-flex min-h-11 items-center underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus">sources page</Link>.
      </p>

      <p className="mt-12">
        <Link
          href={routePath(entry)}
          className="nexus-primary inline-flex min-h-11 items-center gap-3 bg-accent px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-accent-contrast focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          Open the calculator <span aria-hidden="true">↗</span>
        </Link>
      </p>
      </div>
    </article>
  );
}
