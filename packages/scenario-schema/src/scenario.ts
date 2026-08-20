import { z } from "zod";
import { zISODateTime, zJurisdiction } from "@paymentcalcs/calculation-core";

/** P1 workspace linking — typed now so scenario documents are forward-stable. */
export const zWorkspaceValueLink = z.object({
  sourceScenarioId: z.string().min(1),
  sourceField: z.string().min(1),
  targetField: z.string().min(1),
});

export type WorkspaceValueLink = z.infer<typeof zWorkspaceValueLink>;

/** §14.6 */
export interface ScenarioDocumentV1 {
  scenarioId: string;
  schemaVersion: "1";
  calculatorId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  jurisdiction: { country: string; subdivision?: string };
  locale: string;
  currency: string;
  input: unknown;
  selectedRulePacks: string[];
  pinnedEngineVersions?: Record<string, string>;
  compareScenarios?: ScenarioDocumentV1[];
  workspaceLinks?: WorkspaceValueLink[];
  resultSnapshot?: {
    canonicalResultHash: string;
    selectedSummary: Record<string, unknown>;
  };
  consent: {
    storage: "local" | "encrypted_sync" | "shared_ciphertext";
  };
}

export const zScenarioDocumentV1: z.ZodType<ScenarioDocumentV1> = z.lazy(() =>
  z.object({
    scenarioId: z.string().min(1),
    schemaVersion: z.literal("1"),
    calculatorId: z.string().min(1),
    title: z.string().max(200).optional(),
    createdAt: zISODateTime,
    updatedAt: zISODateTime,
    jurisdiction: zJurisdiction,
    locale: z.string().min(2),
    currency: z.string().regex(/^[A-Z]{3}$/),
    input: z.unknown(),
    selectedRulePacks: z.array(z.string()),
    pinnedEngineVersions: z.record(z.string(), z.string()).optional(),
    compareScenarios: z.array(zScenarioDocumentV1).max(3).optional(),
    workspaceLinks: z.array(zWorkspaceValueLink).optional(),
    resultSnapshot: z
      .object({
        canonicalResultHash: z.string(),
        selectedSummary: z.record(z.string(), z.unknown()),
      })
      .optional(),
    consent: z.object({
      storage: z.enum(["local", "encrypted_sync", "shared_ciphertext"]),
    }),
  }),
) as z.ZodType<ScenarioDocumentV1>;
