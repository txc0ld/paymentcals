import type { IntegrityManifest, RulePackV1 } from "@paymentcalcs/rule-schema";
import { zGstRulePack, type GstRulePack } from "./domains/gst";
import { zIncomeTaxRulePack, type IncomeTaxRulePack } from "./domains/income-tax";
import { zMedicareRulePack, type MedicareRulePack } from "./domains/medicare";
import { zStslRulePack, type StslRulePack } from "./domains/stsl";
import { zSuperGuaranteeRulePack, type SuperGuaranteeRulePack } from "./domains/super-guarantee";
import { zPaygWithholdingRulePack, type PaygWithholdingRulePack } from "./domains/payg-withholding";

import auGstStandard from "./packs/au-gst-standard.json" with { type: "json" };
import auCpiQuarterly from "./packs/au-cpi-quarterly.json" with { type: "json" };
import auIncomePercentiles from "./packs/au-income-percentiles.json" with { type: "json" };
import auSuperBalanceByAge from "./packs/au-super-balance-by-age.json" with { type: "json" };
import auSuperThresholds from "./packs/au-super-thresholds.json" with { type: "json" };
import auWpiQuarterly from "./packs/au-wpi-quarterly.json" with { type: "json" };
import auLenderRates from "./packs/au-lender-rates.json" with { type: "json" };
import auSapto from "./packs/au-sapto.json" with { type: "json" };
import auSbito from "./packs/au-sbito.json" with { type: "json" };
import auHelpIndexation from "./packs/au-help-indexation.json" with { type: "json" };
import auGstRegistration from "./packs/au-gst-registration.json" with { type: "json" };
import auSchedule5 from "./packs/au-schedule5.json" with { type: "json" };
import auDutyConcNsw from "./packs/au-duty-concessions-nsw.json" with { type: "json" };
import auDutyConcQld from "./packs/au-duty-concessions-qld.json" with { type: "json" };
import auDutyConcVic from "./packs/au-duty-concessions-vic.json" with { type: "json" };
import auDutyConcAct from "./packs/au-duty-concessions-act.json" with { type: "json" };
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
import dutyNsw from "./packs/au-stamp-duty-nsw.json" with { type: "json" };
import dutyVic from "./packs/au-stamp-duty-vic.json" with { type: "json" };
import dutyQld from "./packs/au-stamp-duty-qld.json" with { type: "json" };
import dutyWa from "./packs/au-stamp-duty-wa.json" with { type: "json" };
import dutySa from "./packs/au-stamp-duty-sa.json" with { type: "json" };
import dutyTas from "./packs/au-stamp-duty-tas.json" with { type: "json" };
import dutyAct from "./packs/au-stamp-duty-act.json" with { type: "json" };
import dutyNt from "./packs/au-stamp-duty-nt.json" with { type: "json" };
import manifest from "../integrity-manifest.json" with { type: "json" };
import { zStampDutyRulePack, type StampDutyRulePack } from "./domains/stamp-duty";
import { zCpiRulePack, type CpiRulePack } from "./domains/cpi";
import {
  zIncomePercentilesRulePack,
  zSuperStatisticsRulePack,
  zSuperThresholdsRulePack,
  type IncomePercentilesRulePack,
  type SuperStatisticsRulePack,
  type SuperThresholdsRulePack,
} from "./domains/statistics";
import {
  zGstRegistrationRulePack,
  zHelpIndexationRulePack,
  zLenderRatesRulePack,
  zSaptoRulePack,
  zSbitoRulePack,
  zSchedule5RulePack,
  zWpiRulePack,
  type GstRegistrationRulePack,
  type HelpIndexationRulePack,
  type LenderRatesRulePack,
  type SaptoRulePack,
  type SbitoRulePack,
  type Schedule5RulePack,
  type WpiRulePack,
} from "./domains/queue-packs";
import { zDutyConcessionRulePack, type DutyConcessionRulePack } from "./domains/duty-concessions";

