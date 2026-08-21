import type { AuPayResolution } from "@paymentcalcs/engine-au-tax";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "./draft-rules";

export const FINANCIAL_YEARS = ["2026-27", "2025-26", "2024-25"] as const;
export type FinancialYear = (typeof FINANCIAL_YEARS)[number];

export type PayResolutionOutcome =
  | { ok: true; resolution: AuPayResolution; draft: boolean }
  | { ok: false; reason: string };

/** Valuation date inside the selected FY so date-gated packs resolve. */
function fyValuationDate(financialYear: FinancialYear): string {
  const [startYear] = financialYear.split("-");
  return `${startYear}-10-01`;
}

/** Resolve every rule-pack domain the pay engines need, fail-closed. */
export async function resolvePayPacks(financialYear: FinancialYear): Promise<PayResolutionOutcome> {
  const valuationDate = fyValuationDate(financialYear);
  const query = { jurisdiction: "AU", valuationDate, allowDraftRules };

  const [incomeTax, medicare, superGuarantee, stsl, payg, sapto] = await Promise.all([
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "income-tax" }),
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "medicare" }),
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "super-guarantee" }),
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "stsl" }),
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "payg-withholding" }),
    resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "sapto" }),
  ]);

  if (!incomeTax.ok) return { ok: false, reason: `income tax rules: ${incomeTax.reason}` };
  if (!medicare.ok) return { ok: false, reason: `Medicare rules: ${medicare.reason}` };
  if (!superGuarantee.ok) return { ok: false, reason: `super guarantee rules: ${superGuarantee.reason}` };

  return {
    ok: true,
    draft: incomeTax.draft || medicare.draft || superGuarantee.draft,
    resolution: {
      incomeTax: {
        pack: incomeTax.pack as AuPayResolution["incomeTax"]["pack"],
        manifestRef: incomeTax.manifestRef,
      },
      medicare: {
        pack: medicare.pack as AuPayResolution["medicare"]["pack"],
        manifestRef: medicare.manifestRef,
      },
      superGuarantee: {
        pack: superGuarantee.pack as AuPayResolution["superGuarantee"]["pack"],
        manifestRef: superGuarantee.manifestRef,
      },
      // STSL and PAYG are optional: their absence degrades specific outputs
      // with explicit reasons rather than blocking the whole calculator.
      stsl: stsl.ok
        ? { pack: stsl.pack as NonNullable<AuPayResolution["stsl"]>["pack"], manifestRef: stsl.manifestRef }
        : null,
      payg: payg.ok
        ? { pack: payg.pack as NonNullable<AuPayResolution["payg"]>["pack"], manifestRef: payg.manifestRef }
        : null,
      // SAPTO is optional: the engine fails closed only when the offset is claimed.
      sapto: sapto.ok
        ? { pack: sapto.pack as NonNullable<AuPayResolution["sapto"]>["pack"], manifestRef: sapto.manifestRef }
        : null,
    },
  };
}
