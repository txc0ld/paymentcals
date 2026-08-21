import type { ReactNode } from "react";

export interface FaqItem {
  question: string;
  /** Plain-text answer used for FAQPage JSON-LD (no markup). */
  answer: string;
  /** Optional richer rendering; falls back to the plain answer. */
  render?: ReactNode;
}

/**
 * Answer-engine content block: question-form headings with direct answers,
 * mirrored into FAQPage JSON-LD. Copy rules apply — general information
 * phrasing only, and no statutory value may be hard-coded here; numbers
 * belong in rule packs and calculator outputs.
 */
export function FaqSection({ title = "Common questions", items }: { title?: string; items: FaqItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <section aria-label={title} className="mx-auto w-full max-w-[100rem] px-4 pb-16 md:px-8">
      {/* Static JSON built from authored copy — no user input reaches this markup. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      <h2 className="mb-6 border-b border-hairline pb-3 font-sans text-sm font-bold uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
        {title}
      </h2>
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.question}>
            <h3 className="mb-2 font-sans text-base font-bold uppercase tracking-wide">{item.question}</h3>
            <div className="text-sm leading-6 text-ink-2">{item.render ?? <p>{item.answer}</p>}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
