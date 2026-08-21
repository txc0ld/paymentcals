"""
Authors six packs from the 2026-08-21 sourcing round (all machine-parsed
from archived official files; the script throws on any self-check failure):

  au-wpi-quarterly      ABS 6345.0 Table 1, series A2603609J (P&P, original)
  au-lender-rates       RBA table F5 housing indicator lending rates
  au-sapto              ATO SAPTO amounts/thresholds (2025-26)
  au-help-indexation    ATO study-loan indexation rates 2013-2026
  au-gst-registration   ATO GST registration thresholds
  au-schedule5          Schedule 5 additional-payment withholding cap (47%)

  python scripts/author_queue_packs_2026_08_21.py
"""
import hashlib
import json
import re
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
PACKS = HERE.parent / "src" / "packs"
APPROVED = {
    "approvedBy": "owner (directive: deploy verification queue items, 2026-08-21)",
    "approvedAt": "2026-08-21T10:00:00Z",
}

def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def strip_html(p: Path) -> str:
    t = p.read_text(encoding="utf8", errors="ignore")
    t = re.sub(r"&ndash;|&#8211;", "–", t)
    t = re.sub(r"<[^>]+>|&nbsp;", " ", t)
    t = t.replace("&amp;", "&")
    return re.sub(r"\s+", " ", t)

