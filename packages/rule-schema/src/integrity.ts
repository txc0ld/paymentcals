import { canonicalHash } from "@paymentcalcs/calculation-core";
import type { RulePackV1 } from "./schema";

/**
 * Integrity manifest: pack ID + rules version → pinned sha256 of the pack's
 * canonical serialisation. The manifest is regenerated only by the explicit
 * `rules:hash` script; any drift between pack content and manifest is treated
 * as integrity failure and the resolver fails closed (§16.6).
 */
export type IntegrityManifest = Record<string, string>;

export function manifestKey(pack: RulePackV1): string {
  return `${pack.rulePackId}@${pack.rulesVersion}`;
}

export async function computePackHash(pack: RulePackV1): Promise<string> {
  return canonicalHash(pack);
}

export async function verifyPackIntegrity(
  pack: RulePackV1,
  manifest: IntegrityManifest,
): Promise<{ ok: true; sha256: string } | { ok: false; reason: string }> {
  const key = manifestKey(pack);
  const pinned = manifest[key];
  if (!pinned) return { ok: false, reason: `no integrity pin for ${key}` };
  const actual = await computePackHash(pack);
  if (actual !== pinned) {
    return { ok: false, reason: `integrity mismatch for ${key}` };
  }
  return { ok: true, sha256: actual };
}
