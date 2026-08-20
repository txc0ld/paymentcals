import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";

/** §24.10 answer-engine surface: a plain-text map for LLM crawlers. */
export function GET(): Response {
  const lines = [
    "# PaymentCalcs",
    "",
    "Deterministic Australian financial calculators. Every result shows its working,",
    "assumptions, sources and limitations. Statutory values come from versioned rule",
    "packs citing official sources (ATO and state revenue offices) and are never",
    "hard-coded. Results are general information, not financial advice.",
    "",
    "## Calculators",
    ...calculatorRegistry.map(
      (entry) => `- [${entry.displayName}](https://paymentcalcs.com${routePath(entry)}): ${entry.seo.description}`,
    ),
    "",
    "## Method",
    ...calculatorRegistry.map(
      (entry) => `- [${entry.displayName} methodology](https://paymentcalcs.com/methodology/${entry.slug})`,
    ),
    "",
    "## Governance",
    "- [Sources and rule packs](https://paymentcalcs.com/sources)",
    "- [Changelog](https://paymentcalcs.com/changelog)",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
