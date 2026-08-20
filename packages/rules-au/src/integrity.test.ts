import { describe, expect, it } from "vitest";
import { computePackHash, manifestKey, resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, gstPack } from "./index";

describe("pack governance invariants", () => {
  it("no agent-authored pack is ever active or verified", () => {
    for (const pack of allAuRulePacks) {
      expect(pack.status).toBe("in_review");
      expect(pack.verifiedAt).toBeNull();
      expect(pack.review.approvedBy).toBeNull();
    }
  });

  it("every pack cites at least one source with retrievedAt", () => {
    for (const pack of allAuRulePacks) {
      expect(pack.sources.length).toBeGreaterThan(0);
      for (const source of pack.sources) expect(source.retrievedAt).toBeTruthy();
    }
  });

  it("integrity manifest matches the library's canonical hash (script/lib cross-check)", async () => {
    for (const pack of allAuRulePacks) {
      expect(auIntegrityManifest[manifestKey(pack)]).toBe(await computePackHash(pack));
    }
  });
});

describe("fail-closed resolution", () => {
  const query = {
    domain: "gst",
    jurisdiction: "AU",
    valuationDate: "2026-08-20",
  } as const;

  it("refuses to run an in_review pack in production mode (PC-RULE-0002)", async () => {
    const outcome = await resolveRulePack(allAuRulePacks, auIntegrityManifest, query);
    expect(outcome).toMatchObject({ ok: false, code: "PC-RULE-0002" });
  });

  it("runs the draft pack only under allowDraftRules, flagged as draft", async () => {
    const outcome = await resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      ...query,
      allowDraftRules: true,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.draft).toBe(true);
      expect(outcome.pack.rulePackId).toBe("au-gst-standard");
      expect(outcome.manifestRef.integritySha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("fails closed on a tampered pack (PC-RULE-0003)", async () => {
    const tampered = { ...gstPack, rules: { standardRate: "0.15" } };
    const outcome = await resolveRulePack([tampered], auIntegrityManifest, {
      ...query,
      allowDraftRules: true,
    });
    expect(outcome).toMatchObject({ ok: false, code: "PC-RULE-0003" });
  });

  it("fails closed when no pack covers the domain or date (PC-RULE-0001)", async () => {
    const missingDomain = await resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      ...query,
      domain: "land-tax",
      allowDraftRules: true,
    });
    expect(missingDomain).toMatchObject({ ok: false, code: "PC-RULE-0001" });

    const beforeCommencement = await resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      ...query,
      valuationDate: "1999-01-01",
      allowDraftRules: true,
    });
    expect(beforeCommencement).toMatchObject({ ok: false, code: "PC-RULE-0001" });
  });
});
