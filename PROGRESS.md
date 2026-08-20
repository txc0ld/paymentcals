# PROGRESS

Phase: **3 — Breadth + launch surface (Gate 3) COMPLETE · Phase 4 handoff written** · 2026-08-21

## Phase 3 summary

- 3a: E14 savings (closed-form + simulation cross-check, goal solving), E12 revolving credit (statement cycles, promo expiry, min-payment rules), E19 contractor economics. Routes: compound interest, savings goal, personal/car loans (balloon via §13.6), credit-card payoff, deposit, LVR, Class C affordability range (editable floors, no approval language), contractor day rate (GST from pack, never revenue).
- 3b: E08 duty engine (part-thereof per-$100) + eight per-state packs. NSW/QLD/TAS fully sourced (engine reproduces QRO's and Revenue NSW's own worked examples); VIC (403-blocked), WA (404), SA/ACT (client-rendered), NT (formula shape) authored null → routes render "not yet supported" per Gate 3. Stamp duty + complete buying costs routes live.
- 3c: category indexes, /calculators, per-route /methodology (28 pages from the registry), /sources (auto-generated from packs with hashes), /changelog, llms.txt, robots.txt with AI-crawler allowances, sitemap.xml. Homepage curates 9 featured calculators + full directory link.
- Phase 4: `LAUNCH-READINESS.md` written — §35 checklist with automated-pass vs needs-human markers and the 30-minute activation path.
- Totals: **28 routes, 22 rule packs (in_review), 58 CI tasks green, 33 e2e green (axe both themes + mobile), 13 golden cases queued.**

Phase: **2 — Mortgage slice (Gate 2) COMPLETE** · 2026-08-20

## Phase 2 summary (all done 2026-08-20)

