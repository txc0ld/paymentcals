"""
Authors three packs from archived official sources (all machine-parsed):

  au-income-percentiles     ATO Taxation statistics 2023-24, Individuals
                            Table 16A (counts, net tax by percentile/sex/state)
  au-super-balance-by-age   Table 23A (median/average balance by age/sex/income)
  au-super-thresholds       ATO concessional-cap + Division 293 pages

Each parse self-checks; the script throws rather than write a doubtful pack.
Run then regenerate the integrity manifest:

  python scripts/author_statistics_packs_2026_08_21.py
"""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
PACKS = HERE.parent / "src" / "packs"
APPROVED = {
    "approvedBy": "owner (directive: income range + super suite, 2026-08-21)",
    "approvedAt": "2026-08-21T08:00:00Z",
}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def xlsx_rows(path: Path, sheet: str):
    z = zipfile.ZipFile(path)
    shared = [re.sub(r"<[^>]+>", "", s) for s in
              re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf8"), re.S)]
    wb = z.read("xl/workbook.xml").decode("utf8")
    order = re.findall(r'<sheet name="([^"]+)"', wb)
    idx = order.index(sheet) + 1
    xml = z.read(f"xl/worksheets/sheet{idx}.xml").decode("utf8")
    rows = []
    for r in re.findall(r"<row[^>]*>(.*?)</row>", xml, re.S):
        cells = []
        # Attribute order varies (<c r=.. s=.. t="s">): read the whole tag.
        for m in re.finditer(r"<c ([^>]*)>(?:<v>([^<]*)</v>)?", r):
            attrs, val = m.group(1), m.group(2)
            if 't="s"' in attrs and val is not None:
                val = shared[int(val)].strip()
            cells.append(val)
        rows.append(cells)
    return rows

def write_pack(pack_id: str, domain: str, sources, rules, effective_from: str):
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
    out = PACKS / f"{pack_id}.json"
    out.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n", encoding="utf8", newline="\n")
    print(f"{pack_id}: written, active")

# ---------------------------------------------------------------- Table 16
T16_REF = "compliance-archive/sources/ato/ts24-individuals-table16-percentiles.2026-08-21.xlsx"
t16_path = REPO / T16_REF
rows16 = xlsx_rows(t16_path, "Table 16A")
header = rows16[1]
# Expected: Percentile | Ranged Taxable Income | State | Sex | Individuals no. |
# Taxable income $ | Net tax $ | Total income $ | Total deductions $ ...
assert header[0] == "Percentile" and "Ranged" in header[1], header[:4]
col_individuals = 4
col_taxable = 5
col_nettax = 6
agg = {}
for cells in rows16[2:]:
    if len(cells) < 7 or cells[0] is None:
        continue
    try:
        pct = int(float(cells[0]))
    except (TypeError, ValueError):
        continue
    if not 1 <= pct <= 100:
        continue
    sex = cells[3]
    if sex not in ("Male", "Female"):
        continue
    entry = agg.setdefault(pct, {"label": cells[1], "male": 0, "female": 0, "netTax": 0.0, "taxable": 0.0})
    n = int(float(cells[col_individuals] or 0))
    entry["male" if sex == "Male" else "female"] += n
    entry["netTax"] += float(cells[col_nettax] or 0)
    entry["taxable"] += float(cells[col_taxable] or 0)

assert len(agg) == 100, f"expected 100 percentiles, got {len(agg)}"
total_net_tax = sum(e["netTax"] for e in agg.values())
total_people = sum(e["male"] + e["female"] for e in agg.values())
assert 12_000_000 < total_people < 20_000_000, f"implausible population {total_people}"

def parse_bounds(label: str, pct: int):
    nums = [int(x.replace(",", "")) for x in re.findall(r"\$([\d,]+)", label)]
    if "or less" in label:
        assert pct == 1 and len(nums) == 1
        return "0", str(nums[0])
    if "or more" in label:
        assert pct == 100 and len(nums) == 1
        return str(nums[0]), None
    assert len(nums) == 2 and nums[0] < nums[1], label
    return str(nums[0]), str(nums[1])

percentiles = []
prev_upper = -1
for pct in range(1, 101):
    e = agg[pct]
    lower, upper = parse_bounds(e["label"], pct)
    assert int(lower) > prev_upper - 2, f"non-ascending at {pct}"
    prev_upper = int(upper) if upper else int(lower)
    people = e["male"] + e["female"]
    assert people > 0
    percentiles.append({
        "percentile": pct,
        "rangeLabel": e["label"],
        "lower": lower,
        "upper": upper,
        "males": str(e["male"]),
        "females": str(e["female"]),
        "averageNetTax": f"{e['netTax'] / people:.2f}",
        "shareOfNetTax": f"{e['netTax'] / total_net_tax:.6f}",
    })
print(f"table16: 100 percentiles, {total_people:,} individuals, net tax pool ${total_net_tax:,.0f}")

write_pack(
    "au-income-percentiles",
    "income-percentiles",
    [{
        "sourceId": "ato-ts24-individuals-table16-2026-08-21",
        "authority": "Australian Taxation Office (Taxation statistics 2023–24, via data.gov.au)",
        "title": "Individuals Table 16A: Percentile distribution of taxable individuals, by taxable income and sex, 2023–24",
        "url": "https://data.gov.au/data/dataset/faea4485-f407-457d-97f8-3f0822ccd654/resource/abb69db8-b053-4cd2-84d1-64ac75d02cb1/download/ts24individual16percentiledistributionontaxableincomebysexstate.xlsx",
        "jurisdiction": "AU",
        "domain": "income-percentiles",
        "retrievedAt": "2026-08-21T13:00:00+08:00",
        "archivedSnapshotRef": T16_REF,
        "contentHash": sha256(t16_path),
        "notes": "National figures aggregated from the state rows of Table 16A (counts and dollar sums are additive; no medians were aggregated). Range labels verbatim. 2023–24 income year — the latest published edition.",
    }],
    {"incomeYear": "2023–24", "totalIndividuals": str(total_people), "percentiles": percentiles},
    "2025-07-01",
)

# ---------------------------------------------------------------- Table 23A
T23_REF = "compliance-archive/sources/ato/ts24-individuals-table23-super-by-age.2026-08-21.xlsx"
t23_path = REPO / T23_REF
rows23 = xlsx_rows(t23_path, "Table 23A")
h23 = rows23[1]
assert "Age range" in h23[0] and h23[1] == "Sex", h23[:3]
# Columns: 0 age, 1 sex, 2 income range, 3 individuals, ..., 13 balance $,
# 14 average balance, 15 median balance (per header inspection).
assert "Average" in h23[14] and "Median" in h23[15], h23[13:16]
cells_out = []
ages_seen = set()
soft_median_gt_avg = 0
for cells in rows23[2:]:
    if len(cells) < 16 or cells[0] in (None, "Unknown") or cells[1] not in ("Male", "Female"):
        continue
    age, sex, income_range = cells[0], cells[1], cells[2]
    if income_range in (None, "na"):
        continue
    individuals = int(float(cells[3] or 0))
    average = cells[14]
    median = cells[15]
    if average is None or median is None or individuals <= 0:
        continue
    ages_seen.add(age)
    if float(median) > float(average):
        soft_median_gt_avg += 1
    cells_out.append({
        "ageRange": age,
        "sex": sex,
        "taxableIncomeRange": income_range,
        "individuals": str(individuals),
        "medianBalance": f"{float(median):.0f}",
        "averageBalance": f"{float(average):.0f}",
    })
assert len(ages_seen) >= 12, f"only {len(ages_seen)} age ranges parsed"
assert len(cells_out) >= 130, f"only {len(cells_out)} cells parsed"
assert soft_median_gt_avg < len(cells_out) * 0.2, "medians exceed averages too often — parse suspect"
print(f"table23A: {len(cells_out)} cells across {len(ages_seen)} age ranges (median>average in {soft_median_gt_avg})")

write_pack(
    "au-super-balance-by-age",
    "super-statistics",
    [{
        "sourceId": "ato-ts24-individuals-table23-2026-08-21",
        "authority": "Australian Taxation Office (Taxation statistics 2023–24, via data.gov.au)",
        "title": "Individuals Table 23A: Super contributions and total super member accounts balance, by age range, sex and taxable income range, 2023–24",
        "url": "https://data.gov.au/data/dataset/faea4485-f407-457d-97f8-3f0822ccd654/resource/0c0d97e6-15db-483c-980d-53fef39de5ae/download/ts24individual23contributionsagesextaxableincome.xlsx",
        "jurisdiction": "AU",
        "domain": "super-statistics",
        "retrievedAt": "2026-08-21T13:00:00+08:08",
        "archivedSnapshotRef": T23_REF,
        "contentHash": sha256(t23_path),
        "notes": "Median and average total super member account balances per (age range × sex × taxable income range) cell, verbatim per cell — the source publishes no all-income totals, so cells are never aggregated. 2023–24 income year.",
    }],
    {"incomeYear": "2023–24", "cells": cells_out},
    "2025-07-01",
)

# ------------------------------------------------------- Super thresholds
CAPS_REF = "compliance-archive/sources/ato/super-caps.2026-08-21.html"
DIV_REF = "compliance-archive/sources/ato/super-div293.2026-08-21.html"
caps_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>|&nbsp;", " ", (REPO / CAPS_REF).read_text(encoding="utf8", errors="ignore")))
div_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>|&nbsp;", " ", (REPO / DIV_REF).read_text(encoding="utf8", errors="ignore")))

m_new = re.search(r"From 1 July 2026, the concessional contributions cap is \$([\d,]+)", caps_text)
m_prev = re.search(r"From 1 July 2024 to 30 June 2026, the concessional contributions cap was \$([\d,]+)", caps_text)
assert m_new and m_prev, "concessional cap sentences not found"
cap_2627 = m_new.group(1).replace(",", "")
cap_prev = m_prev.group(1).replace(",", "")
m_div = re.search(r"concessional super contributions total more than \$([\d,]+)", div_text)
assert m_div, "Division 293 threshold sentence not found"
div293 = m_div.group(1).replace(",", "")
print(f"thresholds: concessional 2026-27 ${cap_2627}, 2024-26 ${cap_prev}, Div293 ${div293}")

write_pack(
    "au-super-thresholds",
    "super-thresholds",
    [
        {
            "sourceId": "ato-concessional-cap-2026-08-21",
            "authority": "Australian Taxation Office",
            "title": "Concessional contributions cap",
            "url": "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/concessional-contributions-cap",
            "jurisdiction": "AU",
            "domain": "super-thresholds",
            "retrievedAt": "2026-08-21T13:05:00+08:00",
            "archivedSnapshotRef": CAPS_REF,
            "contentHash": sha256(REPO / CAPS_REF),
            "notes": "Page states: 'From 1 July 2026, the concessional contributions cap is $32,500' and 'From 1 July 2024 to 30 June 2026 ... was $30,000'. Carry-forward of unused cap exists but is not modelled (needs the member's own history).",
        },
        {
            "sourceId": "ato-division-293-2026-08-21",
            "authority": "Australian Taxation Office",
            "title": "Division 293 tax on concessional contributions by high-income earners",
            "url": "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-293-tax-on-concessional-contributions-by-high-income-earners",
            "jurisdiction": "AU",
            "domain": "super-thresholds",
            "retrievedAt": "2026-08-21T13:05:00+08:00",
            "archivedSnapshotRef": DIV_REF,
            "contentHash": sha256(REPO / DIV_REF),
            "notes": "Page states the $250,000 combined income + concessional contributions threshold. The 15% additional tax rate is stated on the same page.",
        },
    ],
    {
        "concessionalCaps": [
            {"financialYear": "2024-25", "cap": cap_prev},
            {"financialYear": "2025-26", "cap": cap_prev},
            {"financialYear": "2026-27", "cap": cap_2627},
        ],
        "division293Threshold": div293,
    },
    "2024-07-01",
)
print("All statistics packs authored.")
