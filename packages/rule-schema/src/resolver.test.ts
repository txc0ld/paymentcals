import { describe, expect, it } from "vitest";
import { computePackHash, manifestKey } from "./integrity";
import { resolveRulePack } from "./resolver";
import type { RulePackV1 } from "./schema";

function makePack(overrides: Partial<RulePackV1>): RulePackV1 {
  return {
    rulePackId: "test-pack",
    jurisdiction: "AU",
    subdivision: null,
    domain: "test",
    effectiveFrom: "2025-07-01",
    effectiveTo: null,
    status: "active",
    schemaVersion: 1,
    rulesVersion: "1.0.0",
    sources: [
      {
        sourceId: "s1",
        authority: "Test Authority",
        title: "Test",
        url: "https://example.gov.au/x",
        jurisdiction: "AU",
        domain: "test",
        retrievedAt: "2026-08-20T00:00:00+08:00",
      },
    ],
    review: { preparedBy: "p", approvedBy: "a", approvedAt: "2026-08-20T00:00:00+08:00" },
    verifiedAt: "2026-08-20T00:00:00+08:00",
    rules: { value: "1" },
    ...overrides,
  };
}

async function manifestFor(...packs: RulePackV1[]) {
  const manifest: Record<string, string> = {};
  for (const pack of packs) manifest[manifestKey(pack)] = await computePackHash(pack);
  return manifest;
}

const query = { domain: "test", jurisdiction: "AU", valuationDate: "2026-08-20" } as const;

describe("resolver selection", () => {
  it("prefers an active pack over a draft-runnable one even with allowDraftRules", async () => {
    const active = makePack({ rulePackId: "older-active", effectiveFrom: "2024-07-01" });
    const draft = makePack({
      rulePackId: "newer-draft",
      status: "in_review",
      effectiveFrom: "2026-07-01",
    });
    const outcome = await resolveRulePack([draft, active], await manifestFor(active, draft), {
      ...query,
      allowDraftRules: true,
    });
    expect(outcome.ok && outcome.pack.rulePackId).toBe("older-active");
    expect(outcome.ok && outcome.draft).toBe(false);
  });

  it("picks the most recently effective among multiple active packs", async () => {
    const older = makePack({ rulePackId: "fy-2025", effectiveFrom: "2025-07-01", effectiveTo: null });
    const newer = makePack({ rulePackId: "fy-2026", effectiveFrom: "2026-07-01", effectiveTo: null });
    const outcome = await resolveRulePack([older, newer], await manifestFor(older, newer), query);
    expect(outcome.ok && outcome.pack.rulePackId).toBe("fy-2026");
  });

  it("matches subdivision exactly when queried", async () => {
    const nsw = makePack({ rulePackId: "nsw", subdivision: "NSW" });
    const vic = makePack({ rulePackId: "vic", subdivision: "VIC" });
    const outcome = await resolveRulePack([nsw, vic], await manifestFor(nsw, vic), {
      ...query,
      subdivision: "VIC",
    });
    expect(outcome.ok && outcome.pack.rulePackId).toBe("vic");
  });

  it("respects effectiveTo — an expired pack does not cover a later date", async () => {
    const expired = makePack({ effectiveTo: "2026-06-30" });
    const outcome = await resolveRulePack([expired], await manifestFor(expired), query);
    expect(outcome).toMatchObject({ ok: false, code: "PC-RULE-0001" });
  });

  it("never runs withdrawn or superseded packs, even with allowDraftRules", async () => {
    for (const status of ["withdrawn", "superseded", "corrected"] as const) {
      const pack = makePack({ status });
      const outcome = await resolveRulePack([pack], await manifestFor(pack), {
        ...query,
        allowDraftRules: true,
      });
      expect(outcome.ok, status).toBe(false);
    }
  });
});
