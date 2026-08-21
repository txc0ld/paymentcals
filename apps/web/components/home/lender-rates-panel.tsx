"use client";

import { useEffect, useState } from "react";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type LenderRatesRulePack } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { DisclosurePanel } from "./field-parts";

/**
 * Reference-only panel: published averages read out of the resolved
 * lender-rates pack, never a rate held in this component and never an offer.
 * It is a convenience for filling the rate field, so a pack that does not
 * resolve simply removes the panel — there is no result surface to fail.
 */

const VALUATION_DATE = "2026-10-01";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "2026-07-31" → "July 2026". Deterministic — no locale or ICU dependence. */
function monthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  const name = MONTHS[Number.parseInt(month ?? "", 10) - 1];
  return year && name ? `${name} ${year}` : iso;
}

export function LenderRatesPanel({ id, onUse }: { id: string; onUse: (ratePercent: string) => void }) {
  const [pack, setPack] = useState<LenderRatesRulePack | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "lender-rates",
      jurisdiction: "AU",
      valuationDate: VALUATION_DATE,
      allowDraftRules,
    }).then((outcome) => {
      if (!cancelled && outcome.ok) setPack(outcome.pack as LenderRatesRulePack);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pack) return null;

  return (
    <div className="nexus-panel-soft min-w-0 p-4">
      <DisclosurePanel
        id={id}
        open={open}
        onToggle={setOpen}
        heading={`Published average rates (RBA F5, ${monthLabel(pack.rules.observationDate)})`}
        summary="Reserve Bank of Australia published averages of lender rates — not offers or advertised rates."
      >
        <ul className="grid min-w-0 gap-2">
          {pack.rules.series.map((series) => (
            <li
              key={series.seriesId}
              className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
            >
              <span className="min-w-0 flex-1 text-[12px] leading-4 text-ink-2">{series.label}</span>
              <span className="font-mono text-[13px] tabular-nums text-ink">{series.ratePercent}%</span>
              <button
                type="button"
                onClick={() => onUse(series.ratePercent)}
                aria-label={`Use ${series.label}, ${series.ratePercent} per cent`}
                className="nexus-quiet-button min-h-11 shrink-0 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </DisclosurePanel>
    </div>
  );
}
