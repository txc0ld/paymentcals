# LAUNCH-READINESS — PaymentCalcs P0

Status at 2026-08-21. ✅ = automated check passing in this repo. 🧑 = requires a human action before public launch. Production deploys are fail-closed for statutory calculators until 🧑 items complete.

## Product and scope (§35.1)

- ✅ 28 P0 routes live across the §5 route set (pay ×9, home loans ×6, property costs ×4 incl. affordability, stamp duty ×2, debt ×3, savings ×2, business ×2), each with a registry entry, Simple/Advanced modes, and distinct copy/metadata.
- ✅ No super/retirement routes scaffolded.
- 🧑 Final route-set sign-off by owner.

## Calculation quality (§35.2)

- ✅ 58 CI tasks green: typecheck, lint (incl. currency-`number` ban, engine purity, banned result verbs), 150+ unit/property/boundary tests, production build.
- ✅ Official worked examples reproduced exactly (ATO STSL ×3, Medicare reduction, MLS, QRO duty example, NSW duty examples ×2). One ATO page arithmetic anomaly detected and queued.
- ✅ Reconciliation invariants enforced per period on every schedule engine; solver round-trips verified.
- 🧑 Fill the 13 golden-fixture `expected` values from official calculators (VERIFICATION-QUEUE.md).
- 🧑 External tax reviewer + lending reviewer engagement (Gate 1/2 checkpoints).

## Rules and sources (§35.3)

- ✅ 22 rule packs authored, hash-pinned, fail-closed, statuses `in_review`; sources cited with retrievedAt + sha256; page snapshots archived in compliance-archive/.
- 🧑 Verify every pack against its source and set `status: "active"` (+`verifiedAt`), then `pnpm --filter @paymentcalcs/rules-au rules:hash` and redeploy. Until then production shows "Rules unavailable" for statutory calculators.
- 🧑 VIC/WA/SA/ACT/NT stamp duty tables need manual transcription (fetch blocked/JS-rendered).

## Compliance (§35.4)

- ✅ §17.9 universal disclosure verbatim on every calculator; §12.5.10 mortgage disclosure; Class C affordability addendum; no "should/we recommend/best for you" in result copy (lint-enforced; one documented conflict D-011 for counsel).
- 🧑 Legal review against ASIC Instrument 2026/41 (§17.2) — book counsel; provide PROGRESS.md D-011 and the disclosure components.

## Privacy and security (§35.5–35.6)

- ✅ All analytics through the §18.4 allowlist wrapper with rejection tests; Plausible manual pageviews path-only (no query strings); no cookies; IndexedDB-only saves; security headers set.
- 🧑 Confirm the Plausible account/domain and enable it in production DNS.

## UX, accessibility, performance (§35.7–35.8)

- ✅ 33 Playwright e2e including axe WCAG 2.2 A/AA scans on calculator pages in both themes and a 390px mobile suite (no horizontal scroll, ≥44px targets); charts ship table alternatives; reduced-motion respected.
- ✅ First Load JS ~120–190KB per route with charts dynamically imported (largest: mortgage routes).
- 🧑 Lighthouse run on the production URL after rule activation, and set the CI byte budgets from that first measurement (§27).

## Content and SEO (§35.9)

- ✅ Category indexes, /calculators, per-route /methodology pages, /sources register, /changelog, llms.txt, robots.txt with AI-crawler allowances, sitemap.xml, per-route metadata + canonical + OG.
- 🧑 Point the paymentcalcs.com domain at the Vercel project (currently paymentcals.vercel.app).

## Operations (§35.10)

- ✅ GitHub CI on push; deployments reproducible from main; preview deployments noindex with draft-rules banner.
- 🧑 Owner decisions logged in PROGRESS.md awaiting veto/confirmation: D-006 (draft rules on previews), D-011 (disclosure copy conflict).

## The 30-minute path to a fully live production site

1. Verify `au-gst-standard` + the three income-tax/Medicare/STSL/super pack families against their cited pages (VERIFICATION-QUEUE.md has every value listed).
2. Set each verified pack's `status` to `"active"` and fill `verifiedAt`/`approvedBy`.
3. Run `pnpm --filter @paymentcalcs/rules-au rules:hash`, commit, `vercel deploy --prod`.
4. Statutory calculators switch on automatically; stamp duty for NSW/QLD/TAS activates the same way.
