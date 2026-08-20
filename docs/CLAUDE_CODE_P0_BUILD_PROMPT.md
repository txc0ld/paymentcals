# PaymentCalcs — P0 Build Directive for Claude Code

You are building **PaymentCalcs.com P0**: the public-launch set of Australian financial calculators defined by the PRD at `docs/prd/PaymentCalcs_PRD_v2.md`. This directive governs the entire build. Read it fully before writing any code, then follow the Session Protocol.

---

## 1. Source of truth and precedence

1. `docs/prd/PaymentCalcs_PRD_v2.md` is the canonical spec. Its **§0.0 Merge Record** amendments override the base text where they conflict.
2. This directive is the build-ordering and working-conventions layer. If it conflicts with the PRD, **the PRD wins** — flag the conflict in `PROGRESS.md` and ask before proceeding.
3. The PRD is ~300KB. Do not hold it all in context. Before each workstream, read only the sections named in that phase's task list (use targeted reads). Key sections you will return to repeatedly: §9 (shell), §10 (registry), §11 (engines), §12 (flagship specs), §13 (maths), §14 (contracts), §16 (rule packs), §17.9 (disclosure copy), §20 (design), §22 (stack), §24.10–24.12 (AEO), §27 (budgets), §36 (definition of done).

## 2. Non-negotiables (release-gating, no exceptions)

