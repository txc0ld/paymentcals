import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";
import { allAuRulePacks } from "@paymentcalcs/rules-au";

/** §24 / §13.29: one methodology page per calculator, from the registry. */

const ENGINE_NOTES: Record<string, { name: string; method: string; formulas: string[] }> = {
  E01: { name: "Core money and period engine", method: "Integer-cent money arithmetic and explicit period conversions (52 weeks, 26 fortnights, 12 months per year).", formulas: [] },
  E02: { name: "Australian annual tax engine", method: "Piecewise progressive brackets (§13.13), LITO taper, Medicare levy with low-income phase-in, Medicare levy surcharge tiers and study-loan repayment (marginal from 2025-26, whole-income before), all from versioned rule packs.", formulas: ["F-TAX-001 progressive brackets", "F-TAX-002 LITO", "F-TAX-003 Medicare levy", "F-TAX-004 MLS", "F-TAX-005 STSL"] },
  E03: { name: "PAYG withholding engine", method: "The ATO statement-of-formulas method: y = a·x − b on weekly-equivalent earnings with schedule rounding, plus the Schedule 8 study-loan component. Never annual tax divided by pay periods (§13.16).", formulas: ["F-PAYG-001 schedule formulas"] },
  E04: { name: "Compensation engine", method: "Package decomposition base = package ÷ (1 + r), capped by the maximum contribution base, with an iterative §12.1.7 verification path.", formulas: ["F-PAY-001 package decomposition"] },
  E07: { name: "Scheduled mortgage ledger", method: "A payment-period ledger with dated events (rates, extras, offsets, fees), §13.9 offset treatment and §12.5.8 reconciliation invariants on every period. Daily accrual is not modelled at P0.", formulas: ["§13.7 recurrence", "§13.9 offset"] },
  E08: { name: "Property transaction engine", method: "General transfer duty as bracket base plus rate per $100 or part thereof, from per-state rule packs. Unsupported states block rather than guess.", formulas: ["§12.8 duty brackets"] },
  E10: { name: "Affordability estimate (lite)", method: "Monthly surplus after an editable expense floor, converted to an indicative range via the §13.5 payment formula at your rate plus an editable buffer. A range, never an approval.", formulas: ["§13.5 payment"] },
  E11: { name: "Amortising loan engine", method: "Closed-form §13.5 payment (with §13.6 balloon), then a full §13.7 schedule with per-period cent rounding and a capped final-payment adjustment.", formulas: ["§13.5 payment", "§13.6 balloon", "§13.7 recurrence"] },
  E12: { name: "Revolving credit engine", method: "Monthly statement cycles: interest on the opening balance, configurable minimum rule (percent with floor), fixed-payment strategy, promotional expiry on its exact date.", formulas: ["§12.11 cycles"] },
  E14: { name: "Savings engine", method: "§13.11 future value with contributions, cross-checked by period simulation; goal solving by closed-form inversion verified through the forward calculation.", formulas: ["§13.11 future value"] },
  E19: { name: "Contractor economics engine", method: "Billable capacity from weekdays minus leave, holidays and non-billable days times utilisation; day rate covers income, super replacement, overheads and the chosen margin. GST is quoted on top and never treated as revenue.", formulas: ["§12.16 capacity"] },
  E20: { name: "Business arithmetic engine", method: "GST arithmetic per §13.18 with explicit rounding levels and largest-remainder allocation so invoice lines always reconcile to totals.", formulas: ["F-GST-001", "F-GST-002"] },
  E24: { name: "Financial solver", method: "Monotonic bisection with §13.28 safeguards: bounds, tolerances, iteration caps, discontinuity detection and unattainable-target reporting.", formulas: ["§13.28 bisection"] },
};

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

      <div className="mt-14 max-w-5xl border-t border-hairline pt-8">
        <h2 className="text-[length:var(--pc-text-h3)] font-semibold tracking-tight text-ink">Engines and formulas</h2>
        <ul className="mt-5 grid gap-px bg-hairline md:grid-cols-2">
          {entry.engineDependencies.map((engineId) => {
            const note = ENGINE_NOTES[engineId];
            if (!note) return null;
            return (
              <li key={engineId} className="grid gap-2 bg-surface p-5 md:p-6">
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
