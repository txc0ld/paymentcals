import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { dutyConcessionPacks, stampDutyPacks } from "@paymentcalcs/rules-au";
import { concessionalDuty } from "./duty-concessions";

const d = (n: number) => new Dec(n) as DecimalValue;
const general = (state: string) => stampDutyPacks.find((p) => p.subdivision === state)!.rules;
const concessions = (state: string) => dutyConcessionPacks.find((p) => p.subdivision === state)!.rules;

describe("QLD home + first-home concessions — QRO's own worked examples", () => {
  it("home concession: $550,000 → $10,600 and $950,000 → $28,600", () => {
    expect(concessionalDuty(d(550_000), general("QLD"), concessions("QLD"), "qld_home").duty.toFixed(2)).toBe("10600.00");
    expect(concessionalDuty(d(950_000), general("QLD"), concessions("QLD"), "qld_home").duty.toFixed(2)).toBe("28600.00");
  });

  it("first home: $650,000 → $0, $730,000 → $6,555, $795,000 → $19,890", () => {
    expect(concessionalDuty(d(650_000), general("QLD"), concessions("QLD"), "qld_first_home").duty.toFixed(2)).toBe("0.00");
    expect(concessionalDuty(d(730_000), general("QLD"), concessions("QLD"), "qld_first_home").duty.toFixed(2)).toBe("6555.00");
    expect(concessionalDuty(d(795_000), general("QLD"), concessions("QLD"), "qld_first_home").duty.toFixed(2)).toBe("19890.00");
  });

  it("first home at $850,000 → only the home concession ($24,100)", () => {
    const result = concessionalDuty(d(850_000), general("QLD"), concessions("QLD"), "qld_first_home");
    expect(result.duty.toFixed(2)).toBe("24100.00");
  });

  it("no duty at exactly $700,000 — the staircase zeroes there", () => {
    expect(concessionalDuty(d(700_000), general("QLD"), concessions("QLD"), "qld_first_home").duty.toFixed(2)).toBe("0.00");
  });
});

describe("NSW FHBAS — statutory endpoints", () => {
  it("exempt to $800,000; zero exactly at the boundary by the sliding formula", () => {
    expect(concessionalDuty(d(800_000), general("NSW"), concessions("NSW"), "nsw_fhbas_home").duty.toFixed(2)).toBe("0.00");
    expect(concessionalDuty(d(500_000), general("NSW"), concessions("NSW"), "nsw_fhbas_home").duty.toFixed(2)).toBe("0.00");
  });

  it("slides between the caps and meets the general rate at $1,000,000", () => {
    const mid = concessionalDuty(d(900_000), general("NSW"), concessions("NSW"), "nsw_fhbas_home");
    expect(mid.duty.greaterThan(0)).toBe(true);
    expect(mid.duty.lessThan(mid.generalDuty)).toBe(true);
    const atCap = concessionalDuty(d(1_000_000), general("NSW"), concessions("NSW"), "nsw_fhbas_home");
    expect(atCap.fellBackToGeneral).toBe(true);
    expect(atCap.duty.toFixed(2)).toBe(atCap.generalDuty.toFixed(2));
  });

  it("vacant land: exempt to $350,000, general at $450,000", () => {
    expect(concessionalDuty(d(350_000), general("NSW"), concessions("NSW"), "nsw_fhbas_vacant_land").duty.toFixed(2)).toBe("0.00");
    const cap = concessionalDuty(d(450_000), general("NSW"), concessions("NSW"), "nsw_fhbas_vacant_land");
    expect(cap.fellBackToGeneral).toBe(true);
  });
});

describe("VIC PPR", () => {
  it("concessional inside the cap: $400,000 → $2,870 + 5% × $270,000 = $16,370", () => {
    expect(concessionalDuty(d(400_000), general("VIC"), concessions("VIC"), "vic_ppr").duty.toFixed(2)).toBe("16370.00");
  });

  it("above $550,000 the general rate is charged, marked as fallback", () => {
    const result = concessionalDuty(d(650_000), general("VIC"), concessions("VIC"), "vic_ppr");
    expect(result.fellBackToGeneral).toBe(true);
    expect(result.duty.toFixed(2)).toBe("34070.00"); // matches the general-rate test
  });
});

describe("ACT owner-occupier (Table 1)", () => {
  it("$500,000 → $1,608 + $3.40 × 2,000 = $8,408 (equals the next band's base)", () => {
    expect(concessionalDuty(d(500_000), general("ACT"), concessions("ACT"), "act_owner_occupier").duty.toFixed(2)).toBe("8408.00");
  });

  it("saving vs the non-owner-occupier general table is positive below the slab", () => {
    const result = concessionalDuty(d(500_000), general("ACT"), concessions("ACT"), "act_owner_occupier");
    expect(result.saving.toFixed(2)).toBe("2992.00"); // 11,400 − 8,408
  });
});
