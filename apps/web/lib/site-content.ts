/**
 * Copy for the trust and developer pages, kept as data so the HTML pages and
 * the markdown representations served to agents render the same words from
 * one source. Result-surface language rules still apply: no advice verbs.
 */

export const GITHUB_URL = "https://github.com/txc0ld/paymentcals";
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
};

export type ContentPage = {
  path: string;
  title: string;
  description: string;
  intro: string;
  sections: ContentSection[];
};

export const ABOUT_PAGE: ContentPage = {
  path: "/about",
  title: "About PaymentCalcs",
  description:
    "What PaymentCalcs is, how its calculators are built, and the rules the project holds itself to.",
  intro:
    "PaymentCalcs is an independent Australian project that builds deterministic financial calculators: pay, tax, mortgage, property, loan, savings and small-business arithmetic. Every result renders its full working — formulas, intermediate values, assumptions, sources and limitations — beside the number.",
  sections: [
    {
      heading: "How the numbers are produced",
      paragraphs: [
        "No statutory value is written from memory. Every rate, threshold and bracket lives in a versioned rule pack that records the official document it came from — source URL, publishing authority, retrieval date and a content hash of the retrieved document — so any figure on the site can be traced back to its source.",
        "Calculation engines are pure functions of the request and the rule packs. They perform no network access and read no clock, so the same inputs against the same pack versions always produce the same result. Money is held in integer cents; rate arithmetic uses decimal maths, never floating point.",
        "If a verified rule pack cannot be resolved for the selected jurisdiction and date, the calculator says so and stops. It never substitutes another year's rules, another state's rates, or a plausible number. No large language model takes part in any calculation path.",
      ],
      links: [
        { label: "Sources and rule packs", href: "/sources" },
        { label: "Per-calculator methodology", href: "/calculators" },
      ],
    },
    {
      heading: "What the results are",
      paragraphs: [
        "Results are general information calculated from your inputs and published rules. They are not financial advice, not a quote, and not a substitute for the official calculators run by the ATO or state revenue offices. Concession and eligibility decisions rest with the relevant authority, not with this site.",
      ],
    },
    {
      heading: "Who runs it",
      paragraphs: [
        "PaymentCalcs is built and operated independently in Australia. The full source code, rule packs and change history are public on GitHub, so the working behind the working is inspectable too.",
      ],
      links: [{ label: "Source code on GitHub", href: GITHUB_URL }],
    },
  ],
};

export const CONTACT_PAGE: ContentPage = {
  path: "/contact",
  title: "Contact",
  description: "How to reach PaymentCalcs: corrections, bug reports and questions about the numbers.",
  intro:
    "PaymentCalcs is an open project and the fastest route to a human is the public issue tracker. Every report is visible, and so is what happened to it.",
  sections: [
    {
      heading: "Report a wrong number",
      paragraphs: [
        "If a figure looks wrong, open an issue with the calculator name, your inputs, the result you saw and — ideally — a link to the official source you compared against. A discrepancy against an official ATO or state revenue office figure is treated as a release-gating bug, not a cosmetic one.",
      ],
      links: [{ label: "Open an issue on GitHub", href: GITHUB_ISSUES_URL }],
    },
    {
      heading: "Questions about method",
      paragraphs: [
        "Each calculator publishes a methodology page describing its engines, formulas and rule packs, and the sources page lists every official document the rule packs cite. Most questions about how a number was produced are answered there; anything still unclear is a documentation bug worth an issue.",
      ],
      links: [
        { label: "All calculators and their methodology", href: "/calculators" },
        { label: "Sources and rule packs", href: "/sources" },
      ],
    },
    {
      heading: "Everything else",
      paragraphs: [
        "General enquiries, media and partnership questions also go through the issue tracker for now; a direct email address is planned. The project does not run social media accounts, and anyone claiming to represent PaymentCalcs elsewhere does not.",
      ],
    },
  ],
};

