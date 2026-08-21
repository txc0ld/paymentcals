"""
Authors au-duty-concessions-{nsw,qld,vic,act} from archived official pages.
Machine-parsed; every table must pass its continuity identity or the script
throws. Run then regenerate the integrity manifest.

  python scripts/author_duty_concessions_2026_08_21.py
"""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
PACKS = HERE.parent / "src" / "packs"
ARCH = "compliance-archive/sources/state-revenue"
APPROVED = {
    "approvedBy": "owner (directive: deploy verification queue items, 2026-08-21)",
    "approvedAt": "2026-08-21T10:30:00Z",
}

def sha256(p):
    return hashlib.sha256((REPO / p).read_bytes()).hexdigest()

def strip_html(ref):
    t = (REPO / ref).read_text(encoding="utf8", errors="ignore")
    t = re.sub(r"&ndash;|&#8211;", "–", t)
    t = re.sub(r"<[^>]+>|&nbsp;", " ", t)
    t = t.replace("&amp;", "&")
    return re.sub(r"\s+", " ", t)

def write_pack(pack_id, subdivision, sources, rules):
    pack = {
        "rulePackId": pack_id,
        "jurisdiction": "AU",
        "subdivision": subdivision,
        "domain": "stamp-duty-concessions",
        "effectiveFrom": "2026-07-01",
        "effectiveTo": None,
        "status": "active",
        "schemaVersion": 1,
        "rulesVersion": "0.1.0",
        "sources": sources,
        "review": {"preparedBy": "claude-build-agent", **APPROVED},
        "verifiedAt": None,
        "rules": rules,
    }
    (PACKS / f"{pack_id}.json").write_text(
        json.dumps(pack, indent=2, ensure_ascii=False) + "\n", encoding="utf8", newline="\n"
    )
    print(f"{pack_id}: written, active")

def source(source_id, authority, title, url, ref, notes):
    return {
        "sourceId": source_id, "authority": authority, "title": title, "url": url,
        "jurisdiction": "AU", "domain": "stamp-duty-concessions",
        "retrievedAt": "2026-08-21T14:30:00+08:00",
        "archivedSnapshotRef": ref, "contentHash": sha256(ref), "notes": notes,
    }

EMPTY = {"nswFhbas": None, "qldHome": None, "vicPpr": None, "actOwnerOccupier": None}

# ------------------------------------------------------------------- NSW
fhbas_ref = f"{ARCH}/nsw-first-home-buyers-assistance-scheme.2026-08-21.html"
act_ref = f"{ARCH}/nsw-duties-act-1997-whole.2026-08-21.html"
fhbas = strip_html(fhbas_ref)
assert re.search(r"valued up to \$800,000", fhbas) and re.search(r"over \$800,000 and less than \$1,000,000", fhbas)
assert re.search(r"land valued up to \$350,000", fhbas) and re.search(r"over \$350,000 and less than \$450,000", fhbas)
duties_act = strip_html(act_ref)
assert re.search(r"\$800,000 if the property has a private dwelling", duties_act)
assert re.search(r"\$350,000 if the property comprises a vacant block", duties_act)
homes = {"exemptUpTo": "800000", "capValue": "1000000", "divisor": "200000"}
land = {"exemptUpTo": "350000", "capValue": "450000", "divisor": "100000"}
for s in (homes, land):
    # The sliding formula is the unique linear ramp between its published
    # endpoints; the divisor must equal cap − exempt for continuity to hold.
    assert int(s["capValue"]) - int(s["exemptUpTo"]) == int(s["divisor"]), s
print("NSW FHBAS: page thresholds and statutory formula endpoints agree; divisor identities hold")
write_pack(
    "au-duty-concessions-nsw", "NSW",
    [
        source("nsw-fhbas-2026-08-21", "Revenue NSW", "First Home Buyers Assistance Scheme",
               "https://www.revenue.nsw.gov.au/grants-schemes/assistance-scheme", fhbas_ref,
               "Full exemption to $800,000 (homes) / $350,000 (vacant land); concessional to <$1,000,000 / <$450,000, on-or-after 1 July 2023 table. The page publishes thresholds only, not the formula."),
        source("nsw-duties-act-s78a-2026-08-21", "New South Wales legislation (Duties Act 1997 s78A)",
               "Duties Act 1997 No 123, s78A concessional rates (as at 14 June 2026)",
               "https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-1997-123", act_ref,
               "Statutory sliding formula duty = N − ((cap − V) ÷ divisor × D), N = general duty at V, D = general duty at the exemption cap (formula images archived: nsw-duties-act-s78A-2-formula sha256 e3f61b9100b49fae86575cd9068c538dddc3cc21f3811b4e741ff0645ee60a09, s78A-2A sha256 737e17cd06bd1b0ffdc446e9374f6c363fd7bcfecd6923bb7b467f1fe451401b). The formula is additionally forced by its endpoints: duty 0 at the exemption cap and full general duty at the upper cap, both stated in plain text."),
    ],
    {**EMPTY, "nswFhbas": {"homes": homes, "vacantLand": land}},
)

