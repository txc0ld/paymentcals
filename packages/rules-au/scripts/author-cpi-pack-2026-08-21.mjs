/**
 * Authors au-cpi-quarterly from the archived RBA statistical table G1 CSV
 * (series GCPIAG: Consumer price index, All groups, quarterly). The pack is
 * machine-parsed from the snapshot — no value is typed by hand. Re-run after
 * refreshing the snapshot; then regenerate the integrity manifest.
 *
 *   node scripts/author-cpi-pack-2026-08-21.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const snapshotRef = "compliance-archive/sources/rba/g1-data.2026-08-21.csv";
const snapshotPath = join(repoRoot, snapshotRef);

const raw = readFileSync(snapshotPath);
const contentHash = createHash("sha256").update(raw).digest("hex");
const text = raw.toString("utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/);

const seriesHeader = lines.find((line) => line.startsWith("Series ID"));
if (!seriesHeader) throw new Error("Series ID row not found");
const seriesIds = seriesHeader.split(",");
const column = seriesIds.indexOf("GCPIAG");
if (column < 1) throw new Error("GCPIAG column not found");

const unitsRow = lines.find((line) => line.startsWith("Units"));
const indexReference = unitsRow ? unitsRow.split(",")[column]?.replaceAll('"', "") : null;
if (!indexReference) throw new Error("Units row not found for GCPIAG");

/** Keep the modern era: monthly-CPI-relevant comparisons rarely predate 2000. */
const FROM_YEAR = 2000;
const quarters = [];
for (const line of lines) {
  const match = line.match(/^(\d{2})\/(\d{2})\/(\d{4}),/);
  if (!match) continue;
  const [, dd, mm, yyyy] = match;
  if (Number(yyyy) < FROM_YEAR) continue;
  const value = line.split(",")[column]?.trim();
  if (!value || !/^\d+(\.\d+)?$/.test(value)) continue;
  quarters.push({ date: `${yyyy}-${mm}-${dd}`, index: value });
}
if (quarters.length < 80) throw new Error(`suspiciously few quarters parsed: ${quarters.length}`);

const publicationRow = lines.find((line) => line.startsWith("Publication date"));
const publishedAt = publicationRow ? publicationRow.split(",")[column] : null;

const pack = {
  rulePackId: "au-cpi-quarterly",
  jurisdiction: "AU",
  subdivision: null,
  domain: "cpi",
  effectiveFrom: quarters[0].date,
  effectiveTo: null,
  status: "in_review",
  schemaVersion: 1,
  rulesVersion: "0.1.0",
  sources: [
    {
      sourceId: "rba-g1-cpi-2026-08-21",
      authority: "Reserve Bank of Australia (data: Australian Bureau of Statistics)",
      title: "Statistical table G1 — Consumer Price Inflation",
      url: "https://www.rba.gov.au/statistics/tables/csv/g1-data.csv",
      jurisdiction: "AU",
      domain: "cpi",
      retrievedAt: "2026-08-21T04:00:00Z",
      archivedSnapshotRef: snapshotRef,
      contentHash,
      notes: `Series GCPIAG (${indexReference}), quarterly, machine-parsed from the archived CSV; RBA publication date ${publishedAt ?? "unknown"}. Historic index only — the pack contains no forecasts.`,
    },
  ],
  review: {
    preparedBy: "claude-build-agent",
    approvedBy: null,
    approvedAt: null,
  },
  verifiedAt: null,
  rules: {
    seriesId: "GCPIAG",
    indexReference,
    quarters,
  },
};

const outPath = join(here, "..", "src", "packs", "au-cpi-quarterly.json");
writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n");
console.log(`au-cpi-quarterly written: ${quarters.length} quarters, ${quarters[0].date} → ${quarters[quarters.length - 1].date}`);
console.log(`snapshot sha256 ${contentHash}`);
