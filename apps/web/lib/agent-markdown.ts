import { calculatorRegistry, routePath, type RegistryEntry } from "@paymentcalcs/calculator-registry";
import { allAuRulePacks } from "@paymentcalcs/rules-au";
import { ENGINE_NOTES } from "./engine-notes";
import { CONTENT_PAGES, type ContentPage } from "./site-content";
import { SITE_NAME, SITE_URL } from "./site";

/**
 * Markdown representations of the site's pages, served via Accept
 * negotiation (acceptmarkdown.com). Rendered from the same registry, rule
 * packs and content data as the HTML pages so the two representations
 * cannot drift apart.
 */

const CATEGORY_HUBS: Record<string, { title: string; blurb: string }> = {
  "/au/pay-tax": { title: "Pay and tax calculators", blurb: "Income tax, take-home pay, PAYG withholding, study loans and super." },
  "/au/property-mortgage": { title: "Property and mortgage calculators", blurb: "Repayments, offset, extra repayments, refinance, stamp duty, LVR and buying costs." },
  "/au/loans-debt": { title: "Loan and debt calculators", blurb: "Personal and car loans, credit card payoff, amortisation schedules." },
  "/au/business": { title: "Business calculators", blurb: "GST arithmetic and contractor day-rate economics." },
  "/global/savings-investing": { title: "Savings and investing calculators", blurb: "Compound interest and savings goals from explicit inputs." },
};

const NOT_ADVICE =
  "Results are general information calculated from stated inputs and published rules — not financial advice.";

function heading(title: string): string[] {
  return [`# ${title}`, ""];
}

function footerLinks(): string[] {
  return [
    "",
    "---",
    "",
    `Site map: [All calculators](${SITE_URL}/calculators) · [llms.txt](${SITE_URL}/llms.txt) · [Sources](${SITE_URL}/sources) · [For agents](${SITE_URL}/developers)`,
  ];
}

function entryLine(entry: RegistryEntry): string {
  return `- [${entry.displayName}](${SITE_URL}${routePath(entry)}): ${entry.seo.description}`;
}

function homeMarkdown(): string[] {
  return [
    ...heading(`${SITE_NAME}: Australian financial calculators that show their working`),
    "Deterministic Australian pay, tax, mortgage, loan, savings and business calculators.",
    "Every result shows its working, assumptions, sources and limitations.",
    "",
    "## What makes the numbers trustworthy",
    "",
    "- Every statutory value comes from a versioned, hash-verified rule pack citing its official source (ATO, state revenue offices). Nothing is hard-coded from memory.",
    "- Engines are pure functions over integer-cent arithmetic: same inputs, same result, every time, computed on your device.",
    "- Fail-closed: if a verified rule set cannot be loaded, the calculator says so instead of guessing.",
    "- Annual tax liability and per-pay withholding are separate engines, labelled separately.",
    "- No large language model takes part in any calculation path.",
    "",
    `${NOT_ADVICE}`,
    "",
    "## Start here",
    "",
    `- [All ${calculatorRegistry.length} calculators](${SITE_URL}/calculators)`,
    `- [How each calculator works](${SITE_URL}/calculators) (methodology linked per calculator)`,
    `- [Sources and rule packs](${SITE_URL}/sources)`,
    `- [For AI agents and developers](${SITE_URL}/developers)`,
  ];
}

function calculatorsIndexMarkdown(): string[] {
  const lines = [
    ...heading(`All ${SITE_NAME} calculators`),
    `${calculatorRegistry.length} calculators, grouped by category. ${NOT_ADVICE}`,
  ];
  for (const [hubPath, hub] of Object.entries(CATEGORY_HUBS)) {
    const entries = calculatorRegistry.filter((entry) => routePath(entry).startsWith(`${hubPath}/`));
    if (entries.length === 0) continue;
    lines.push("", `## ${hub.title}`, "", ...entries.map(entryLine));
  }
  return lines;
}

function categoryHubMarkdown(path: string): string[] | null {
  const hub = CATEGORY_HUBS[path];
  if (!hub) return null;
  const entries = calculatorRegistry.filter((entry) => routePath(entry).startsWith(`${path}/`));
  return [...heading(`${hub.title} — ${SITE_NAME}`), hub.blurb, "", ...entries.map(entryLine)];
}

function engineNotesFor(entry: RegistryEntry) {
  return entry.engineDependencies.flatMap((engineId) => {
    const note = ENGINE_NOTES[engineId];
    return note ? [{ engineId, note }] : [];
  });
}

function calculatorMarkdown(entry: RegistryEntry): string[] {
  const notes = engineNotesFor(entry);
  const packs = allAuRulePacks.filter((pack) => entry.rulePackDependencies.includes(pack.domain));
  return [
    ...heading(`${entry.displayName} — ${SITE_NAME}`),
    entry.seo.description,
    "",
    `This is an interactive calculator; open it at ${SITE_URL}${routePath(entry)} to enter inputs. ${NOT_ADVICE}`,
    "",
    "## How it calculates",
    "",
    ...notes.map(({ engineId, note }) => `- ${engineId} ${note.name}: ${note.method}`),
    "",
    ...(packs.length > 0
      ? [
          "## Rule packs it can use",
          "",
          ...packs.map((pack) => `- ${pack.rulePackId} (${pack.status}, v${pack.rulesVersion})`),
          "",
        ]
      : []),
    `Full method: [${entry.displayName} methodology](${SITE_URL}/methodology/${entry.slug})`,
  ];
}