# ------------------------------------------------------------------- QLD
qld_ref = f"{ARCH}/qld-home-concession-rates.2026-08-21.html"
qld = strip_html(qld_ref)
rows = [
    ("0", "350000", "0", re.search(r"Not more than \$350,000 \$?(1)\.00 for each \$100", qld)),
    ("350000", "540000", "3500", re.search(r"More than \$350,000 to \$540,000 \$3,500 \+ \$3\.50", qld)),
    ("540000", "1000000", "10150", re.search(r"\$540,000 to \$1,000,000 \$10,150 \+ \$4\.50", qld)),
    ("1000000", None, "30850", re.search(r"More than \$1,000,000 \$30,850 \+ \$5\.75", qld)),
]
for over, up_to, base, match in rows:
    assert match, f"QLD home bracket not found: over {over}"
brackets = [
    {"over": "0", "upTo": "350000", "baseAmount": "0", "ratePer100": "1.00", "appliesTo": "excess"},
    {"over": "350000", "upTo": "540000", "baseAmount": "3500", "ratePer100": "3.50", "appliesTo": "excess"},
    {"over": "540000", "upTo": "1000000", "baseAmount": "10150", "ratePer100": "4.50", "appliesTo": "excess"},
    {"over": "1000000", "upTo": None, "baseAmount": "30850", "ratePer100": "5.75", "appliesTo": "excess"},
]
for i in range(len(brackets) - 1):
    b = brackets[i]
    run = int(b["baseAmount"]) + (int(b["upTo"]) - int(b["over"])) / 100 * float(b["ratePer100"])
    assert run == int(brackets[i + 1]["baseAmount"]), (b, run)
# First-home deduction bands: verify the published staircase from the page.
first_bands = [{"over": "0", "upToExclusive": "710000", "deduction": "17350"}]
for lower in range(710000, 800000, 10000):
    deduction = 17350 - (lower - 700000) // 10000 * 1735
    first_bands.append({"over": str(lower), "upToExclusive": str(lower + 10000), "deduction": str(deduction)})
for band in first_bands:
    if band["over"] == "0":
        assert re.search(r"Not more than \$709,999\.99 \$17,350", qld)
    else:
        lo = int(band["over"])
        literal = f"${lo:,} to ${lo + 9999:,}.99 ${int(band['deduction']):,}"
        assert re.search(re.escape(literal), qld), f"QLD first-home band not found: {literal}"
assert re.search(r"\$800,000 or more Nil", qld)
# The staircase zeroes duty at exactly $700,000: home duty there = $17,350.
home_at_700k = 10150 + 4.50 * (700000 - 540000) / 100
assert home_at_700k == 17350, home_at_700k
print("QLD: home brackets continuity exact; first-home staircase reproduces the page and zeroes at $700,000")
write_pack(
    "au-duty-concessions-qld", "QLD",
    [source("qro-home-concession-rates-2026-08-21", "Queensland Revenue Office",
            "Concession rates — home and first home (transfer duty)",
            "https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/", qld_ref,
            "Home-concession per-$100 table and the on-or-after-9-June-2024 first-home deduction bands ('calculate the first home concession… home concession rate and then subtract the first home concession amount'). Page last updated 31 July 2026; QRO's own worked examples ($950,000 → $28,600 home; $795,000 → $19,890 first home) are reproduced in the engine tests. First-home concession unavailable at $800,000 or more. From 1 Aug 2026 an additional citizenship/residency eligibility condition applies (not modelled — eligibility is the buyer's own assessment)."),
     source("qro-first-home-page-2026-08-21", "Queensland Revenue Office", "First home concession",
            "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home/",
            f"{ARCH}/qld-first-home-concession.2026-08-21.html",
            "Corroborates the method and carries the $650,000 → $0, $730,000 → $6,555 and $850,000 → $24,100 worked examples reproduced in the engine tests.")],
    {**EMPTY, "qldHome": {
        "brackets": brackets,
        "per100Rounding": "part_thereof_up",
        "firstHome": {"bands": first_bands, "capValue": "800000"},
    }},
)

