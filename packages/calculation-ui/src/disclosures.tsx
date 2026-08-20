/**
 * §17.9 baseline disclosure copy v2.0 — exact strings; product must not
 * ad-lib around them. Counsel may amend at legal review; changes bump the
 * version and flow through the changelog.
 */
export const DISCLOSURE_VERSION = "v2.0";

export function UniversalDisclosure({ financialYear }: { financialYear: string }) {
  return (
    <aside
      aria-label="Important information"
      data-disclosure-version={DISCLOSURE_VERSION}
      className="border-t border-hairline pt-4 text-[12px] leading-5 text-ink-3"
    >
      <p>
        Estimates only, based on the inputs and assumptions shown. This is general information and a
        mathematical tool — it is not financial, tax, credit or legal advice and does not consider
        your personal circumstances. Figures use {financialYear} rules with status shown above — see
        the changelog. Consider whether the results are appropriate for you and seek licensed advice
        where needed.
      </p>
    </aside>
  );
}

/** Dev-only banner: rendered whenever an `in_review` pack is executing. */
export function DraftRulesBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-40 border-b border-warn bg-warn-surface px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-warn"
    >
      Draft rules — not verified. Development preview only.
    </div>
  );
}