def write_pack(pack_id, domain, sources, rules, effective_from):
    pack = {
        "rulePackId": pack_id,
        "jurisdiction": "AU",
        "subdivision": None,
        "domain": domain,
        "effectiveFrom": effective_from,
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

def src(source_id, authority, title, url, domain, ref, notes):
    return {
        "sourceId": source_id,
        "authority": authority,
        "title": title,
        "url": url,
        "jurisdiction": "AU",
        "domain": domain,
        "retrievedAt": "2026-08-21T14:00:00+08:00",
        "archivedSnapshotRef": ref,
        "contentHash": sha256(REPO / ref),
        "notes": notes,
    }

# ------------------------------------------------------------------- WPI
WPI_REF = "compliance-archive/sources/abs/wpi-6345-table1.2026-08-21.xlsx"
z = zipfile.ZipFile(REPO / WPI_REF)
sheets = re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode("utf8"))
shared = [re.sub(r"<[^>]+>", "", s) for s in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf8"), re.S)]
xml = z.read(f"xl/worksheets/sheet{sheets.index('Data1') + 1}.xml").decode("utf8")
rows = []
for r in re.findall(r"<row[^>]*>(.*?)</row>", xml, re.S):
    cells = []
    for m in re.finditer(r"<c ([^>]*)>(?:<v>([^<]*)</v>)?", r):
        attrs, val = m.group(1), m.group(2)
        if 't="s"' in attrs and val is not None:
            val = shared[int(val)].strip()
        cells.append(val)
    rows.append(cells)
series_row = next(r for r in rows if r and r[0] == "Series ID")
col = series_row.index("A2603609J")
quarters = []
for r in rows[rows.index(series_row) + 1 :]:
    if not r or r[0] is None or not re.match(r"^\d+$", str(r[0])):
        continue
    serial = int(r[0])
    d = date(1899, 12, 30) + timedelta(days=serial)
    val = r[col] if col < len(r) else None
    if val is None:
        continue
    quarters.append({"date": d.isoformat(), "index": f"{float(val):.1f}"})
assert len(quarters) == 116, f"expected 116 WPI quarters, got {len(quarters)}"
assert quarters[0]["date"].startswith("1997-09") and quarters[-1]["date"].startswith("2026-06"), (
    quarters[0], quarters[-1]
)
# Reference-base check: 2008-09 four-quarter average must be exactly 100.0.
base = [q for q in quarters if q["date"] in ("2008-09-01", "2008-12-01", "2009-03-01", "2009-06-01")]
avg = sum(float(q["index"]) for q in base) / 4
assert abs(avg - 100.0) < 0.001, f"2008-09 base average {avg}"
assert quarters[-1]["index"] == "161.2", quarters[-1]
print(f"WPI: {len(quarters)} quarters, base check exact, latest {quarters[-1]}")
write_pack(
    "au-wpi-quarterly",
    "wpi",
    [src(
        "abs-wpi-6345-table1-2026-08-21",
        "Australian Bureau of Statistics",
        "6345.0 Wage Price Index, Australia — Table 1, total hourly rates of pay excluding bonuses (series A2603609J, private and public, original)",
        "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/jun-2026/634501.xlsx",
        "wpi",
        WPI_REF,
        "Quarterly index, Sep-1997 → Jun-2026, reference base 2008-09 = 100.0 (verified arithmetically from the four base quarters). Released 19 Aug 2026. Historic values only — never forecasts.",
    )],
    {"seriesId": "A2603609J", "indexReference": "2008-09 = 100.0", "quarters": quarters},
    quarters[0]["date"],
)

# ------------------------------------------------------------ Lender rates
F5_REF = "compliance-archive/sources/rba/f5-data.2026-08-21.csv"
f5 = (REPO / F5_REF).read_text(encoding="utf8", errors="ignore").replace("﻿", "")
lines = f5.split("\n")
sid_row = next(l for l in lines if l.startswith("Series ID")).split(",")
title_row = next(l for l in lines if l.startswith("Title")).split(",")
WANTED = {
    "FILRHLBVS": "Owner-occupier · variable · standard",
    "FILRHLBVD": "Owner-occupier · variable · discounted",
    "FILRHL3YF": "Owner-occupier · 3-year fixed",
    "FILRHLBVSI": "Investor · variable · standard",
    "FILRHLBVDI": "Investor · variable · discounted",
    "FILRHL3YFI": "Investor · 3-year fixed",
}
data_rows = [l.split(",") for l in lines if re.match(r"^\d{2}/\d{2}/\d{4},", l)]
latest = data_rows[-1]
m = re.match(r"(\d{2})/(\d{2})/(\d{4})", latest[0])
latest_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
assert latest_date == "2026-07-31", latest_date
series = []
for sid, label in WANTED.items():
    idx = sid_row.index(sid)
    value = latest[idx].strip()
    assert re.match(r"^\d+\.\d+$", value), (sid, value)
    assert 1.0 < float(value) < 15.0, (sid, value)
    series.append({"seriesId": sid, "label": label, "ratePercent": value})
print(f"F5: {len(series)} housing series at {latest_date}: " + ", ".join(s["ratePercent"] for s in series))
write_pack(
    "au-lender-rates",
    "lender-rates",
    [src(
        "rba-f5-2026-08-21",
        "Reserve Bank of Australia",
        "Statistical table F5 — Indicator Lending Rates (banks' housing loans)",
        "https://www.rba.gov.au/statistics/tables/csv/f5-data.csv",
        "lender-rates",
        F5_REF,
        "Published monthly indicator rates (per cent per annum), latest observation 31 July 2026, RBA publication date 10 Aug 2026. These are published averages of advertised rates — reference values, never offers or recommendations.",
    )],
    {"observationDate": latest_date, "unit": "percent_per_annum", "series": series},
    "2026-07-31",
)

# ------------------------------------------------------------------ SAPTO
SAPTO_REF = "compliance-archive/sources/ato/sapto.2026-08-21.html"
sapto = strip_html(REPO / SAPTO_REF)
def money(pattern, label):
    m = re.search(pattern, sapto)
    assert m, f"SAPTO not found: {label}"
    return m.group(1).replace(",", "")
rows_out = []
for status, key in [("Single", "single"), ("Each partner of a couple", "couple_each"), ("Each partner of an illness separated couple", "illness_separated_each")]:
    m = re.search(re.escape(status) + r" \$([\d,]+) \$([\d,]+) \$([\d,]+)", sapto)
    assert m, f"SAPTO row not found: {status}"
    rows_out.append({
        "status": key,
        "maxOffset": m.group(1).replace(",", ""),
        "shadingOutThreshold": m.group(2).replace(",", ""),
        "cutOutThreshold": m.group(3).replace(",", ""),
    })
assert re.search(r"reduces by \$0\.125 for every dollar", sapto), "shade-out rate sentence missing"
# Internal check: cutOut = shadeOut + maxOffset / 0.125 (rounded)
for r in rows_out:
    implied = int(r["shadingOutThreshold"]) + round(int(r["maxOffset"]) / 0.125)
    assert abs(implied - int(r["cutOutThreshold"])) <= 1, (r, implied)
print("SAPTO rows verified: cutOut = shadeOut + maxOffset/0.125 on all three")
write_pack(
    "au-sapto",
    "sapto",
    [src(
        "ato-sapto-2026-08-21",
        "Australian Taxation Office",
        "Seniors and pensioners tax offset (rates and rebate income thresholds)",
        "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset",
        "sapto",
        SAPTO_REF,
        "2025-26 values (page cites the 2025 Regulations and a 2025-26 example; corroborated by the archived myTax 2026 page sapto-mytax-2026.2026-08-21.html, sha256 03dbd59fa1ed76abcb07d15649a6010d88c1c4c99091ee0664e47799f3fcebf0). Offset reduces by $0.125 per dollar of rebate income over the shading-out threshold; non-refundable. Cut-out = shade-out + max/0.125 verified for all rows.",
    )],
    {"financialYear": "2025-26", "shadeOutRatePerDollar": "0.125", "statuses": rows_out},
    "2025-07-01",
)

# -------------------------------------------------------- HELP indexation
IDX_REF = "compliance-archive/sources/ato/stsl-indexation-rates.2026-08-21.html"
idx_text = strip_html(REPO / IDX_REF)
year_rates = re.findall(r"\b(20\d{2}) ([\d.]+)%(?: \(previously ([\d.]+)%\))?", idx_text)
table = []
for year, rate, previously in year_rates:
    y = int(year)
    if 2013 <= y <= 2026:
        entry = {"year": year, "ratePercent": rate}
        if previously:
            entry["previouslyPublishedPercent"] = previously
        table.append(entry)
by_year = {t["year"]: t for t in table}
table = sorted(by_year.values(), key=lambda t: t["year"])
assert len(table) == 14 and table[-1] == {"year": "2026", "ratePercent": "2.8"}, table[-3:]
assert by_year["2023"].get("previouslyPublishedPercent") == "7.1" and by_year["2024"].get("previouslyPublishedPercent") == "4.7", by_year["2023"]
assert "whichever is lower" in idx_text
print(f"HELP indexation: {len(table)} years, 2026 = 2.8%, retrospective notes preserved")
write_pack(
    "au-help-indexation",
    "help-indexation",
    [src(
        "ato-stsl-indexation-2026-08-21",
        "Australian Taxation Office",
        "Study and training support loans indexation rates",
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-indexation-rates",
        "help-indexation",
        IDX_REF,
        "Indexation applies on 1 June to loan amounts unpaid for more than 11 months, at the lower of CPI and WPI (from 2025, calculated after the December releases). Historic published rates only — never a projection of future rates.",
    )],
    {"appliesOn": "06-01", "unpaidForMonths": 11, "method": "lower_of_cpi_wpi", "rates": table},
    "2013-06-01",
)

# ------------------------------------------------------ GST registration
GSTR_REF = "compliance-archive/sources/ato/gst-registering.2026-08-21.html"
gstr = strip_html(REPO / GSTR_REF)
assert re.search(r"\$75,000 or more \(the GST threshold\s*\)", gstr)
assert re.search(r"non-profit organisation has a GST turnover of \$150,000", gstr)
assert re.search(r"taxi or limousine travel for passengers \(including ride-sourcing\s*\) regardless of your GST turnover", gstr)
assert "within 21 days" in gstr
print("GST registration: thresholds and taxi rule sentences verified")
write_pack(
    "au-gst-registration",
    "gst-registration",
    [src(
        "ato-gst-registering-2026-08-21",
        "Australian Taxation Office",
        "Registering for GST",
        "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst",
        "gst-registration",
        GSTR_REF,
        "GST turnover threshold $75,000 ($150,000 for non-profit bodies); taxi/limousine and ride-sourcing must register regardless of turnover; registration required within 21 days of reaching the threshold. Current or projected 12-month turnover tests per the page.",
    )],
    {
        "generalThreshold": "75000",
        "nonProfitThreshold": "150000",
        "taxiRideSourcingAlwaysRequired": True,
        "registrationDays": 21,
    },
    "2017-07-01",
)

# ----------------------------------------------------------- Schedule 5
S5_REF = "compliance-archive/sources/ato/schedule5-working-out.2026-08-21.html"
s5 = strip_html(REPO / S5_REF)
assert re.search(r"limited to a maximum of 47% of the additional payment", s5)
assert "treat the result as nil" in s5
print("Schedule 5: 47% cap sentence verified")
write_pack(
    "au-schedule5",
    "schedule5",
    [src(
        "ato-schedule5-2026-08-21",
        "Australian Taxation Office",
        "Schedule 5 — Tax table for back payments, commissions, bonuses and similar payments (working out the withholding amount)",
        "https://www.ato.gov.au/tax-rates-and-codes/schedule-5-tax-table-for-back-payments-commissions-bonuses-and-similar-payments/working-out-the-withholding-amount",
        "schedule5",
        S5_REF,
        "Applies to payments made from 1 July 2026. Methods A, B(i) and B(ii) are published in full as numbered steps; they delegate the tax lookups to the regular schedule (Schedule 1, already packaged). Cap: withholding on the additional payment is limited to 47% of it; negative results are treated as nil.",
    )],
    {"additionalPaymentCapRate": "0.47", "negativeResultsAreNil": True, "methods": ["A", "B(i)", "B(ii)"]},
    "2026-07-01",
)
print("All six queue packs authored.")
