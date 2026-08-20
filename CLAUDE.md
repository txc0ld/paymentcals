# PaymentCalcs — Working Rules

Canonical spec: `docs/PaymentCalcs_PRD_v2.md` (§0.0 Merge Record overrides base text).
Build directive: `docs/CLAUDE_CODE_P0_BUILD_PROMPT.md`. PRD wins on conflict — flag in `PROGRESS.md`.
Session protocol: read this file, `PROGRESS.md`, and the current phase's PRD sections at session start; update `PROGRESS.md` + `VERIFICATION-QUEUE.md` at session end.

## Non-negotiables (release-gating)

1. **No statutory number from memory.** Every jurisdiction/year-dependent value lives in `packages/rules-au/` with source URL, `retrievedAt`, content hash, and status. Packs authored here are always `in_review`, never `active` — activation is a human action. If a source can't be fetched, the pack ships with `null` values.
2. **Engines are pure:** `(request, rulePacks) => result` per §14. No network, no `Date.now()`, no UI imports. Money = integer minor units serialised as strings (branded type, never `number`); rate maths uses `decimal.js`.
3. **E02 (annual liability) ≠ E03 (withholding).** Separate engines, separately labelled outputs. Never annual ÷ periods where an official schedule applies.
4. **Mortgage = scheduled ledger** (payment-period, daily-capable contracts, daily mode NOT built at P0).
5. **Reconciliation failure = engine failure**, never a cosmetic warning (§13.30).
6. **Solvers:** monotonic bisection with §13.28 safeguards; no plausible numbers after failed convergence.
7. **No accounts/DB/auth/server storage.** IndexedDB save; versioned URL share; client-side calc; heavy schedules in a Web Worker.
8. **Analytics only via `packages/analytics-safe`** — rejects money/income/balance/rate-as-fact/age/free-text props; tests prove rejection. Plausible; no cookies.
9. **No LLM in any calculation path.**
10. **No super/retirement routes at P0.**
11. **Disclosures** render versioned §17.9 copy verbatim. Result surfaces never say "should", "we recommend", "best for you" (lint + content test).
12. **Fail closed:** unresolvable/integrity-failed rule pack ⇒ "Rule unavailable" state, never a wrong number. `PC_ALLOW_DRAFT_RULES=1` runs `in_review` packs in dev only, behind a persistent DRAFT banner; impossible in production builds.

## Conventions

- Stack (locked): Next.js App Router · React · TS strict · Tailwind 4 + `design-tokens` · pnpm + Turborepo · Zod · decimal.js · Temporal polyfill · Vitest · fast-check · Playwright + axe · Recharts (dynamic). **No new runtime deps without asking.**
- Verify before claiming: run affected suites after every change; full `pnpm verify` before ending a session. Conventional commits; every commit green.
- Golden fixtures ship with `expected: null` for the owner to fill from official calculators; CI counts unverified goldens. Boundary/property/metamorphic/differential tests are self-owned and always on.
- Design: STRATA Swiss-editorial aesthetic (owner-directed, `docs/DESIGN.md`) merged with PRD §20 functional rules — see PROGRESS.md decision log. Every monetary value renders in mono with `tabular-nums`.
- Decide freely: file layout, internals, naming, tests. Ask first: new runtime deps, §14 contract deviations, disclosure copy changes, route-set changes, compliance-adjacent gaps.
