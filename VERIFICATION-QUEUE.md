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

## Golden fixtures awaiting expected values

- [ ] `packages/test-fixtures/gst/au-biz-001.fy-any.json` — fill `expected` values from the official ATO examples or a verified manual calculation.
