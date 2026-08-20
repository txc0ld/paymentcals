// One-shot authoring of the eight stamp-duty packs (run 2026-08-20).
// NSW/QLD/TAS values transcribed from same-day fetches (snapshots + sha256 in
// compliance-archive/sources/state-revenue/). VIC (bot-blocked 403),
// WA (page not found), SA/ACT/NT (client-rendered, no server-side rates)
// are authored as structures with null rules per the Gate 3 protocol.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "packs");
const RETRIEVED = "2026-08-20T22:45:00+08:00";
const ARCHIVE = "compliance-archive/sources/state-revenue";

function src(id, authority, title, url, file, hash, notes) {
  return {
    sourceId: id,
    authority,
    title,
    url,
    jurisdiction: "AU",
    domain: "stamp-duty",
    retrievedAt: RETRIEVED,
    ...(file ? { archivedSnapshotRef: `${ARCHIVE}/${file}` } : {}),
    ...(hash ? { contentHash: hash } : {}),
    ...(notes ? { notes } : {}),
  };
}

function pack(subdivision, sources, rules, extraNote) {
  return {
    rulePackId: `au-stamp-duty-${subdivision.toLowerCase()}`,
    jurisdiction: "AU",
    subdivision,
    domain: "stamp-duty",
    effectiveFrom: "2026-07-01",
    effectiveTo: null,
    status: "in_review",
    schemaVersion: 1,
    rulesVersion: "0.1.0",
    sources,
    review: { preparedBy: "claude-build-agent", approvedBy: null, approvedAt: null },
    verifiedAt: null,
    rules,
    ...(extraNote ? {} : {}),
  };
}

const bracket = (over, upTo, baseAmount, ratePer100) => ({ over, upTo, baseAmount, ratePer100 });