function methodologyMarkdown(entry: RegistryEntry): string[] {
  const notes = engineNotesFor(entry);
  const packs = allAuRulePacks.filter((pack) => entry.rulePackDependencies.includes(pack.domain));
  return [
    ...heading(`${entry.displayName} — methodology`),
    entry.seo.description,
    "",
    "## Engines and formulas",
    "",
    ...notes.flatMap(({ engineId, note }) => [
      `### ${engineId} · ${note.name}`,
      "",
      note.method,
      ...(note.formulas.length > 0 ? ["", `Registered formulas: ${note.formulas.join(" · ")}`] : []),
      "",
    ]),
    ...(packs.length > 0
      ? [
          "## Rule packs",
          "",
          "Statutory values come only from versioned, hash-verified rule packs citing official sources.",
          "",
          ...packs.map((pack) => `- ${pack.rulePackId}: ${pack.status} · v${pack.rulesVersion}`),
          "",
        ]
      : []),
    "## Verification",
    "",
    "Engines carry boundary tests at every bracket edge, property-based tests, reconciliation invariants and, where official worked examples exist, tests that reproduce them exactly.",
    "",
    `Calculator: ${SITE_URL}${routePath(entry)}`,
  ];
}

function sourcesMarkdown(): string[] {
  const lines = [
    ...heading(`Sources and rule packs — ${SITE_NAME}`),
    "Every statutory value on this site comes from one of these versioned rule packs. Each records the official document it was prepared from: authority, title, URL, retrieval date and content hash.",
  ];
  for (const pack of allAuRulePacks) {
    lines.push("", `## ${pack.rulePackId}`, "", `Status: ${pack.status} · v${pack.rulesVersion} · effective from ${pack.effectiveFrom}`);
    for (const source of pack.sources) {
      lines.push(`- ${source.authority}: [${source.title}](${source.url}) (retrieved ${source.retrievedAt.slice(0, 10)})`);
    }
  }
  return lines;
}

function changelogMarkdown(): string[] {
  return [
    ...heading(`Changelog — ${SITE_NAME}`),
    "Rule-pack activations, calculator releases and method changes are recorded on the changelog page, and the full commit-level history is public in the repository.",
    "",
    `- [Changelog page](${SITE_URL}/changelog)`,
    "- [Commit history](https://github.com/txc0ld/paymentcals/commits/main)",
  ];
}

function contentPageMarkdown(page: ContentPage): string[] {
  const lines = [...heading(page.title), page.intro];
  for (const section of page.sections) {
    lines.push("", `## ${section.heading}`, "", ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]));
    if (section.links?.length) {
      lines.push(
        ...section.links.map((link) => `- [${link.label}](${link.href.startsWith("/") ? SITE_URL + link.href : link.href})`),
      );
    }
  }
  return lines;
}

export function notFoundMarkdown(path: string): string {
  return [
    "# 404 — no page at this address",
    "",
    `Nothing exists at \`${path}\` on ${SITE_NAME}. Where to look instead:`,
    "",
    `- [All calculators](${SITE_URL}/calculators) — every calculator with its methodology`,
    `- [llms.txt](${SITE_URL}/llms.txt) — a plain-text map of this site for agents`,
    `- [sitemap.xml](${SITE_URL}/sitemap.xml) — every indexable URL`,
    `- [Sources and rule packs](${SITE_URL}/sources)`,
    `- [Home](${SITE_URL}/)`,
    "",
  ].join("\n");
}

/** Markdown body for a path, or null when the path has no page. */
export function renderMarkdownForPath(rawPath: string): string | null {
  const path = rawPath !== "/" && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;

  let lines: string[] | null = null;
  if (path === "/" || path === "") lines = homeMarkdown();
  else if (path === "/calculators") lines = calculatorsIndexMarkdown();
  else if (path === "/sources") lines = sourcesMarkdown();
  else if (path === "/changelog") lines = changelogMarkdown();
  else if (CATEGORY_HUBS[path]) lines = categoryHubMarkdown(path);
  else {
    const contentPage = CONTENT_PAGES.find((page) => page.path === path);
    if (contentPage) lines = contentPageMarkdown(contentPage);
    else if (path.startsWith("/methodology/")) {
      const slug = path.slice("/methodology/".length);
      const entry = calculatorRegistry.find((candidate) => candidate.slug === slug);
      if (entry) lines = methodologyMarkdown(entry);
    } else {
      const entry = calculatorRegistry.find((candidate) => routePath(candidate) === path);
      if (entry) lines = calculatorMarkdown(entry);
    }
  }

  if (!lines) return null;
  return [...lines, ...footerLinks(), ""].join("\n");
}
