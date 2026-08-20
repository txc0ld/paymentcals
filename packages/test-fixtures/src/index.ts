import { z } from "zod";

/**
 * Golden-fixture protocol (build directive §3): the build agent authors fully
 * specified inputs with `expected: null`; the owner fills expected values from
 * official calculators. CI runs verified cases as hard assertions and counts
 * unverified cases (scripts/report-unverified-goldens.mjs).
 */
export const zGoldenCase = z.object({
  caseId: z.string().min(1),
  description: z.string().min(1),
  input: z.unknown(),
  /** null until a human verifies the expected values against official sources. */
  expected: z.record(z.string(), z.unknown()).nullable(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});

export const zGoldenFixture = z.object({
  fixtureId: z.string().min(1),
  calculatorId: z.string().min(1),
  engine: z.string().regex(/^E\d{2}$/),
  rulePackId: z.string().min(1),
  officialSourceForExpected: z.string().min(1),
  cases: z.array(zGoldenCase).min(1),
});

export type GoldenCase = z.infer<typeof zGoldenCase>;
export type GoldenFixture = z.infer<typeof zGoldenFixture>;

export function splitGoldenCases(fixture: GoldenFixture): {
  verified: GoldenCase[];
  unverified: GoldenCase[];
} {
  const verified = fixture.cases.filter((c) => c.expected !== null);
  const unverified = fixture.cases.filter((c) => c.expected === null);
  return { verified, unverified };
}
