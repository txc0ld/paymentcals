import { describe, expect, it } from "vitest";
import { computePackHash, manifestKey, resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, gstPack } from "./index";

describe("pack governance invariants", () => {
  /* Owner approved activation via chat on 2026-08-21 (PROGRESS.md D-016).
   * The invariant is now: a pack may only be active with an approval record,
   * and a pack whose rules carry null values may never be active. */
  /* Note: an ACTIVE pack may still carry null sub-tables (e.g. foreign
   * brackets not authored for a year); the engine fails closed on those
   * specific paths. Packs that are null-only (the unauthored duty states)
   * must never be active at all. */
  const NEVER_ACTIVE = [
    "au-stamp-duty-vic",
    "au-stamp-duty-wa",
    "au-stamp-duty-sa",
    "au-stamp-duty-act",
    "au-stamp-duty-nt",
  ];

  it("active packs carry an approval record; null-only packs stay in_review", () => {
    for (const pack of allAuRulePacks) {
      if (pack.status === "active") {
        expect(pack.review.approvedBy).toBeTruthy();
        expect(pack.review.approvedAt).toBeTruthy();
        expect(NEVER_ACTIVE).not.toContain(pack.rulePackId);
      } else {
        expect(pack.status).toBe("in_review");
        expect(pack.review.approvedBy).toBeNull();
        expect(pack.verifiedAt).toBeNull();
      }
    }
    for (const id of NEVER_ACTIVE) {
      const pack = allAuRulePacks.find((candidate) => candidate.rulePackId === id);
      expect(pack?.status).toBe("in_review");
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

  it("runs an owner-approved active pack in production mode, not flagged draft", async () => {
    const outcome = await resolveRulePack(allAuRulePacks, auIntegrityManifest, query);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.draft).toBe(false);
      expect(outcome.pack.rulePackId).toBe("au-gst-standard");
      expect(outcome.manifestRef.integritySha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  /* The VIC duty pack (null values, still in_review) is the fixture for the
   * fail-closed path now that the sourced packs are owner-activated. */
  const inReviewQuery = {
    domain: "stamp-duty",
    jurisdiction: "AU",
    subdivision: "VIC",
    valuationDate: "2026-08-20",
  } as const;

  it("refuses to run an in_review pack in production mode (PC-RULE-0002)", async () => {
    const outcome = await resolveRulePack(allAuRulePacks, auIntegrityManifest, inReviewQuery);
    expect(outcome).toMatchObject({ ok: false, code: "PC-RULE-0002" });
  });

  it("runs an in_review pack only under allowDraftRules, flagged as draft", async () => {
    const outcome = await resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      ...inReviewQuery,
      allowDraftRules: true,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.draft).toBe(true);
      expect(outcome.pack.rulePackId).toBe("au-stamp-duty-vic");
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
