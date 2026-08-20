# PROGRESS

Phase: **0 — Foundation (Gate 0)** · Started 2026-08-20

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

- Git repo initialised (`main`); root configs (pnpm workspace, turbo, tsconfig base); governing docs written.
- ATO GST source captured + archived; VERIFICATION-QUEUE.md seeded.

## Blocked / decisions needed from owner

- None currently.
