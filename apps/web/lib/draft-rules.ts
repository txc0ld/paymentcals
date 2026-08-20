/**
 * Non-negotiable #12: PC_ALLOW_DRAFT_RULES may only take effect in development.
 * `process.env.NODE_ENV` is inlined at build time, so in a production bundle
 * this whole expression compiles to `false` — the flag is impossible to enable.
 */
export const allowDraftRules: boolean =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PC_ALLOW_DRAFT_RULES === "1";
