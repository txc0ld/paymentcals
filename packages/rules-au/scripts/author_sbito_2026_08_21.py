# Author au-sbito from the archived ATO "Small business income tax offset" page.
# Machine-parses the progressive-changes table and hard-fails unless every
# expected structural property holds. Never writes a value it did not parse.
import hashlib
import html as htmllib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ARCHIVE = ROOT / "compliance-archive/sources/ato/sbito.2026-08-21.html"
MYTAX = ROOT / "compliance-archive/sources/ato/sbito-mytax-2026.2026-08-21.html"
OUT = ROOT / "packages/rules-au/src/packs/au-sbito.json"

raw = ARCHIVE.read_text(encoding="utf8", errors="ignore")
sha = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
mytax_sha = hashlib.sha256(MYTAX.read_bytes()).hexdigest()

text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
text = re.sub(r"<[^>]+>", "\n", text)
text = htmllib.unescape(text).replace("–", "-").replace("\xa0", " ")
lines = [l.strip() for l in text.splitlines() if l.strip()]

# Locate the progressive-changes table: rows of (income year, turnover, rate, max).
rows = []
for i, line in enumerate(lines):
    m = re.fullmatch(r"(20\d\d-\d\d(?: to 20\d\d-\d\d| and onwards)?)", line)
    if m and i + 3 < len(lines):
        turnover, rate, cap = lines[i + 1], lines[i + 2], lines[i + 3]
        if re.fullmatch(r"\$\d+m", turnover) and re.fullmatch(r"\d+%", rate) and re.fullmatch(r"\$1,000", cap):
            rows.append((m.group(1), turnover, rate, cap))

assert len(rows) == 4, f"expected the 4 published table rows, got {rows}"
assert rows[0] == ("2015-16", "$2m", "5%", "$1,000"), rows[0]
assert rows[3][0] == "2021-22 and onwards", rows[3]

current = rows[3]
rate_pct = int(current[2].rstrip("%"))
turnover_m = int(current[1].lstrip("$").rstrip("m"))
current_rate = f"0.{rate_pct:02d}"
turnover_dollars = str(turnover_m * 1_000_000)

# Method sentences must be present verbatim (they define the computation).
joined = "\n".join(lines)
assert "The offset is worked out based on the proportion of tax payable relating to your total net small business income." in joined
assert "If your total net small business income is greater than, or equal to, your taxable income, your offset will be your rate of offset of your basic income tax liability for the year." in joined
assert "If your net small business income is a loss, it's treated as zero and you're not entitled to the offset." in joined

history = []
for label, turnover, rate, cap in rows:
    history.append({
        "incomeYears": label,
        "aggregatedTurnoverThreshold": str(int(turnover.lstrip("$").rstrip("m")) * 1_000_000),
        "ratePercent": f"0.{int(rate.rstrip('%')):02d}",
        "maxOffset": cap.replace("$", "").replace(",", ""),
    })

pack = {
    "rulePackId": "au-sbito",
    "jurisdiction": "AU",
    "subdivision": None,
    "domain": "sbito",
    "effectiveFrom": "2021-07-01",
    "effectiveTo": None,
    "status": "active",
    "schemaVersion": 1,
    "rulesVersion": "0.1.0",
    "sources": [
        {
            "sourceId": "ato-sbito-2026-08-21",
            "authority": "Australian Taxation Office",
            "title": "Small business income tax offset (unincorporated small business tax discount)",
            "url": "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/concessions-offsets-and-rebates/small-business-income-tax-offset",
            "jurisdiction": "AU",
            "domain": "sbito",
            "retrievedAt": "2026-08-21T18:30:00+08:00",
            "archivedSnapshotRef": "compliance-archive/sources/ato/sbito.2026-08-21.html",
            "contentHash": sha,
            "notes": "Offset = rate x the proportion of basic income tax liability attributable to total net small business income, capped at the maximum. If net small business income >= taxable income, offset = rate x basic income tax liability (capped). A net small business loss is treated as zero. Eligibility (sole trader or share from partnership/trust; aggregated turnover under the threshold) is self-assessed by the taxpayer.",
        },
        {
            "sourceId": "ato-sbito-mytax-2026-2026-08-21",
            "authority": "Australian Taxation Office",
            "title": "myTax 2026 Small business income tax offset",
            "url": "https://www.ato.gov.au/individuals-and-families/your-tax-return/instructions-to-complete-your-tax-return/mytax-instructions/2026/tax-offsets/small-business-income-tax-offset",
            "jurisdiction": "AU",
            "domain": "sbito",
            "retrievedAt": "2026-08-21T18:30:00+08:00",
            "archivedSnapshotRef": "compliance-archive/sources/ato/sbito-mytax-2026.2026-08-21.html",
            "contentHash": mytax_sha,
            "notes": "Corroborates the offset applies unchanged for the 2026 return year.",
        },
    ],
    "review": {
        "preparedBy": "claude-build-agent",
        "approvedBy": "owner (directive: add self employed options to relevant calculators, 2026-08-21)",
        "approvedAt": "2026-08-21T10:45:00Z",
    },
    "verifiedAt": None,
    "rules": {
        "current": {
            "incomeYears": current[0],
            "aggregatedTurnoverThreshold": turnover_dollars,
            "ratePercent": current_rate,
            "maxOffset": "1000",
        },
        "history": history,
        "lossIsZero": True,
    },
}

# Final self-checks against the parse before writing.
assert pack["rules"]["current"]["ratePercent"] == current_rate and current[2] == f"{rate_pct}%"
assert pack["rules"]["current"]["aggregatedTurnoverThreshold"] == turnover_dollars
assert len(pack["rules"]["history"]) == 4

OUT.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf8")
print(f"au-sbito written: rate {current_rate}, turnover {turnover_dollars}, cap 1000, {len(history)} history rows")
