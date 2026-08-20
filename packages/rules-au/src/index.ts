import type { IntegrityManifest, RulePackV1 } from "@paymentcalcs/rule-schema";
import { zGstRulePack, type GstRulePack } from "./domains/gst";
import { zIncomeTaxRulePack, type IncomeTaxRulePack } from "./domains/income-tax";
import { zMedicareRulePack, type MedicareRulePack } from "./domains/medicare";
import { zStslRulePack, type StslRulePack } from "./domains/stsl";
import { zSuperGuaranteeRulePack, type SuperGuaranteeRulePack } from "./domains/super-guarantee";
import { zPaygWithholdingRulePack, type PaygWithholdingRulePack } from "./domains/payg-withholding";

import auGstStandard from "./packs/au-gst-standard.json" with { type: "json" };
import incomeTax2425 from "./packs/au-income-tax-2024-25.json" with { type: "json" };
import incomeTax2526 from "./packs/au-income-tax-2025-26.json" with { type: "json" };
import incomeTax2627 from "./packs/au-income-tax-2026-27.json" with { type: "json" };
import medicare2425 from "./packs/au-medicare-2024-25.json" with { type: "json" };
import medicare2526 from "./packs/au-medicare-2025-26.json" with { type: "json" };
import medicare2627 from "./packs/au-medicare-2026-27.json" with { type: "json" };
import stsl2425 from "./packs/au-stsl-2024-25.json" with { type: "json" };
import stsl2526 from "./packs/au-stsl-2025-26.json" with { type: "json" };
import stsl2627 from "./packs/au-stsl-2026-27.json" with { type: "json" };
import sg2425 from "./packs/au-super-guarantee-2024-25.json" with { type: "json" };
import sg2526 from "./packs/au-super-guarantee-2025-26.json" with { type: "json" };
import sg2627 from "./packs/au-super-guarantee-2026-27.json" with { type: "json" };
import payg2627 from "./packs/au-payg-withholding-2026-27.json" with { type: "json" };
import manifest from "../integrity-manifest.json" with { type: "json" };

/** Every pack is validated at module load — a malformed pack can never resolve. */
export const gstPack: GstRulePack = zGstRulePack.parse(auGstStandard);

export const incomeTaxPacks: IncomeTaxRulePack[] = [incomeTax2425, incomeTax2526, incomeTax2627].map(
  (p) => zIncomeTaxRulePack.parse(p),
);
export const medicarePacks: MedicareRulePack[] = [medicare2425, medicare2526, medicare2627].map((p) =>
  zMedicareRulePack.parse(p),
);
export const stslPacks: StslRulePack[] = [stsl2425, stsl2526, stsl2627].map((p) =>
  zStslRulePack.parse(p),
);
export const superGuaranteePacks: SuperGuaranteeRulePack[] = [sg2425, sg2526, sg2627].map((p) =>
  zSuperGuaranteeRulePack.parse(p),
);
export const paygWithholdingPacks: PaygWithholdingRulePack[] = [
  zPaygWithholdingRulePack.parse(payg2627),
];

export const allAuRulePacks: readonly RulePackV1[] = [
  gstPack,
  ...incomeTaxPacks,
  ...medicarePacks,
  ...stslPacks,
  ...superGuaranteePacks,
  ...paygWithholdingPacks,
];

export const auIntegrityManifest: IntegrityManifest = manifest;

export { zGstRulePack, zGstRules, type GstRulePack, type GstRules } from "./domains/gst";
export {
  zIncomeTaxRulePack,
  zIncomeTaxRules,
  zLito,
  zTaxBracket,
  type IncomeTaxRulePack,
  type IncomeTaxRules,
  type TaxBracket,
} from "./domains/income-tax";
export { zMedicareRulePack, zMedicareRules, type MedicareRulePack, type MedicareRules } from "./domains/medicare";
export { zStslRulePack, zStslRules, type StslRulePack, type StslRules } from "./domains/stsl";
export {
  zSuperGuaranteeRulePack,
  zSuperGuaranteeRules,
  type SuperGuaranteeRulePack,
  type SuperGuaranteeRules,
} from "./domains/super-guarantee";
export {
  zCoefficientRow,
  zPaygWithholdingRulePack,
  zPaygWithholdingRules,
  type CoefficientRow,
  type PaygWithholdingRulePack,
  type PaygWithholdingRules,
} from "./domains/payg-withholding";
