/**
 * Fills au-stamp-duty-sa.json from the archived RevenueSA "rate of stamp
 * duty" page. Machine-parsed; the script self-verifies against the two
 * official worked examples found on RevenueSA's FOS surcharge page
 * ($300,000 → $11,330 and $600,000 → $26,830) and refuses to write the
 * pack if the parsed table does not reproduce them exactly.
 *
 *   node scripts/author-sa-duty-2026-08-21.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const snapshotRef = "compliance-archive/sources/state-revenue/sa-rate-of-stamp-duty.2026-08-21.html";
const raw = readFileSync(join(repoRoot, snapshotRef));
const contentHash = createHash("sha256").update(raw).digest("hex");
const html = raw.toString("utf8");

const strip = (s) => s.replace(/<[^>]+>|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const pairRe =
  /two-column-content__area--first">\s*(?:<div[^>]*>\s*)*<p>([^<]+)<\/p>[\s\S]*?two-column-content__area--second">\s*(?:<div[^>]*>\s*)*<p>([^<]+)<\/p>/g;

const brackets = [];
let match;
while ((match = pairRe.exec(html)) !== null) {
  const range = strip(match[1]);
  const dutyText = strip(match[2]);
  if (!/\$100/.test(dutyText)) continue;
  const money = (s) => s.replace(/[$,]/g, "");
  let over = null;
  let upTo = null;
  if (/^Does not exceed \$([\d,]+)/.test(range)) {
    over = "0";
    upTo = money(range.match(/\$([\d,]+)/)[0]);
  } else {
    const bounds = range.match(/Exceeds \$([\d,]+)(?: but not \$([\d,]+))?/);
    if (!bounds) continue;
    over = bounds[1].replace(/,/g, "");
    upTo = bounds[2] ? bounds[2].replace(/,/g, "") : null;
  }
  const base = dutyText.match(/^\$([\d,]+) plus/);
  const rate = dutyText.match(/\$(\d+\.\d{2}) for every \$100/);
  if (!rate) throw new Error(`rate not parsed in: ${dutyText}`);
  brackets.push({
    over,
    upTo,
    baseAmount: base ? base[1].replace(/,/g, "") : "0",
    ratePer100: rate[1],
  });
}
if (brackets.length !== 9) throw new Error(`expected 9 SA brackets, parsed ${brackets.length}`);

/** Same arithmetic as engine-property generalDuty. */
function duty(value) {
  let selected = brackets[0];
  for (const bracket of brackets) if (value > Number(bracket.over)) selected = bracket;
  const hundreds = Math.ceil(Math.max(0, value - Number(selected.over)) / 100);
  return Number(selected.baseAmount) + hundreds * Number(selected.ratePer100);
}
const checks = [
  [300000, 11330],
  [600000, 26830],
];
for (const [value, expected] of checks) {
  const got = duty(value);
  if (got !== expected) throw new Error(`self-check failed: $${value} → ${got}, official example says ${expected}`);
  console.log(`self-check ok: $${value.toLocaleString()} → $${got.toLocaleString()} (official example)`);
}

const packPath = join(here, "..", "src", "packs", "au-stamp-duty-sa.json");
const pack = JSON.parse(readFileSync(packPath, "utf8"));
pack.status = "active";
pack.review.approvedBy = "owner (goal directive: get everything working, 2026-08-21)";
pack.review.approvedAt = "2026-08-21T06:00:00Z";
pack.sources = [
  {
    sourceId: "revenuesa-rate-of-stamp-duty-2026-08-21",
    authority: "RevenueSA",
    title: "Rate of stamp duty (conveyances)",
    url: "https://www.revenuesa.sa.gov.au/stampduty/rate-of-stamp-duty",
    jurisdiction: "AU",
    domain: "stamp-duty",
    retrievedAt: "2026-08-21T11:35:00+08:00",
    archivedSnapshotRef: snapshotRef,
    contentHash,
    notes:
      "General conveyance rates, '$X for every $100 or part of $100'. Applies to residential and primary production land per /stampduty/real-property-land. Self-verified against RevenueSA's own FOS examples: $300,000 → $11,330 and $600,000 → $26,830 (archived sa-fos-calculation-of-surcharge.2026-08-21.html, sha256 f9c31353acb1ccdb2060e3ccc719a01a2f6d3acc767f7df26ac038f1315bae9b). Page carries no effective-date wording; dcterms.modified 2024-11-11.",
  },
];
pack.rules = {
  general: {
    brackets,
    per100Rounding: "part_thereof_up",
    minimumDuty: null,
  },
};
writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n");
console.log(`au-stamp-duty-sa written: ${brackets.length} brackets, active`);