/** Every pack is validated at module load — a malformed pack can never resolve. */
export const gstPack: GstRulePack = zGstRulePack.parse(auGstStandard);
export const cpiPack: CpiRulePack = zCpiRulePack.parse(auCpiQuarterly);
export const incomePercentilesPack: IncomePercentilesRulePack = zIncomePercentilesRulePack.parse(auIncomePercentiles);
export const superBalanceByAgePack: SuperStatisticsRulePack = zSuperStatisticsRulePack.parse(auSuperBalanceByAge);
export const superThresholdsPack: SuperThresholdsRulePack = zSuperThresholdsRulePack.parse(auSuperThresholds);
export const wpiPack: WpiRulePack = zWpiRulePack.parse(auWpiQuarterly);
export const lenderRatesPack: LenderRatesRulePack = zLenderRatesRulePack.parse(auLenderRates);
export const saptoPack: SaptoRulePack = zSaptoRulePack.parse(auSapto);
export const sbitoPack: SbitoRulePack = zSbitoRulePack.parse(auSbito);
export const helpIndexationPack: HelpIndexationRulePack = zHelpIndexationRulePack.parse(auHelpIndexation);
export const gstRegistrationPack: GstRegistrationRulePack = zGstRegistrationRulePack.parse(auGstRegistration);
export const schedule5Pack: Schedule5RulePack = zSchedule5RulePack.parse(auSchedule5);
export const dutyConcessionPacks: DutyConcessionRulePack[] = [auDutyConcNsw, auDutyConcQld, auDutyConcVic, auDutyConcAct].map(
  (p) => zDutyConcessionRulePack.parse(p),
);

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
export const stampDutyPacks: StampDutyRulePack[] = [
  dutyNsw, dutyVic, dutyQld, dutyWa, dutySa, dutyTas, dutyAct, dutyNt,
].map((p) => zStampDutyRulePack.parse(p));

export const allAuRulePacks: readonly RulePackV1[] = [
  gstPack,
  cpiPack,
  incomePercentilesPack,
  superBalanceByAgePack,
  superThresholdsPack,
  wpiPack,
  lenderRatesPack,
  saptoPack,
  sbitoPack,
  helpIndexationPack,
  gstRegistrationPack,
  schedule5Pack,
  ...dutyConcessionPacks,
  ...incomeTaxPacks,
  ...medicarePacks,
  ...stslPacks,
  ...superGuaranteePacks,
  ...paygWithholdingPacks,
  ...stampDutyPacks,
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
export {
  zStampDutyRulePack,
  zStampDutyRules,
  type DutyBracket,
  type StampDutyRulePack,
  type StampDutyRules,
} from "./domains/stamp-duty";
export { zCpiRulePack, zCpiRules, type CpiQuarter, type CpiRulePack, type CpiRules } from "./domains/cpi";
export {
  zIncomePercentilesRulePack,
  zIncomePercentilesRules,
  zSuperStatisticsRulePack,
  zSuperStatisticsRules,
  zSuperThresholdsRulePack,
  zSuperThresholdsRules,
  type IncomePercentileRow,
  type IncomePercentilesRulePack,
  type IncomePercentilesRules,
  type SuperBalanceCell,
  type SuperStatisticsRulePack,
  type SuperStatisticsRules,
  type SuperThresholdsRulePack,
  type SuperThresholdsRules,
} from "./domains/statistics";
export {
  zGstRegistrationRules,
  zHelpIndexationRules,
  zLenderRatesRules,
  zSaptoRules,
  zSbitoRules,
  zSchedule5Rules,
  zWpiRules,
  type GstRegistrationRules,
  type HelpIndexationRules,
  type LenderRatesRules,
  type SaptoRules,
  type SbitoRules,
  type Schedule5Rules,
  type WpiRules,
} from "./domains/queue-packs";
export type {
  GstRegistrationRulePack,
  HelpIndexationRulePack,
  LenderRatesRulePack,
  SaptoRulePack,
  SbitoRulePack,
  Schedule5RulePack,
  WpiRulePack,
} from "./domains/queue-packs";
export {
  zDutyConcessionRules,
  zDutyConcessionRulePack,
  type DutyConcessionRules,
  type DutyConcessionRulePack,
  type QldFirstHomeBand,
} from "./domains/duty-concessions";
