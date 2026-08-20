import { z } from "zod";
import { zISODate, zISODateTime } from "@paymentcalcs/calculation-core";
import type { ISODate, ISODateTime, SourceRecordV1 } from "@paymentcalcs/calculation-core";

/** §11.7 rule-pack lifecycle. Packs authored by the build agent are always `in_review`. */
export const RULE_PACK_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "active",
  "superseded",
  "withdrawn",
  "corrected",
] as const;

export type RulePackStatus = (typeof RULE_PACK_STATUSES)[number];

/** Statuses the resolver accepts in production. */
export const RUNNABLE_STATUSES: readonly RulePackStatus[] = ["active"];

/** Statuses additionally runnable in dev under PC_ALLOW_DRAFT_RULES (draft banner). */
export const DRAFT_RUNNABLE_STATUSES: readonly RulePackStatus[] = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
];

export interface RulePackV1<TRules = unknown> {
  rulePackId: string;
  jurisdiction: string;
  subdivision: string | null;
  domain: string;
  effectiveFrom: ISODate;
  /** null = open-ended until superseded. */
  effectiveTo: ISODate | null;
  status: RulePackStatus;
  schemaVersion: 1;
  rulesVersion: string;
  sources: SourceRecordV1[];
  review: {
    preparedBy: string;
    approvedBy: string | null;
    approvedAt: ISODateTime | null;
  };
  /** null until a human verifies every value against the cited sources. */
  verifiedAt: ISODateTime | null;
  /** Domain payload. Values may be null when the source could not be fetched. */
  rules: TRules;
}

export const zSourceRecordV1: z.ZodType<SourceRecordV1> = z.object({
  sourceId: z.string().min(1),
  authority: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  jurisdiction: z.string().min(2),
  domain: z.string().min(1),
  publicationDate: zISODate.optional(),
  effectiveFrom: zISODate.optional(),
  effectiveTo: zISODate.optional(),
  retrievedAt: zISODateTime,
  archivedSnapshotRef: z.string().optional(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  notes: z.string().optional(),
});

export function zRulePackV1<TRules extends z.ZodType>(rules: TRules) {
  return z.object({
    rulePackId: z.string().regex(/^[a-z0-9-]+$/),
    jurisdiction: z.string().length(2),
    subdivision: z.string().min(2).nullable(),
    domain: z.string().min(1),
    effectiveFrom: zISODate,
    effectiveTo: zISODate.nullable(),
    status: z.enum(RULE_PACK_STATUSES),
    schemaVersion: z.literal(1),
    rulesVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sources: z.array(zSourceRecordV1).min(1),
    review: z.object({
      preparedBy: z.string().min(1),
      approvedBy: z.string().min(1).nullable(),
      approvedAt: zISODateTime.nullable(),
    }),
    verifiedAt: zISODateTime.nullable(),
    rules,
  });
}

export const zRulePackEnvelope = zRulePackV1(z.unknown());
