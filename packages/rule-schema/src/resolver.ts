import type { ISODate, RulePackManifestRef } from "@paymentcalcs/calculation-core";
import { verifyPackIntegrity, type IntegrityManifest } from "./integrity.js";
import {
  DRAFT_RUNNABLE_STATUSES,
  RUNNABLE_STATUSES,
  type RulePackStatus,
  type RulePackV1,
} from "./schema.js";

export interface ResolveQuery {
  domain: string;
  jurisdiction: string;
  subdivision?: string | null;
  valuationDate: ISODate;
  /**
   * True only when the build runs with PC_ALLOW_DRAFT_RULES=1 in development.
   * Callers MUST derive this from a build-time guard that cannot be enabled in
   * production bundles; the resolver itself never reads the environment.
   */
  allowDraftRules?: boolean;
}

export type ResolveOutcome =
  | {
      ok: true;
      pack: RulePackV1;
      manifestRef: RulePackManifestRef;
      /** True when the pack ran only because draft rules are allowed (dev). */
      draft: boolean;
    }
  | {
      ok: false;
      /** §H.6 rule-resolution code. */
      code: "PC-RULE-0001" | "PC-RULE-0002" | "PC-RULE-0003";
      reason: string;
    };

function coversDate(pack: RulePackV1, date: ISODate): boolean {
  if (pack.effectiveFrom > date) return false;
  if (pack.effectiveTo !== null && pack.effectiveTo < date) return false;
  return true;
}

function statusRunnable(status: RulePackStatus, allowDraft: boolean): boolean {
  if (RUNNABLE_STATUSES.includes(status)) return true;
  return allowDraft && DRAFT_RUNNABLE_STATUSES.includes(status);
}

/**
 * Fail-closed rule-pack resolution (§16.6, non-negotiable #12).
 * Any failure returns a structured error; callers render the
 * "Rule unavailable" state and MUST NOT substitute another rule set.
 */
export async function resolveRulePack(
  packs: readonly RulePackV1[],
  manifest: IntegrityManifest,
  query: ResolveQuery,
): Promise<ResolveOutcome> {
  const allowDraft = query.allowDraftRules === true;
  const candidates = packs.filter(
    (pack) =>
      pack.domain === query.domain &&
      pack.jurisdiction === query.jurisdiction &&
      (query.subdivision === undefined || pack.subdivision === (query.subdivision ?? null)) &&
      coversDate(pack, query.valuationDate),
  );

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "PC-RULE-0001",
      reason: `no rule pack for domain "${query.domain}" (${query.jurisdiction}) covering ${query.valuationDate}`,
    };
  }

  const runnable = candidates.filter((pack) => statusRunnable(pack.status, allowDraft));
  if (runnable.length === 0) {
    return {
      ok: false,
      code: "PC-RULE-0002",
      reason: `rule pack exists but none is active (statuses: ${candidates.map((p) => p.status).join(", ")})`,
    };
  }

  // Prefer active over draft-runnable; then the most recently effective.
  const chosen = [...runnable].sort((a, b) => {
    const aActive = RUNNABLE_STATUSES.includes(a.status) ? 1 : 0;
    const bActive = RUNNABLE_STATUSES.includes(b.status) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return a.effectiveFrom < b.effectiveFrom ? 1 : a.effectiveFrom > b.effectiveFrom ? -1 : 0;
  })[0]!;

  const integrity = await verifyPackIntegrity(chosen, manifest);
  if (!integrity.ok) {
    return { ok: false, code: "PC-RULE-0003", reason: integrity.reason };
  }

  return {
    ok: true,
    pack: chosen,
    draft: !RUNNABLE_STATUSES.includes(chosen.status),
    manifestRef: {
      rulePackId: chosen.rulePackId,
      rulesVersion: chosen.rulesVersion,
      status: chosen.status,
      integritySha256: integrity.sha256,
    },
  };
}
