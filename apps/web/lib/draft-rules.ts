/**
 * Non-negotiable #12: PC_ALLOW_DRAFT_RULES may never take effect in a
 * production deployment. All values are inlined at build time:
 * - local dev (NODE_ENV !== "production"): flag works, DRAFT banner shows;
 * - Vercel *preview* deployments (NEXT_PUBLIC_VERCEL_ENV === "preview",
 *   a system-provided value): flag works, DRAFT banner shows — owner-approved
 *   demo surface, see PROGRESS.md D-006;
 * - production deployments (NEXT_PUBLIC_VERCEL_ENV === "production" or any
 *   non-Vercel production build): compiles to false. Impossible to enable.
 */
export const allowDraftRules: boolean =
  process.env.NEXT_PUBLIC_PC_ALLOW_DRAFT_RULES === "1" &&
  (process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview");