const packs = [
  pack(
    "NSW",
    [
      src(
        "revenue-nsw-transfer-duty-rates-2026-08-20",
        "Revenue NSW",
        "Transfer duty - current thresholds and rates",
        "https://www.revenue.nsw.gov.au/_resources/duties-links/current-thresholds-and-rates",
        "nsw-rates.2026-08-20.html",
        "1f23b707ca19f21a5a2ed64aadb949652cae32566e0992b254701848451da673",
        "General rates. effectiveFrom is the pack window start, not stated on the page [VERIFY]. Confirm NSW per-$100 rounding convention [VERIFY].",
      ),
    ],
    {
      general: {
        brackets: [
          bracket("0", "18000", "0", "1.25"),
          bracket("18000", "38000", "225", "1.50"),
          bracket("38000", "103000", "525", "1.75"),
          bracket("103000", "387000", "1662", "3.50"),
          bracket("387000", "1290000", "11602", "4.50"),
          bracket("1290000", "3870000", "52237", "5.50"),
          bracket("3870000", null, "194137", "7.00"),
        ],
        per100Rounding: "part_thereof_up",
        minimumDuty: "20",
      },
    },
  ),
  pack(
    "QLD",
    [
      src(
        "qro-transfer-duty-rates-2026-08-20",
        "Queensland Revenue Office",
        "Transfer duty rates",
        "https://qro.qld.gov.au/duties/transfer-duty/calculating/rates/",
        "qld.2026-08-20.html",
        "5324d6654f4d79c38b41bb038db3daa63066873cdded49134b64abd3d4f4fc25",
        "General rates ('or part of $100' per the page).",
      ),
    ],
    {
      general: {
        brackets: [
          bracket("0", "5000", "0", "0"),
          bracket("5000", "75000", "0", "1.50"),
          bracket("75000", "540000", "1050", "3.50"),
          bracket("540000", "1000000", "17325", "4.50"),
          bracket("1000000", null, "38025", "5.75"),
        ],
        per100Rounding: "part_thereof_up",
        minimumDuty: null,
      },
    },
  ),
  pack(
    "TAS",
    [
      src(
        "sro-tas-rates-of-duty-2026-08-20",
        "State Revenue Office Tasmania",
        "Property transfer duties - rates of duty",
        "https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty",
        "tas-rates.2026-08-20.html",
        "62fb1e335cfafd8b7062163d49296fbd8c0774afbd0720bf04f239fb0996e732",
        "General rates ('or part' per the page). Not more than $3,000 attracts flat $50.",
      ),
    ],
    {
      general: {
        brackets: [
          bracket("0", "3000", "50", "0"),
          bracket("3000", "25000", "50", "1.75"),
          bracket("25000", "75000", "435", "2.25"),
          bracket("75000", "200000", "1560", "3.50"),
          bracket("200000", "375000", "5935", "4.00"),
          bracket("375000", "725000", "12935", "4.25"),
          bracket("725000", null, "27810", "4.50"),
        ],
        per100Rounding: "part_thereof_up",
        minimumDuty: "50",
      },
    },
  ),
  pack(
    "VIC",
    [
      src(
        "sro-vic-rates-unfetchable-2026-08-20",
        "State Revenue Office Victoria",
        "Land transfer duty current rates (fetch blocked)",
        "https://www.sro.vic.gov.au/land-transfer-duty-current-rates",
        null,
        null,
        "Automated fetch returned HTTP 403 (bot protection). Rules left null; the calculator renders VIC as not yet supported until a human transcribes the official table.",
      ),
    ],
    { general: null },
  ),
  pack(
    "WA",
    [
      src(
        "revenuewa-rates-unfetchable-2026-08-20",
        "RevenueWA",
        "Transfer duty rates (page not located)",
        "https://www.wa.gov.au/organisation/department-of-treasury/revenuewa",
        null,
        null,
        "Known URLs returned HTTP 404 (site restructure). Rules left null; WA renders as not yet supported.",
      ),
    ],
    { general: null },
  ),
  pack(
    "SA",
    [
      src(
        "revenuesa-rates-unfetchable-2026-08-20",
        "RevenueSA",
        "Stamp duty on land calculation page (client-rendered)",
        "https://www.revenuesa.sa.gov.au/stamp-duty-land/calculate-stamp-duty",
        "sa-calc.2026-08-20.html",
        "ef5cfe0ff674301d42383c29f908bf47a2f16ab16f5c434c9ebe637e60ddb595",
        "Page content is rendered client-side; no rate table in the fetched HTML. Rules left null; SA renders as not yet supported.",
      ),
    ],
    { general: null },
  ),
  pack(
    "ACT",
    [
      src(
        "act-revenue-rates-unfetchable-2026-08-20",
        "ACT Revenue Office",
        "Conveyance duty page (client-rendered)",
        "https://www.revenue.act.gov.au/duties/conveyance-duty",
        "act.2026-08-20.html",
        "2ff8fc039d0854ae2ab6066fed6a719296f69897f99814d3691d459854c40a52",
        "Rate tables not present in the fetched HTML. Rules left null; ACT renders as not yet supported.",
      ),
    ],
    { general: null },
  ),
  pack(
    "NT",
    [
      src(
        "nt-revenue-rates-unfetchable-2026-08-20",
        "Northern Territory Revenue Office",
        "Stamp duty pages (formula not present in fetched HTML)",
        "https://nt.gov.au/property/buying-and-selling-a-home/stamp-duty",
        "nt.2026-08-20.html",
        "037a80a0366210eb54d5e27915cc270a5d9555e566423024f21c1eae962e6735",
        "The NT conveyance formula (quadratic below the threshold) was not present in fetched pages and also does not fit the bracket schema; NT renders as not yet supported pending schema extension and human transcription.",
      ),
    ],
    { general: null },
  ),
];

for (const p of packs) {
  writeFileSync(join(packsDir, `${p.rulePackId}.json`), JSON.stringify(p, null, 2) + "\n");
  console.log("wrote", p.rulePackId);
}
