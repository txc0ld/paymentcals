import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Calculation and rule-pack changes on PaymentCalcs, in the open.",
  alternates: { canonical: "/changelog" },
};

const ENTRIES = [
  {
    date: "2026-08-21",
    title: "P0 preview build",
    items: [
      "27 calculators live across pay & tax, property & mortgage, loans & debt, savings and business.",
      "22 rule packs authored from same-day official sources (ATO, QRO, Revenue NSW, SRO Tasmania), all pending human verification before production activation.",
      "Stamp duty for VIC, WA, SA, ACT and NT is intentionally blocked pending transcription of official rates.",
      "Every schedule-producing engine reconciles each period; solver-backed calculators verify their answers through the forward calculation.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <section className="mx-auto w-full max-w-[100rem] px-4 py-16 md:px-8 md:py-24">
      {/* One measure for header rule and entries: the rule used to run the
       * full container while the entries stopped at 5xl, leaving a ragged edge. */}
      <header className="grid max-w-5xl gap-4 border-b border-hairline pb-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Release record // Public
        </span>
        <h1 className="text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
          Changelog
        </h1>
      </header>
      <ol className="rule-grid mt-12 max-w-5xl">
        {ENTRIES.map((entry) => (
          <li key={entry.date} className="grid content-start gap-5 bg-surface p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{entry.title}</h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{entry.date}</span>
            </div>
            <ul className="grid gap-2">
              {entry.items.map((item) => (
                <li key={item} className="border-l border-hairline-strong pl-3 text-[14px] leading-6 text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