export const PRIVACY_PAGE: ContentPage = {
  path: "/privacy",
  title: "Privacy",
  description:
    "What PaymentCalcs does and does not collect: client-side calculation, browser-only storage, cookieless analytics.",
  intro:
    "PaymentCalcs is built so that your financial details stay on your device. There are no accounts, no server-side storage of your inputs, and no advertising.",
  sections: [
    {
      heading: "Your inputs and scenarios",
      paragraphs: [
        "Calculations run entirely in your browser. The numbers you type are not sent to a server to be computed and are not stored by the site's operators.",
        "Saved scenarios are written to your browser's local storage (IndexedDB) on your device only. Deleting your browser data deletes them; there is no copy anywhere else.",
        "The share feature encodes a scenario into the link itself. A shared link carries those inputs to whoever you give it to — sharing is always your explicit action.",
      ],
    },
    {
      heading: "Analytics",
      paragraphs: [
        "In production the site measures page visits with Plausible and Ahrefs Analytics, which are cookieless, and Google Analytics 4, which sets cookies to tell repeat visits apart. There is no account identity to join any of this to.",
        "Custom analytics events pass through an allowlist layer that rejects any property carrying a money amount, income, balance, rate-as-personal-fact, age or free text — this rejection is enforced by tests. Plausible receives the page path only. Ahrefs Analytics and Google Analytics record the page address as the browser reports it, which can include a scenario string when you open a shared link.",
      ],
    },
    {
      heading: "What does not exist here",
      paragraphs: [
        "No accounts or sign-in. No advertising or ad trackers. No sale or sharing of personal information. No server-side database of user data — there is nothing to breach and nothing to subpoena.",
        "Questions about this policy go through the public issue tracker.",
      ],
      links: [{ label: "Contact", href: "/contact" }],
    },
  ],
};

export const DEVELOPERS_PAGE: ContentPage = {
  path: "/developers",
  title: "PaymentCalcs for developers and agents",
  description:
    "Machine-readable surfaces of PaymentCalcs: llms.txt, markdown content negotiation, sitemap, structured data and the open-source repository.",
  intro:
    "PaymentCalcs publishes its content in machine-readable forms so AI agents and developers can read the same numbers, methods and caveats people see — without scraping rendered HTML.",
  sections: [
    {
      heading: "When to use PaymentCalcs",
      paragraphs: [
        "Reach for PaymentCalcs when a task needs deterministic Australian money arithmetic with a citable method: income tax and take-home pay by financial year, PAYG withholding by pay frequency, stamp duty by state, mortgage and loan schedules, savings projections from explicit inputs, and GST arithmetic. Every result can be reproduced from its stated inputs, rule-pack versions and formulas.",
        "It is the wrong tool for financial advice, product recommendations, lender pricing, superannuation projections, or jurisdictions outside Australia (except the general-purpose savings calculators).",
      ],
    },
    {
      heading: "Machine-readable surfaces",
      paragraphs: [
        "llms.txt describes every calculator, the calculation guarantees and the coverage boundaries in plain markdown.",
        "Every page on this site is also available as markdown via HTTP content negotiation: request any page URL with an Accept: text/markdown header and the response is text/markdown with Vary: Accept, per acceptmarkdown.com. Requests whose Accept header matches neither HTML nor markdown receive 406.",
        "Nonexistent paths return a real HTTP 404 whose body points at the sitemap and llms.txt. The homepage carries Organization, WebSite and WebApplication JSON-LD.",
      ],
      links: [
        { label: "llms.txt", href: "/llms.txt" },
        { label: "sitemap.xml", href: "/sitemap.xml" },
        { label: "Sources and rule packs", href: "/sources" },
      ],
    },
    {
      heading: "Source code",
      paragraphs: [
        "The entire site is open source: engines, rule packs, tests and this page. The rule-pack format — source URL, authority, retrieval date, content hash, review status — is documented in the repository, and every pack's provenance is listed on the sources page.",
        "There is no public HTTP API and no first-party MCP server yet. If you build against the repository's engines directly, pin a commit: rule packs change when the law does.",
      ],
      links: [{ label: "github.com/txc0ld/paymentcals", href: GITHUB_URL }],
    },
  ],
};

export const CONTENT_PAGES: ContentPage[] = [ABOUT_PAGE, CONTACT_PAGE, PRIVACY_PAGE, DEVELOPERS_PAGE];
