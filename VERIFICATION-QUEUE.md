# Verification Queue

Every rule pack and every fixture value awaiting human verification, grouped by source URL.
A pack may only move from `in_review` to `approved`/`active` after the owner checks each box and records `verifiedAt`.

## ATO — How GST works

Source: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works
Retrieved: 2026-08-20 · content sha256 `644a6039f3679c839f4c0fda6c65ed87fd26a266b7f6bef03f3dc657fbd5bb8f`
Archived: `compliance-archive/sources/ato/how-gst-works.2026-08-20.html`

Pack: `au-gst-standard` (status: in_review)

- [ ] GST standard rate = 10% (0.10) — page states: "Goods and services tax (GST) is a broad-based tax of 10% on most goods, services and other items sold or consumed in Australia."
- [ ] Effective range open-ended (no scheduled change found on source page) — confirm no pending legislative change.

## ATO — Tax rates for Australian residents (+ foreign residents page)

Sources: tax-rates-australian-residents · tax-rates-foreign-residents · Retrieved 2026-08-20 · snapshots in `compliance-archive/sources/ato/`

Packs: `au-income-tax-2024-25` / `-2025-26` / `-2026-27` (in_review)

- [ ] Resident brackets FY2024-25 & FY2025-26: nil to $18,200 · 16% to $45,000 · 30% to $135,000 · 37% to $190,000 · 45% over
- [ ] Resident brackets FY2026-27: second bracket 15% (other bounds unchanged)
- [ ] Foreign resident FY2024-25/2025-26: 30% to $135,000 · 37% to $190,000 · 45% over — **FY2026-27 foreign brackets NOT authored (null): confirm and fill**
- [ ] Working holiday maker FY2026-27: 15%/$45k · 30%/$135k · 37%/$190k · 45% — **FY2024-25/2025-26 WHM null: confirm and fill**
- [ ] LITO ($700 max, taper 5c over $37,500, $325 then 1.5c over $45,000, cut-out $66,667) — page is undated "current"; confirm applies to each FY pack

## ATO — Medicare levy, reduction thresholds and MLS

Packs: `au-medicare-2024-25` / `-2025-26` / `-2026-27` (in_review)

- [ ] Levy rate 2% (all FYs)
- [ ] Low-income single 2025-26: lower $28,011 / upper $35,013 / SAPTO $44,268/$55,335; phase-in 10c per $ over lower (corroborated by page example) — **2024-25 and 2026-27 low-income thresholds null: fill from prior/next-year pages**
- [ ] Low-income family 2025-26: $47,238/$59,047 (+$4,338/+$5,423 per child), SAPTO $61,623/$77,028
- [ ] MLS tiers per FY (2024-25: 97k/113k/151k · 2025-26: 101k/118k/158k · 2026-27: 105k/123k/164k; family double + $1,500/child after first; rates 0/1%/1.25%/1.5%)

## ATO — Study and training support loans

Packs: `au-stsl-2024-25` / `-2025-26` / `-2026-27` (in_review)

- [ ] 2026-27 marginal: nil ≤ $69,528 · 15c to $129,717 · $9,028 + 17c to $186,050 · 10% of total over
- [ ] 2025-26 marginal: nil ≤ $67,000 · 15c to $125,000 · $8,700 + 17c to $179,285 · 10% of total over
- [ ] 2024-25 whole-income table (18 bands, 1%–10%, nil below $54,435)
- [ ] **Source anomaly:** the ATO page's Example 4 prints "$99,736 × 5.5% = $5,485.52", but the arithmetic gives $5,485.48. The engine computes exactly; confirm the intended figure with the ATO calculator.
- [ ] **Rounded published bases (review finding #12):** the ATO prints the 2026-27 STSL band base as $9,028 (continuity computes $9,028.35) and Revenue NSW prints $1,662 (computes $1,662.50). The packs transcribe the sources verbatim; confirm whether the authorities intend the printed rounded base or the exact continuation, and note the choice on the pack.

## ATO — Super guarantee

Packs: `au-super-guarantee-*` (in_review)

- [ ] Rates: 11.5% (2024-25) · 12% (2025-26, 2026-27)
- [ ] Max contribution base: $65,070/quarter (2024-25) · $62,500/quarter (2025-26) · $270,830/year (2026-27, Payday Super era)

## ATO — PAYG withholding Schedule 1 + Schedule 8 (payments from 1 July 2026)

Pack: `au-payg-withholding-2026-27` (in_review)

- [ ] Scale 1/2/3/5/6 coefficient rows (machine-parsed from the coefficients page — spot-check several rows against the page)
- [ ] Scale 4 no-TFN flat rates 47%/45%
- [ ] STSL component coefficients (TFT-or-foreign, no-TFT)
- [ ] Period-conversion conventions (fortnightly/monthly/quarterly) and earnings rounding (whole dollars + 99c)
- Note: withholding packs for FY2024-25/2025-26 were deliberately not authored (historical payroll out of P0 scope; annual liability still covers those FYs).

## State revenue offices — transfer/stamp duty (general rates)

Packs: `au-stamp-duty-{nsw,vic,qld,wa,sa,tas,act,nt}` (in_review) · snapshots in `compliance-archive/sources/state-revenue/`

- [ ] **NSW** (Revenue NSW thresholds page): 7 brackets, $1.25–$7.00 per $100, minimum $20. Confirm the per-$100 rounding convention and the effective window (page undated).
- [ ] **QLD** (QRO rates page): 5 brackets; the engine reproduces the page's own $850,000 → $31,275 worked example.
- [ ] **TAS** (SRO rates of duty): 7 brackets, flat $50 ≤ $3,000.
- [ ] **VIC — NOT AUTHORED**: sro.vic.gov.au blocked automated fetch (HTTP 403). Transcribe the official current-rates table manually; the route shows "VIC not yet supported" until then.
- [ ] **WA — NOT AUTHORED**: known wa.gov.au URLs returned 404. Locate the current RevenueWA transfer duty rates and transcribe.
- [ ] **SA — NOT AUTHORED**: revenuesa.sa.gov.au calculation page is client-rendered; no rates in HTML. Transcribe manually.
- [ ] **ACT — NOT AUTHORED**: revenue.act.gov.au conveyance page is client-rendered. Transcribe manually.
- [ ] **NT — NOT AUTHORED**: the NT conveyance formula (quadratic under the threshold) needs a schema extension plus manual transcription.

## Golden fixtures awaiting expected values

- [ ] `packages/test-fixtures/src/gst/au-biz-001.fixture.json` — fill `expected` values from the official ATO examples or a verified manual calculation.
- [ ] `packages/test-fixtures/src/pay/au-pay-001.fixture.json` — 6 cases across FY2024-25/2025-26/2026-27; fill `expected` from the ATO simple tax calculator / Moneysmart and record the tool + date. (The engine already reproduces the ATO worked examples for STSL, Medicare reduction and MLS as unit tests.)
- [ ] `packages/test-fixtures/src/home/au-home-001.fixture.json` — 3 mortgage repayment cases; fill `expected` from the Moneysmart mortgage calculator. (The engine differential-tests the schedule against the closed form internally.)
