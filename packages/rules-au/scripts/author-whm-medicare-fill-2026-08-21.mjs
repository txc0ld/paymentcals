/**
 * Fills the null WHM bracket tables (FY2024-25, FY2025-26) and the null
 * Medicare low-income thresholds (FY2024-25) from archived ATO pages.
 * Machine-parsed with cumulative-base self-checks; throws on any mismatch.
 * The FY2026-27 foreign-resident brackets and FY2026-27 Medicare thresholds
 * remain null: the ATO has not published them (see VERIFICATION-QUEUE.md).
 *
 *   node scripts/author-whm-medicare-fill-2026-08-21.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const strip = (s) =>
  s
    .replace(/&ndash;|\\u0026ndash;/g, "–")
    .replace(/&#8211;/g, "–")
    .replace(/<[^>]+>|&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const load = (ref) => {
  const buf = readFileSync(join(repoRoot, ref));
  return { text: strip(buf.toString("utf8")), hash: sha256(buf) };
};

function updatePack(file, mutate) {
  const path = join(here, "..", "src", "packs", file);
  const pack = JSON.parse(readFileSync(path, "utf8"));
  mutate(pack);
  writeFileSync(path, JSON.stringify(pack, null, 2) + "\n");
  console.log(`${pack.rulePackId}: updated`);
}

/* ------------------------------------------------- WHM 2024-25 / 2025-26 */
const whmRef = "compliance-archive/sources/ato/whm-rates.2026-08-21.html";
const whm = load(whmRef);
function parseWhm(caption) {
  /* The page embeds each table several times (visible HTML plus JSON blobs);
   * try every caption occurrence and accept the first window that yields a
   * fully self-consistent 4-bracket ascending table. */
  const starts = [];
  for (let i = whm.text.indexOf(caption); i >= 0; i = whm.text.indexOf(caption, i + 1)) starts.push(i);
  if (starts.length === 0) throw new Error(`WHM caption not found: ${caption}`);
  let lastError = null;
  for (const at of starts) {
    try {
      const next = whm.text.indexOf("Working holiday maker tax rates", at + caption.length);
      const seg = whm.text.slice(at, next > at ? Math.min(next, at + 900) : at + 900);
      const parsed = parseWhmSegment(seg);
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function parseWhmSegment(seg) {
  const rows = [...seg.matchAll(/(?:0 – \$([\d,]+) (\d+)c for each \$1(?! over)|\$([\d,]+) – \$([\d,]+) \$([\d,]+) plus (\d+)c for each \$1 over \$([\d,]+)|\$([\d,]+) and over \$([\d,]+) plus (\d+)c for each \$1 over \$([\d,]+))/g)];
  const brackets = [];
  let expectedBase = 0;
  for (const row of rows) {
    if (row[1]) {
      brackets.push({ over: "0", upTo: row[1].replace(/,/g, ""), rate: `0.${row[2]}` });
    } else if (row[3]) {
      const over = row[7].replace(/,/g, "");
      const base = Number(row[5].replace(/,/g, ""));
      const prev = brackets[brackets.length - 1];
      expectedBase += (Number(prev.upTo) - Number(prev.over)) * Number(prev.rate);
      if (base !== expectedBase) throw new Error(`WHM base mismatch at ${over}: page ${base}, cumulative ${expectedBase}`);
      brackets.push({ over, upTo: row[4].replace(/,/g, ""), rate: `0.${row[6]}` });
    } else {
      const over = row[11].replace(/,/g, "");
      const base = Number(row[9].replace(/,/g, ""));
      const prev = brackets[brackets.length - 1];
      expectedBase += (Number(prev.upTo) - Number(prev.over)) * Number(prev.rate);
      if (base !== expectedBase) throw new Error(`WHM top base mismatch: page ${base}, cumulative ${expectedBase}`);
      brackets.push({ over, upTo: null, rate: `0.${row[10]}` });
    }
  }
  if (brackets.length !== 4) throw new Error(`WHM segment: expected 4 brackets, got ${brackets.length}`);
  for (let i = 0; i + 1 < brackets.length; i++) {
    if (Number(brackets[i + 1].over) !== Number(brackets[i].upTo)) {
      throw new Error(`WHM segment: brackets not contiguous at index ${i}`);
    }
  }
  console.log(`WHM table: 4 contiguous brackets, cumulative bases verified`);
  return brackets;
}
const whmSource = (fy) => ({
  sourceId: `ato-whm-rates-${fy}-2026-08-21`,
  authority: "Australian Taxation Office",
  title: `Tax rates – working holiday maker (${fy} table)`,
  url: "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers",
  jurisdiction: "AU",
  domain: "income-tax",
  retrievedAt: "2026-08-21T12:10:00+08:00",
  archivedSnapshotRef: whmRef,
  contentHash: whm.hash,
  notes: `Working holiday maker tax rates ${fy}, machine-parsed; the page's cumulative bases reproduce exactly from the bracket rates.`,
});
updatePack("au-income-tax-2024-25.json", (pack) => {
  pack.rules.workingHolidayMaker = parseWhm("Working holiday maker tax rates 2024–25");
  pack.sources.push(whmSource("2024–25"));
});
updatePack("au-income-tax-2025-26.json", (pack) => {
  pack.rules.workingHolidayMaker = parseWhm("Working holiday maker tax rates 2025–26");
  pack.sources.push(whmSource("2025–26"));
});

/* ---------------------------------------------------- Medicare 2024-25 */
const mytaxRef = "compliance-archive/sources/ato/medicare-mytax-2025.2026-08-21.html";
const familyRef = "compliance-archive/sources/ato/medicare-family-2024-25.wayback-20250919.2026-08-21.html";
const mytax = load(mytaxRef);
const family = load(familyRef);

const grab = (text, re, label) => {
  const m = text.match(re);
  if (!m) throw new Error(`medicare value not found: ${label}`);
  return m[1].replace(/,/g, "");
};
const single = {
  lower: grab(mytax.text, /All other taxpayers \$([\d,]+)/, "single lower"),
  upper: grab(mytax.text, /All other taxpayers \$[\d,]+ \$([\d,]+)/, "single upper"),
  phaseInRate: "0.10",
  saptoLower: grab(mytax.text, /seniors and pensioners tax offset \$([\d,]+)/, "sapto lower"),
  saptoUpper: grab(mytax.text, /seniors and pensioners tax offset \$[\d,]+ \$([\d,]+)/, "sapto upper"),
};
const fam = {
  lower: grab(family.text, /lower family income threshold is either: \$([\d,]+)/, "family lower"),
  saptoLower: grab(family.text, /\$([\d,]+) if you're entitled to the SAPTO/, "family sapto lower"),
  perDependentChildLowerIncrease: grab(family.text, /lower family income threshold increases by \$([\d,]+)/, "per-child lower"),
  upper: grab(family.text, /upper family income threshold is either: \$([\d,]+)/, "family upper"),
  saptoUpper: grab(family.text, /\$([\d,]+) if you're entitled to SAPTO/, "family sapto upper"),
  perDependentChildUpperIncrease: grab(family.text, /upper income threshold increases by \$([\d,]+)/, "per-child upper"),
};
// Consistency: every upper equals floor(lower / 0.8) (10c-per-$ phase-in).
for (const [lo, hi, label] of [
  [single.lower, single.upper, "single"],
  [single.saptoLower, single.saptoUpper, "single sapto"],
  [fam.lower, fam.upper, "family"],
  [fam.saptoLower, fam.saptoUpper, "family sapto"],
]) {
  const expected = Math.floor(Number(lo) / 0.8);
  if (Math.abs(expected - Number(hi)) > 1) throw new Error(`medicare ${label}: upper ${hi} vs floor(lower/0.8)=${expected}`);
}
console.log("Medicare 2024-25: thresholds parsed, upper = floor(lower ÷ 0.8) verified on all four pairs");

updatePack("au-medicare-2024-25.json", (pack) => {
  pack.rules.lowIncomeSingle = single;
  pack.rules.lowIncomeFamily = {
    lower: fam.lower,
    upper: fam.upper,
    saptoLower: fam.saptoLower,
    saptoUpper: fam.saptoUpper,
    perDependentChildLowerIncrease: fam.perDependentChildLowerIncrease,
    perDependentChildUpperIncrease: fam.perDependentChildUpperIncrease,
  };
  pack.sources.push(
    {
      sourceId: "ato-mytax2025-medicare-2026-08-21",
      authority: "Australian Taxation Office",
      title: "myTax 2025 — Medicare levy reduction or exemption (2024-25 thresholds)",
      url: "https://www.ato.gov.au/individuals-and-families/your-tax-return/instructions-to-complete-your-tax-return/mytax-instructions/2025/medicare-and-private-health-insurance/medicare-levy-reduction-or-exemption",
      jurisdiction: "AU",
      domain: "medicare",
      retrievedAt: "2026-08-21T12:15:00+08:00",
      archivedSnapshotRef: mytaxRef,
      contentHash: mytax.hash,
      notes: "Table 2 single thresholds for 2024-25; family upper limits corroborated by the same page's Worksheet 2.",
    },
    {
      sourceId: "ato-family-2024-25-wayback-2026-08-21",
      authority: "Australian Taxation Office (via web.archive.org capture 2025-09-19)",
      title: "Medicare levy reduction — family income (2024-25)",
      url: "https://web.archive.org/web/20250919061603id_/https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income",
      jurisdiction: "AU",
      domain: "medicare",
      retrievedAt: "2026-08-21T12:15:00+08:00",
      archivedSnapshotRef: familyRef,
      contentHash: family.hash,
      notes: "Wayback capture of the official ATO family page ('Last updated 12 June 2025', states 2024-25). Figures corroborated by the live myTax 2025 worksheet and the floor(lower ÷ 0.8) phase-in identity.",
    },
  );
});
console.log("Done.");
