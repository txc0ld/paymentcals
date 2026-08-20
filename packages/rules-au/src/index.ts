import type { IntegrityManifest, RulePackV1 } from "@paymentcalcs/rule-schema";
import { zGstRulePack, type GstRulePack } from "./domains/gst";
import auGstStandard from "./packs/au-gst-standard.json" with { type: "json" };
import manifest from "../integrity-manifest.json" with { type: "json" };

/** Validated at module load — a malformed pack can never be resolved. */
export const gstPack: GstRulePack = zGstRulePack.parse(auGstStandard);

export const allAuRulePacks: readonly RulePackV1[] = [gstPack];

export const auIntegrityManifest: IntegrityManifest = manifest;

export { zGstRulePack, zGstRules, type GstRulePack, type GstRules } from "./domains/gst";
