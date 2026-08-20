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
      "28 calculators live across pay & tax, property & mortgage, loans & debt, savings and business.",
      "14 statutory rule packs authored from same-day official sources (ATO, QRO, Revenue NSW, SRO Tasmania), all pending human verification before production activation.",
      "Stamp duty for VIC, WA, SA, ACT and NT is intentionally blocked pending transcription of official rates.",
      "Every schedule-producing engine reconciles each period; solver-backed calculators verify their answers through the forward calculation.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <section className="mx-auto w-full max-w-[820px] px-4 py-16 md:px-8 md:py-24">
      <h1 className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
        Changelog
      </h1>
      <ol className="mt-10 grid gap-8">
        {ENTRIES.map((entry) => (
          <li key={entry.date} className="clay-panel-soft grid gap-3 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium text-ink">{entry.title}</h2>
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
