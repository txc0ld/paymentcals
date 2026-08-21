import { describe, expect, it } from "vitest";
import { computePackHash, manifestKey, resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, gstPack } from "./index";

describe("pack governance invariants", () => {
  /* Owner approved activation on 2026-08-21 (PROGRESS.md D-016, extended by
   * the get-everything-working directive). The invariant: a pack may only be
   * active with an approval record, and an active duty pack must carry at
   * least one populated rule shape. Null SUB-tables inside otherwise-sourced
   * packs are allowed — the engines fail closed on those specific paths
   * (e.g. FY2026-27 foreign-resident brackets, unpublished by the ATO). */
  it("active packs carry an approval record and at least one populated rule shape", () => {
    for (const pack of allAuRulePacks) {
      if (pack.status === "active") {
        expect(pack.review.approvedBy, pack.rulePackId).toBeTruthy();
        expect(pack.review.approvedAt, pack.rulePackId).toBeTruthy();
        if (pack.domain === "stamp-duty") {
          const rules = pack.rules as { general: unknown; generalPercent?: unknown; generalFormula?: unknown };
          expect(
            rules.general !== null || rules.generalPercent != null || rules.generalFormula != null,
            pack.rulePackId,
          ).toBe(true);
        }
      } else {
        expect(pack.status).toBe("in_review");
        expect(pack.review.approvedBy).toBeNull();
        expect(pack.verifiedAt).toBeNull();
      }
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

  /* Every shipped pack is now active, so a synthetic in_review pack (a clone
   * of the GST pack with its status reverted) exercises the fail-closed path.
   * Its hash is computed live so integrity passes and only status gates it. */
  const inReviewQuery = {
    domain: "synthetic-review",
    jurisdiction: "AU",
    valuationDate: "2026-08-20",
  } as const;
  async function syntheticInReview() {
    const pack = { ...gstPack, rulePackId: "au-synthetic-review", domain: "synthetic-review", status: "in_review" as const };
    const manifest = { ...auIntegrityManifest, [manifestKey(pack)]: await computePackHash(pack) };
    return { pack, manifest };
  }

  it("refuses to run an in_review pack in production mode (PC-RULE-0002)", async () => {
    const { pack, manifest } = await syntheticInReview();
    const outcome = await resolveRulePack([...allAuRulePacks, pack], manifest, inReviewQuery);
    expect(outcome).toMatchObject({ ok: false, code: "PC-RULE-0002" });
  });

  it("runs an in_review pack only under allowDraftRules, flagged as draft", async () => {
    const { pack, manifest } = await syntheticInReview();
    const outcome = await resolveRulePack([...allAuRulePacks, pack], manifest, {
      ...inReviewQuery,
      allowDraftRules: true,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.draft).toBe(true);
      expect(outcome.pack.rulePackId).toBe("au-synthetic-review");
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
