import type { Metadata } from "next";
import { allAuRulePacks } from "@paymentcalcs/rules-au";

export const metadata: Metadata = {
  title: "Sources and Rule Packs",
  description:
    "Every statutory value on PaymentCalcs traces to a versioned rule pack citing an official source, with retrieval dates and verification status shown here.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  return (
    <section className="mx-auto w-full max-w-[900px] px-4 py-16 md:px-8 md:py-24">
      <h1 className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
        Sources
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-2">
        No statutory number on this site is hard-coded. Every rate, threshold and formula lives in a
        versioned rule pack that cites its official source, records when it was retrieved, and
        carries a status. Packs marked in review have not yet completed human verification and only
        run in preview builds behind a visible draft banner.
      </p>
      <ul className="mt-10 grid gap-6">
        {allAuRulePacks.map((pack) => (
          <li key={pack.rulePackId} className="nexus-panel-soft grid gap-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[14px] text-ink">{pack.rulePackId}</span>
              <span className="border border-hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                {pack.status} · v{pack.rulesVersion} · {pack.effectiveFrom} → {pack.effectiveTo ?? "open"}
              </span>
            </div>
            <ul className="grid gap-2">
              {pack.sources.map((source) => (
                <li key={source.sourceId} className="grid gap-0.5 border-l border-hairline-strong pl-3">
                  <span className="text-[13px] text-ink">{source.title}</span>
                  <span className="text-[12px] text-ink-3">{source.authority}</span>
                  <a
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="break-all font-mono text-[11px] text-info underline decoration-hairline-strong underline-offset-2 hover:decoration-current"
                  >
                    {source.url}
                  </a>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                    Retrieved {source.retrievedAt.slice(0, 10)}
                    {source.contentHash ? ` · sha256 ${source.contentHash.slice(0, 12)}…` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