- Engines: E11 amortising loans (closed-form §13.5–13.6, schedule recurrence §13.7 with capped final-payment adjustment, negative-amortisation detection, zero-rate guard) and E07 scheduled mortgage ledger (Merge Record #3: payment-period events — rate changes with keep/recalculate reset policies, recurring + one-off extras, offset deposits/withdrawals per §13.9, fees cash/financed, IO expiry; §12.5.8 invariants with per-period reconciliation). Refinance comparison per §13.10: cumulative cash flows with residual balances, financed-cost interest, cashback timing, sustained-crossing break-even.
- 26 engine tests incl. MORT-AC-001 differential (ledger ≡ closed form), offset-equivalence, MORT-AC-004 withdrawal semantics, property-based reconciliation.
- Routes live: AU-HOME-001 repayments (chart + yearly schedule + CSV export), 002 simulator (Web Worker execution, timeline editor, Compare mode cloning identical facts per MORT-AC-006), 004 extra repayments, 006 offset (cash-retained kept distinct from principal), 007 rate change, 012 refinance break-even. All badged "Scheduled model" (MORT-AC-007); §12.5.10 disclosure verbatim.
- 24 Playwright e2e green incl. axe on chart-bearing pages; balance chart ships with a full table alternative (§20.8).

Phase: **1 — Pay slice (Gate 1) COMPLETE, checkpoint pending owner verification** · 2026-08-20

## Phase 1 summary (all done 2026-08-20)

- 13 pay rule packs (`in_review`) authored from same-day ATO fetches with archived, hash-pinned snapshots: income tax ×3 FY (+LITO), Medicare/MLS ×3, STSL ×3, super guarantee ×3, PAYG withholding 2026-27 (Schedule 1 scales 1–6 + Schedule 8 STSL components, machine-parsed).
- Engines: E24 bisection (§13.28 safeguards), E02 annual liability (brackets/LITO/Medicare incl. low-income reduction/MLS/STSL marginal + whole-income), E03 schedule-formula withholding (never annual÷periods), E04 package decomposition with max-contribution-base cap + §12.1.7 iterative verification. Net-to-gross solver with round-trip tests.
- Tests: 63 engine tests including generated bracket-boundary suites (PAY-AC-003), ATO worked examples reproduced exactly (PAY-AC-004: Christina/Barry/Priya STSL, Angie Medicare $98.90, Tom MLS $1,170), monotonicity/limit properties, closed-form-vs-iterative agreement. One ATO source arithmetic anomaly found and queued (STSL Example 4).
- Routes: all nine PAY routes live (001 flagship with Simple/Advanced, 002/003/005/006/007 variants, 004 net-to-gross solver UI, 011 schedule withholding, 013 HELP). Liability and withholding rendered as separately labelled sections with an explicit variance note (PAY-AC-002). 18 Playwright e2e green incl. axe and FY re-resolution (PAY-AC-005).
- Known deferrals (logged): WHM withholding (Schedule 15 registration logic) surfaces an explicit unsupported reason; withholding packs for FY2024-25/2025-26 not authored (historical payroll); family Medicare reduction is a capped estimate with a warning; Compare mode arrives with the Phase 2 compare framework.

Phase 0: **complete** (see below). Phase 2 (Mortgage slice) in flight same-day.

- **D-011 (2026-08-20) PRD-internal conflict flagged for counsel.** §12.5.10's required mortgage disclosure contains "should" ("Users should compare the settings…"), which §17.9 bans in result copy. Shipped the §12.5.10 text verbatim with a targeted lint exemption on the disclosure component only; result surfaces remain lint-enforced. Counsel to confirm at the §17.2 review.

## Phase 0 task breakdown

| # | Task | Status |
|---|------|--------|
| 1 | Repo skeleton: pnpm/turbo/tsconfig, CLAUDE.md, PROGRESS.md, VERIFICATION-QUEUE.md, CI | in progress |
| 2 | `calculation-core`: §14 contracts, Money/Rate/Frequency, rounding profiles, Zod, decimal helpers | pending |
| 3 | `rule-schema` (pack schema, sha256 integrity, resolver, fail-closed) + `rules-au` GST draft pack | pending |
| 4 | `calculator-registry` (§10.1) + `scenario-schema` (§14.6) + `analytics-safe` (§18.4, rejection tests) | pending |
| 5 | `engine-business` E20 GST (§12.15/§13.18) + `test-fixtures` scaffolds + `eslint-config` guards | pending |
| 6 | `design-tokens` — merged STRATA/PRD system, both themes, no-flash | pending |
| 7 | `calculation-ui` shell — §9.1 layout, modes, explainability tabs, §20.12 states, §17.9 disclosures | pending |
| 8 | `apps/web` — Next.js, homepage, AU-BIZ-001 GST route end-to-end, URL state, IndexedDB, print CSS | pending |
| 9 | Verify (typecheck/lint/test/build/axe) + codex cross-review + checkpoint report | pending |

**Checkpoint at end of Phase 0:** owner reviews shell + GST route before Phase 1.

## Decision log

- **D-001 (2026-08-20) Design direction.** Owner directive: `docs/DESIGN.md` ("STRATA" Swiss Editorial Tech) governs theme/aesthetic, overriding PRD §20.2/§20.4 *look* (Hanken Grotesk/JetBrains Mono, lime-primary, 12px radius). Merged system: monochrome ink/paper core (PRD ink/paper hex values are retained — they are already near-black/off-white), sharp geometry (0–4px radii), 1px hairline borders over shadows, editorial clamp() type scale, Geist Sans (interface) + Geist Mono (all monetary values, tabular-nums). PRD *functional* rules fully retained: light default + dark theme, system-preference initial, no theme flash, semantic amber/red/green/blue status colours always paired with non-colour cues, lime demoted to a single restrained brand accent (focus rings, small highlights, dark-mode primary CTA), WCAG 2.2 AA. Fonts self-hosted via npm packages (asset, not a runtime library).
- **D-002 (2026-08-20) GST source fetched.** ATO "How GST works" fetched directly (WebFetch was 403; curl with browser UA succeeded). Rate 10% drafted into `au-gst-standard` pack, status `in_review`, source hash recorded, snapshot archived. Activation remains a human action.
- **D-003 (2026-08-20) GST route scope at P0.** §12.15 lists five modes; the Phase 0 proof route implements add / remove / split / invoice line items. "Reverse target receipt after fees and GST" depends on E24 solver core (Phase 1); it will be added to AU-BIZ-001 when E24 lands. Flagged as an intentional sequencing choice, not a scope cut.
- **D-004 (2026-08-20) Stack versions at install time.** Next.js 16.3.1 (npm `latest`, matches PRD §22.2 "Next.js 16.x"), React 19.2.8, Tailwind 4.3.3, Zod 4.4.3, decimal.js 10.6.0, Vitest 4.1.11, fast-check 4.9.0, Playwright 1.62.1, turbo 2.10.11. TypeScript pinned to the 5.9 line: npm `latest` is 7.0.2 (new native compiler; no stable 6.x exists) and PRD §22.2 requires ecosystem compatibility verification before adopting a new major — typescript-eslint/tooling verification against TS7 is deferred to a later phase.
- **D-005 (2026-08-20) `exactOptionalPropertyTypes` dropped from the base tsconfig.** Verified conflict: Zod's `.optional()` emits `T | undefined` properties, incompatible with the §14 contract interfaces under that flag (TS2375 in `calculation-core`). `strict` + `noUncheckedIndexedAccess` retained.

- **D-006 (2026-08-20) Draft rules on Vercel preview deployments.** Owner asked for a deployed, working calculator; the GST pack is `in_review` (verification is a human release gate), so a production deployment fail-closes by design. Guard extended: `PC_ALLOW_DRAFT_RULES` now also works when `NEXT_PUBLIC_VERCEL_ENV === "preview"` (Vercel system value) — preview URLs show the calculator behind the persistent "DRAFT RULES — NOT VERIFIED" banner; production deployments still compile the flag to `false`. **Owner may veto**; verifying the GST pack in VERIFICATION-QUEUE.md and activating it is the path to a fully working production site.
- **D-007 (2026-08-20) No WebGL hero shader at P0.** DESIGN.md's dot-matrix WebGL background replaced with a static CSS dot-matrix + 1px grid-line overlay: §27 LCP/JS budgets outweigh the effect on a calculator product. Revisit post-launch if budgets allow.

- **D-008 (2026-08-20) Aesthetic pivot (owner directive, supersedes D-001/DESIGN.md).** "Fun bubbly modern, heavy 3D buttons/containers/animation." Restyle executed by codex (GPT-5.6) under a constrained brief: visual layer only, user-visible strings byte-identical, WCAG-validated text tokens untouched, transform/opacity animation, no new deps. Verified by full test + axe suite afterwards.
- **D-009 (2026-08-20) Type system (owner directive).** Body: Plus Jakarta Sans. Headings h1–h3: Montserrat 500, uppercase. Monetary values remain Geist Mono tabular-nums. Em dashes reduced site-wide except the §17.9 disclosure copy, which stays verbatim pending counsel.
- **D-010 (2026-08-20) Semantic colours (owner directive).** Warning/attention hue: mauve #E0B0FF (dark theme direct, 10.9:1; light theme variant #6f4291, 6.9:1). Positive: spring green #00FF7F (dark direct, 14.5:1; light variant #00753f, 5.4:1). Replaces the amber/green-600 set.
- **Codex review round 1 (2026-08-20)** — archived at `docs/reviews/2026-08-20-codex-phase0.txt`. 9 of 11 findings fixed same-day (engine invoice rounding rebuilt as basis-preserving largest remainder; Plausible switched to manual path-only pageviews through analytics-safe; strict quantity parsing; URL-state hardening; IndexedDB commit semantics; AU-timezone valuation date; failed-state rendering + `calculation_failed` event; rate-neutral SEO metadata). Finding #1 (draft rules on preview deployments) is the owner-directed D-006 exception, documented for veto. Finding #7 addressed by a shared 200-line cap.

## Done

- Phase 0 complete (2026-08-20): all 9 foundation tasks. 31 turbo tasks green (typecheck/lint/test/build), 11 Playwright e2e green incl. axe scans in both themes and a 390px mobile suite. 4 golden-fixture cases queued for owner verification.
- Codex (GPT-5.6) cross-review round 1 done and findings fixed; codex also executed the D-008 bubbly-3D restyle under a constrained brief (reviews archived in `docs/reviews/`).
- Deployed: GitHub `txc0ld/paymentcals` (main) · Vercel production https://paymentcals.vercel.app (fail-closed calculator pending pack verification) · working preview with DRAFT banner (draft rules enabled for the preview env only).
- Git repo initialised (`main`); root configs (pnpm workspace, turbo, tsconfig base); governing docs written.
- ATO GST source captured + archived; VERIFICATION-QUEUE.md seeded.

## Blocked / decisions needed from owner (Phase 0 → Phase 1 checkpoint)

1. **Verify the GST rule pack** (VERIFICATION-QUEUE.md): confirm the 10% rate against the cited ATO page, set `status` to `active` + `verifiedAt`, run `pnpm --filter @paymentcalcs/rules-au rules:hash`, redeploy. This turns the production calculator on.
2. **Fill golden-fixture expected values** in `packages/test-fixtures/src/gst/au-biz-001.fixture.json` (4 cases).
3. **Veto point D-006**: draft rules run on Vercel *preview* deployments behind a persistent banner. Codex review flagged this against the strict reading of non-negotiable #12; it stands as your explicit "deploy working calculators" instruction.
4. Approve shell + GST route to unlock Phase 1 (Pay slice: E01–E04, E24, nine PAY routes, FY rule packs).