1. **Never write a tax rate, threshold, duty bracket, cap or levy from memory.** Your training data about Australian rates is presumed stale. Every jurisdiction- or year-dependent number lives in a rule pack (`packages/rules-au/`) with source URL, `retrievedAt`, and status — never in engine or UI code. If you can fetch the official source (ATO / state revenue office URLs in PRD §37.4–37.5), author a **draft** pack from it; if you cannot fetch, author the pack **structure** with `null` values. Either way, status is `in_review`, never `active`. Activation is a human action.
2. **Engines are pure and deterministic.** `(request, rulePacks) => result` per the §14 contracts. No network, no `Date.now()`, no UI imports, no floating-point currency. Money is integer minor units (serialised as strings) per §14.1; rate/compounding maths uses `decimal.js`. Ban `number` for currency in engine packages via a lint rule and branded types.
3. **E02 (annual tax liability) and E03 (PAYG withholding) are separate engines with separately labelled outputs.** Never derive withholding as annual ÷ periods where an official schedule applies (§13.16, Merge Record #2). E03 consumes the official schedule formulas from rule packs.
4. **Mortgage scope = scheduled ledger** (Merge Record #3): payment-period ledger with dated/recurring events, offsets, IO periods, fees, reconciliation invariants (§12.5.8). Architecture must be daily-capable (day-count fields exist in contracts) but daily accrual mode is NOT built at P0. The Simulator route badges "Scheduled model".
5. **Reconciliation is mandatory** for every schedule-producing engine (§13.30). A failed reconciliation is an engine failure state, never a cosmetic warning.
6. **Solvers** use monotonic bisection with the §13.28 safeguards. A solver must never return a plausible-looking number after failing to converge.
7. **No accounts, no database, no auth, no server-side scenario storage at P0.** Anonymous save = IndexedDB. Share = versioned URL-encoded state (Merge Record #5). All calculation runs client-side; heavy schedules run in a Web Worker (§22.4).
8. **Analytics redaction:** all analytics flow through `packages/analytics-safe`, which rejects any event property that is a money amount, income, balance, rate-as-personal-fact, age, or free text (§18.4). Write tests that prove rejection. Provider: Plausible script tag; no cookies, no consent banner.
9. **No LLM anywhere in the calculation path.** Deterministic engines only (PRD Fixed Decision #4).
10. **No super/retirement routes at P0.** They sit behind a separate compliance track (§17.3). Do not scaffold them "while you're there".
11. **Disclosures** render from versioned components using the exact §17.9 copy. Result-surface copy must never contain "should", "we recommend", or "best for you" — add a lint/content test for these strings in result components.
12. **Fail closed:** a route that cannot resolve an integrity-checked rule pack renders the §20.12 "Rule unavailable" state, never a wrong number. For local dev, `PC_ALLOW_DRAFT_RULES=1` may run `in_review` packs behind a persistent "DRAFT RULES — NOT VERIFIED" banner; that flag must be impossible to enable in production builds.

## 3. Verification protocol (the human-in-the-loop design)

You cannot verify Australian statutory numbers yourself. Build the system so unverified data is loud, not silent:

- **Rule packs:** every pack carries `status`, `sources[]` (URL + `retrievedAt` + content hash where fetched), and `verifiedAt: null` until the owner verifies. Maintain `VERIFICATION-QUEUE.md` at repo root listing every pack and every value awaiting human verification, grouped by source URL, with checkboxes.
- **Golden fixtures:** create fixture files per engine per FY (`packages/test-fixtures/`) with fully specified **inputs** and `expected: null`. The owner fills expected values from the official ATO/state calculators. CI splits golden tests into `verified` (must pass) and `unverified` (skipped but **counted and reported** in CI output). A route's DoD requires its verified-golden suite green — so nothing ships on your numbers alone.
- **Always-on self-verifiable tests** (these you own fully): boundary tests at every bracket edge, property tests (`fast-check`: net pay monotone non-decreasing in gross; tax ≤ income; schedules terminate at zero), metamorphic tests, differential tests (ledger vs closed-form on simple scenarios), reconciliation invariants, solver round-trips (solved gross re-fed forward hits target within tolerance).

## 4. Locked stack (PRD §22.2; current stable versions at install time)

Next.js (App Router) · React · TypeScript strict · Tailwind CSS 4 with `packages/design-tokens` · pnpm workspaces + Turborepo · Zod · decimal.js · `@js-temporal/polyfill` for the date layer · Vitest · fast-check · Playwright + axe for browser/a11y · Recharts (dynamically imported; every chart has an accessible data-table view per §9.1 mobile rules). Deploy target Vercel. No Postgres, no CMS, no Sentry account yet (stub an error-reporting adapter with redaction so it can be wired later). Add no other runtime dependency without asking.

**Monorepo (P0 subset of §22.3):** `apps/web` · `packages/`: `calculation-core` (E01), `engine-au-tax` (E02), `engine-au-withholding` (E03), `engine-compensation` (E04), `engine-mortgage-ledger` (E07), `engine-property` (E08 + E10-lite), `engine-loans` (E11), `engine-debt` (E12), `engine-savings` (E14), `engine-business` (E19+E20), `financial-solvers` (E24), `rule-schema`, `rules-au`, `calculator-registry`, `scenario-schema`, `calculation-ui`, `design-tokens`, `analytics-safe`, `test-fixtures`, `eslint-config`. Do **not** create `apps/admin`, `apps/api`, `embed-sdk`, `report-generator`, or any super/investment engine at P0.

## 5. Definitive P0 route set (build these, only these)

From PRD §10 with Merge Record #4 additions — 27 routes over 13 engines. Variant surfaces share an engine; each still gets distinct defaults, copy, metadata and tests (§24.3).

| Group | Routes |
|---|---|
| Pay & Tax | AU-PAY-001 pay calculator (flagship, §12.1 in full) · 002 take-home · 003 gross-to-net · 004 net-to-gross (§12.2) · 005 salary-inc-super (§12.1.7 conditional formula + iterative solve) · 006 hourly-to-salary · 007 salary-to-hourly · 011 PAYG withholding · 013 HELP repayment |
| Property | AU-HOME-001 repayments (§12.4) · 002 simulator (scheduled mode, §12.5) · 004 extra repayments · 006 offset · 007 rate change · 012 refinance break-even (§12.7) · 017 stamp duty (§12.8) · 018 complete buying costs · 019 deposit · 020 LVR · 022 affordability estimate (Class C, range output, §17.5 discipline) |
| Debt | AU-DEBT-001 general loan · 003 car loan · 012 credit-card payoff (§12.11) |
| Savings | GL-SAVE-002 compound interest (§12.13) · 003 savings goal |
| Business | AU-BIZ-001 GST (§12.15) · 006 contractor day rate (§12.16) |

Stamp duty covers all eight jurisdictions as separate rule packs; if a jurisdiction's pack can't be drafted from sources, the state renders explicitly "not yet supported" (Gate 3 rule) — never a guess.

## 6. Build phases (map to PRD Gates 0–3; complete in order; stop at each checkpoint)

**Phase 0 — Foundation (Gate 0).** Read §11.2, §11.7, §14, §16, §20, §22, §27. Scaffold monorepo + CI (typecheck, lint incl. currency-number ban and banned-verbs check, Vitest, Playwright+axe, Lighthouse budget assertions). Build: design tokens (palette + type below), rule-schema + pack loader with integrity hash + status resolver + fail-closed behaviour, calculation request/result/scenario contracts (§14) with Zod, calculator-registry (machine-readable, §10.1 fields), analytics-safe wrapper + tests, calculator shell (§9.1 layouts, Simple/Advanced modes, explainability tabs §9.5, URL-state protocol, IndexedDB save, print CSS), the §20.12 standard states. Prove the template with **AU-BIZ-001 GST** end-to-end (Class A, minimal rule surface). Write `CLAUDE.md` (condense §2 non-negotiables + conventions) and `PROGRESS.md`. **Checkpoint: owner reviews shell + GST route before Phase 1.**

**Phase 1 — Pay slice (Gate 1).** Read §12.1–12.2, §13.13–13.17, §13.27–13.28. Build E01 primitives, E02, E03, E04, E24 (bisection core). Author draft rule packs for FY2024-25, 2025-26, 2026-27 (income tax, offsets, Medicare/MLS, HELP marginal bands, SG + contribution base) from §37.4 sources per the §3 protocol. Ship the nine PAY routes with the §12.1 modes, output separation (liability vs withholding, PAY-AC-002), boundary tests at every bracket edge (PAY-AC-003), fixture scaffolds + verification queue. **Checkpoint: owner verifies rule packs + fixtures against ATO tools; external tax review booked.**

**Phase 2 — Mortgage slice (Gate 2).** Read §12.4–12.7, §11.5, §13.5–13.10, §13.30. Build E07 scheduled ledger (event timeline per §12.5.3 subset: rate change, recurring/one-off extra, offset events, fees, IO expiry; repayment reset policies; invariants §12.5.8; reconciliation), E11, Compare mode, timeline editor component, Web Worker execution for schedules. Ship the six HOME loan routes. Differential-test ledger vs closed-form (MORT-AC-001). **Checkpoint: owner review; lending reviewer engaged.**

**Phase 3 — Breadth + launch surface (Gate 3).** Read §12.8–12.16, §24 (all, incl. 24.10–24.12), §17.8–17.9, §27. Build E08 + eight draft duty packs (each pack cites its revenue-office source; unsupported states blocked visibly), E10-lite (editable expense floors labelled editable defaults — no HEM claims), E12, E14, E19/E20 remainder. Ship remaining routes. Then the launch surface: category + all-calculators pages, `/methodology/` pages per route (formula registry references, §13.29), `/sources/`, `/changelog/`, `llms.txt`, robots + AI-crawler allows, per-route metadata/OG/schema (§24.4), noindex rules (§24.9), citable-atom worked examples rendered from fixtures, internal links per §24.8. Full a11y and performance audit against §27 budgets. **Checkpoint: launch-readiness report.**

**Phase 4 — Handoff.** Produce `LAUNCH-READINESS.md`: §35 checklist with every item marked automated-pass / needs-human (legal review §17.2 against Instrument 2026/41, fixture verification, reviewer sign-offs, Plausible + domain + deploy). Do not deploy to production yourself.

## 7. Design tokens (PRD §20; do not invent a look)

Palette: `--pc-ink-950 #0b0d0f · --pc-ink-900 #121519 · --pc-ink-800 #1b2025 · --pc-paper-50 #f7f8f4 · --pc-paper-100 #f1f3ee · --pc-grey-500 #7f8790 · --pc-grey-400 #a7adb3 · --pc-lime-500 #CCFF00 · --pc-blue-500 #3977ff · --pc-amber-500 #f3a712 · --pc-red-500 #e5484d · --pc-green-600 #18794e`. Usage rules per §20.2 (lime never body text on light; semantic colours always paired with non-colour cues). Type: **Hanken Grotesk** (800 display) for interface; **JetBrains Mono** with `font-variant-numeric: tabular-nums` for every monetary value, result, table, formula. Light theme default, dark theme required, system-preference initial, no theme flash. Radius 12/8; borders over shadows; §20.4 scale.

## 8. Working conventions

- **Session protocol:** at the start of every session read `CLAUDE.md`, `PROGRESS.md`, and the current phase's PRD sections. At the end of every session update `PROGRESS.md` (done / in-flight / blocked / decisions needed) and `VERIFICATION-QUEUE.md`.
- **Plan before code:** open each phase by writing its task breakdown into `PROGRESS.md`, then execute tasks smallest-first. One engine or route per commit series; conventional commits; every commit leaves typecheck + tests green.
- **Verify as you go:** run the affected test suites after every change; run the full suite + Lighthouse budgets before ending a session. Never mark a task done with failing or skipped-without-cause tests.
- **Decide vs ask.** Decide freely: file layout, component internals, naming, test structure, anything the PRD already fixes. **Ask first:** new runtime dependencies; any deviation from §14 contracts or money representation; changes to disclosure copy; scope changes to the §5 route set; anything where the PRD is silent on a compliance-adjacent behaviour. Log every judgment call in `PROGRESS.md`.
- **Definition of done per route** (§36 condensed): registry entry complete · shell-compliant with modes per spec · URL state + IndexedDB save + print/PDF · explainability tabs populated (working, assumptions with §9.5 category labels, sources, limitations) · disclosures wired · metadata/schema/OG · internal links · boundary + property + reconciliation tests green · fixture scaffolds queued · axe clean · budget pass.

Begin now with Phase 0. First actions: initialise the repo, write `CLAUDE.md` and `PROGRESS.md`, then scaffold.