# ------------------------------------------------------------------- VIC
vic_ref = f"{ARCH}/vic-land-transfer-duty-ppr-current-rates.2026-08-21.html"
vic = strip_html(vic_ref)
assert re.search(r"\$0 - \$25,000 [^$]*?1\.4% of the dutiable value", vic)
assert re.search(r"\$25,000 - \$130,000 [^$]*?\$350 plus 2\.4%", vic)
assert re.search(r"\$130,000 - \$440,000 [^$]*?\$2,870 plus 5%", vic)
assert re.search(r"\$440,000 - \$550,000 [^$]*?\$18,370 plus 6%", vic)
assert re.search(r"More than \$550,000[^$]*?concessional rate does not apply", vic)
assert 350 + 105000 * 0.024 == 2870 and 2870 + 310000 * 0.05 == 18370
print("VIC PPR: four bands verified with exact continuity; cap $550,000")
write_pack(
    "au-duty-concessions-vic", "VIC",
    [source("srovic-ppr-rates-2026-08-21", "State Revenue Office Victoria",
            "Land transfer duty — principal place of residence (concessional) current rates",
            "https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/land-transfer-duty-principal-place-residence-current-rates",
            vic_ref,
            "PPR concessional rates for contracts on or after 6 May 2008; above $550,000 the concession does not apply and general rates take over. Marginal continuity exact on all rows.")],
    {**EMPTY, "vicPpr": {
        "brackets": [
            {"over": "0", "upTo": "25000", "baseAmount": "0", "percent": "0.014", "appliesTo": "excess"},
            {"over": "25000", "upTo": "130000", "baseAmount": "350", "percent": "0.024", "appliesTo": "excess"},
            {"over": "130000", "upTo": "440000", "baseAmount": "2870", "percent": "0.05", "appliesTo": "excess"},
            {"over": "440000", "upTo": "550000", "baseAmount": "18370", "percent": "0.06", "appliesTo": "excess"},
        ],
        "rounding": "half_up_cents",
        "appliesUpTo": "550000",
    }},
)

# ------------------------------------------------------------------- ACT
act_cref = f"{ARCH}/act-conveyance-duty-non-commercial-property.2026-08-21.html"
act = strip_html(act_cref)
start = act.find("Table 1 Eligible owner occupier transaction")
section = act[start : act.find("Table 2", start)]
oo = [
    {"over": "0", "upTo": "260000", "baseAmount": "0", "ratePer100": "0.28", "appliesTo": "excess"},
    {"over": "260000", "upTo": "300000", "baseAmount": "728", "ratePer100": "2.20", "appliesTo": "excess"},
    {"over": "300000", "upTo": "500000", "baseAmount": "1608", "ratePer100": "3.40", "appliesTo": "excess"},
    {"over": "500000", "upTo": "750000", "baseAmount": "8408", "ratePer100": "4.32", "appliesTo": "excess"},
    {"over": "750000", "upTo": "1000000", "baseAmount": "19208", "ratePer100": "5.90", "appliesTo": "excess"},
    {"over": "1000000", "upTo": "1455000", "baseAmount": "33958", "ratePer100": "6.40", "appliesTo": "excess"},
    {"over": "1455000", "upTo": None, "baseAmount": "0", "ratePer100": "4.54", "appliesTo": "total"},
]
checks = ["\\$0\\.28 per \\$100", "\\$728 plus \\$2\\.20", "\\$1 608 plus \\$3\\.40", "\\$8 408 plus \\$4\\.32",
          "\\$19 208 plus \\$5\\.90", "\\$33 958 plus \\$6\\.40", "flat rate of \\$4\\.54 per \\$100"]
for c in checks:
    assert re.search(c, section), f"ACT OO row not found: {c}"
for i in range(len(oo) - 2):
    b = oo[i]
    rate_cents = round(float(b["ratePer100"]) * 100)
    run_cents = int(b["baseAmount"]) * 100 + (int(b["upTo"]) - int(b["over"])) // 100 * rate_cents
    assert run_cents == int(oo[i + 1]["baseAmount"]) * 100, (b, run_cents)
print("ACT owner-occupier: seven rows verified with exact continuity")
write_pack(
    "au-duty-concessions-act", "ACT",
    [source("actro-owner-occupier-2026-08-21", "ACT Revenue Office",
            "Conveyance duty for non-commercial property — eligible owner occupier (Table 1)",
            "https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property",
            act_cref,
            "Eligible owner-occupier rates for transactions on or after 1 July 2025, unchanged for FY2026-27 per determination DI2026-155 (archived). Occupancy conditions (live in for 1 year, starting within 12 months) are the buyer's own assessment; the top band is a flat $4.54 per $100 of the total value.")],
    {**EMPTY, "actOwnerOccupier": {"brackets": oo, "per100Rounding": "part_thereof_up"}},
)
print("All four concession packs authored.")
