import Link from "next/link";
import type { ContentPage } from "../lib/site-content";

/** Article layout for the trust and developer pages, matching the
 * methodology-page measure and rhythm. */
export function ContentPageArticle({ page, label }: { page: ContentPage; label: string }) {
  return (
    <article className="mx-auto w-full max-w-[100rem] px-4 py-16 md:px-8 md:py-24">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{label}</p>
      <h1 className="max-w-[18ch] text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
        {page.title}
      </h1>
      <p className="mt-4 max-w-[65ch] text-[15px] leading-7 text-ink-2">{page.intro}</p>

      <div className="mt-14 max-w-5xl">
        {page.sections.map((section) => (
          <section key={section.heading} className="border-t border-hairline py-8">
            <h2 className="text-[length:var(--pc-text-h3)] font-semibold tracking-tight text-ink">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-4 max-w-[70ch] text-[14px] leading-6 text-ink-2">
                {paragraph}
              </p>
            ))}
            {section.links?.length ? (
              <ul className="mt-5 grid gap-1">
                {section.links.map((link) => {
                  const external = !link.href.startsWith("/");
                  const anchorClass =
                    "inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--pc-accent-text)] underline decoration-hairline-strong underline-offset-2 transition-colors duration-500 hover:text-ink hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";
                  return (
                    <li key={link.href}>
                      {external ? (
                        <a href={link.href} rel="noopener" className={anchorClass}>
                          {link.label} ↗
                        </a>
                      ) : (
                        <Link href={link.href} className={anchorClass}>
                          {link.label} ↗
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
