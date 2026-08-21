import { z } from "zod";
import { emptyResearchPlanDraft } from "../features/planning/logic";
import { legacyChoiceOrderSeed } from "./choiceOrder";
import type { PlanReviewRecord, PlanVersion } from "../features/review/logic";
import type { PilotRecord } from "../features/pilot/logic";
import { repairCompletedMaintainPilot } from "../features/pilot/logic";
import type { ResultPackageRef } from "../features/execution/logic";
import type {
  LegacyQualityRecord,
  QualityCheckRecord,
  QualityReviewDraft,
} from "../features/quality/logic";

export const RESEARCH_STAGES = [
  "home",
  "invitation",
  "question",
  "hypothesis",
  "method",
  "planning",
  "plan-review",
  "pilot",
  "execution",
  "quality",
  "analysis-mode",
  "analysis",
  "interpretation",
  "paper",
  "constellation",
] as const;
export type ResearchStage = (typeof RESEARCH_STAGES)[number];
const choiceRecordSchema = z.object({
  choiceId: z.string().min(1),
  note: z.string(),
  chosenAt: z.string().datetime(),
});
const reviewSchema = z.object({
  status: z.enum(["aligned", "needs-review", "acknowledged"]),
  acknowledged: z.boolean(),
  reasonId: z.string().nullable(),
});
const researchQuestionSchema = z.object({
  choiceId: z.string().min(1),
  measurementId: z.string(),
  timeFocusId: z.string(),
  spaceFocusId: z.string(),
  alignment: reviewSchema,
  note: z.string(),
  chosenAt: z.string().datetime(),
});
const hypothesisSchema = z.object({
  choiceId: z.string().min(1),
  note: z.string(),
  chosenAt: z.string().datetime(),
});
const predictionSchema = z.object({
  choiceId: z.string().min(1),
  direction: z.enum(["increase", "decrease", "unchanged", "uncertain"]),
  reasonId: z.string(),
  alignment: reviewSchema,
  note: z.string(),
  chosenAt: z.string().datetime(),
});
export const methodAnswerSchema = z.object({
  questionId: z.string().min(1),
  choiceId: z.string().min(1),
  answeredAt: z.string().datetime(),
});
export const methodUnderstandingSchema = z.object({
  contentId: z.string().min(1),
  answers: z.array(methodAnswerSchema),
  completedAt: z.string().datetime().nullable(),
});
const legacyResultPackageSchema = z.object({
  packageId: z.string(),
  dataVersion: z.string(),
  provenance: z.object({
    kind: z.enum(["cws", "demo-fixture"]),
    generator: z.string().min(1),
    generatorVersion: z.string().min(1),
    dataVersion: z.string().min(1),
    createdAt: z.string().datetime(),
    notes: z.string(),
  }),
});
const resultPackageRefSchema = z.discriminatedUnion("refKind", [
  z.object({
    refKind: z.literal("legacy-unbound"),
    packageId: z.string(),
    dataVersion: z.string(),
    provenance: z.unknown(),
  }),
  z.object({
    refKind: z.literal("bound"),
    refSchemaVersion: z.literal(1),
    packageId: z.string(),
    catalogVersion: z.string(),
    manifestPath: z.string(),
    dataVersion: z.string(),
    planVersionId: z.string(),
    planSubjectHash: z.string(),
    requestFingerprint: z.string(),
    acquisitionFingerprint: z.string(),
    boxSizeMpcOverH: z.number(),
    particleSide: z.number(),
    requestedSnapshotIds: z.array(
      z.enum(["initial", "z10", "z5", "z2", "z1", "z0"]),
    ),
    snapshotInventory: z.array(
      z.object({
        id: z.enum(["initial", "z10", "z5", "z2", "z1", "z0"]),
        redshift: z.number(),
        scaleFactor: z.number(),
      }),
    ),
    grid: z.object({
      projection: z.literal("xy"),
      width: z.literal(128),
      height: z.literal(128),
      quantity: z.literal("rho_over_mean"),
      arrayType: z.literal("Float32Array"),
    }),
    provenance: z.object({
      kind: z.literal("demo-fixture"),
      generator: z.string(),
      generatorVersion: z.string(),
      createdAt: z.string().datetime(),
      description: z.string(),
    }),
    fixtureVersion: z.string(),
    acquiredAt: z.string().datetime(),
  }),
]);
export const miraMessageRecordSchema = z.object({
  messageId: z.string(),
  ruleId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
});
export type MiraMessageRecord = z.infer<typeof miraMessageRecordSchema>;
const base = z.object({
  schemaVersion: z.number(),
  projectId: z.string().uuid(),
  projectName: z.string().min(1).max(80),
  appVersion: z.string(),
  contentVersion: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStage: z.enum(RESEARCH_STAGES),
  themeId: z.literal("cosmic-web-growth"),
  motivation: choiceRecordSchema.nullable(),
  planVersions: z.array(z.unknown()),
  activePlanVersion: z.number().nullable(),
  pilot: z.unknown().nullable(),
  resultPackage: z
    .union([resultPackageRefSchema, legacyResultPackageSchema])
    .nullable(),
  qualityChecks: z.array(z.unknown()).nullish(),
  analysisMode: z.enum(["gui", "python-assisted"]),
  analysisRecipe: z.unknown(),
  analysisOutputs: z.array(z.unknown()),
  figures: z.array(z.unknown()),
  interpretation: z.unknown(),
  paper: z.unknown().nullable(),
  glossaryViewed: z.array(z.string()),
  miraHistory: z.array(miraMessageRecordSchema),
  completedAt: z.string().datetime().nullable(),
});
const researchPlanDraftSchema = z.object({
  contentId: z.literal("research-plan-v1"),
  priorityGoal: z.enum(["large-web", "dense-detail", "balance"]).nullable(),
  boxSizeMpcOverH: z
    .union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)])
    .nullable(),
  particleSide: z
    .union([z.literal(16), z.literal(32), z.literal(64)])
    .nullable(),
  snapshotIds: z.array(z.enum(["initial", "z10", "z5", "z2", "z1", "z0"])),
  primaryAnalysis: z
    .enum(["density-image", "sigma-delta", "dense-fraction"])
    .nullable(),
  plannedFigure: z
    .enum(["density-panels", "sigma-growth", "dense-growth"])
    .nullable(),
  expectedPattern: z
    .enum(["increase", "decrease", "stable", "complex", "unsure"])
    .nullable(),
  reasonIds: z.object({
    priorityGoal: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
    boxSize: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
    particleSide: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
    snapshots: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
    primaryAnalysis: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
    figurePrediction: z
      .enum(["evidence", "tradeoff", "baseline", "familiar", "unsure"])
      .nullable(),
  }),
  note: z.string().max(300),
  updatedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});
export const projectStateSchema = base.extend({
  schemaVersion: z.literal(8),
  researchQuestion: researchQuestionSchema.nullable(),
  hypothesis: hypothesisSchema.nullable(),
  prediction: predictionSchema.nullable(),
  methodUnderstanding: methodUnderstandingSchema,
  researchPlanDraft: researchPlanDraftSchema,
  choiceOrderSeed: z.string().min(1),
  planReviewHistory: z.array(z.unknown()),
  activePlanVersionId: z.string().nullable(),
  planReviewCompletedAt: z.string().datetime().nullable(),
  planChangeReasonId: z.string().nullable(),
  pilot: z.unknown().nullable(),
  qualityDraft: z.unknown().nullable(),
  qualityChecks: z.array(z.unknown()),
});
export type ProjectState = Omit<
  z.infer<typeof projectStateSchema>,
  | "planReviewHistory"
  | "planVersions"
  | "resultPackage"
  | "qualityChecks"
  | "qualityDraft"
> & {
  planReviewHistory: PlanReviewRecord[];
  planVersions: PlanVersion[];
  pilot: PilotRecord | null;
  resultPackage: ResultPackageRef | null;
  qualityChecks: (QualityCheckRecord | LegacyQualityRecord)[];
  qualityDraft: QualityReviewDraft | null;
};

export function migrateProject(value: unknown): ProjectState {
  const raw = base
    .extend({
      researchQuestion: z.unknown().nullish(),
      hypothesis: z.unknown().nullish(),
      prediction: z.unknown().nullish(),
      methodUnderstanding: z.unknown().optional(),
      researchPlanDraft: z.unknown().optional(),
      choiceOrderSeed: z.unknown().optional(),
      planReviewHistory: z.unknown().optional(),
      activePlanVersionId: z.unknown().optional(),
      planReviewCompletedAt: z.unknown().optional(),
      planChangeReasonId: z.unknown().optional(),
      qualityDraft: z.unknown().nullish(),
    })
    .parse(value);
  if (raw.schemaVersion > 8)
    throw new Error(
      "このプロジェクトは新しい版で作成されているため読み込めません。",
    );
  if (raw.schemaVersion === 8) {
    const current = projectStateSchema.parse(raw) as ProjectState;
    return {
      ...current,
      pilot: repairCompletedMaintainPilot(
        current.pilot,
        current.activePlanVersionId,
      ),
    };
  }
  const migrated = projectStateSchema.parse({
    ...raw,
    schemaVersion: 8,
    qualityChecks:
      raw.schemaVersion >= 8
        ? (raw.qualityChecks ?? [])
        : (raw.qualityChecks ?? []).map((record) => ({
            recordKind: "legacy-unbound",
            original: record,
          })),
    qualityDraft: raw.schemaVersion >= 8 ? raw.qualityDraft : null,
    resultPackage:
      raw.resultPackage && !("refKind" in raw.resultPackage)
        ? {
            refKind: "legacy-unbound",
            packageId: raw.resultPackage.packageId,
            dataVersion: raw.resultPackage.dataVersion,
            provenance: raw.resultPackage.provenance,
          }
        : raw.resultPackage,
    researchQuestion: raw.schemaVersion < 2 ? null : raw.researchQuestion,
    hypothesis: raw.schemaVersion < 2 ? null : raw.hypothesis,
    prediction: raw.schemaVersion < 2 ? null : raw.prediction,
    methodUnderstanding:
      raw.schemaVersion >= 3 && raw.methodUnderstanding
        ? raw.methodUnderstanding
        : {
            contentId: "method-understanding-v1",
            answers: [],
            completedAt: null,
          },
    researchPlanDraft:
      raw.schemaVersion >= 4 && raw.researchPlanDraft
        ? raw.researchPlanDraft
        : emptyResearchPlanDraft(),
    choiceOrderSeed:
      typeof raw.choiceOrderSeed === "string"
        ? raw.choiceOrderSeed
        : legacyChoiceOrderSeed(raw.projectId),
    planReviewHistory: Array.isArray(raw.planReviewHistory)
      ? raw.planReviewHistory
      : [],
    activePlanVersionId:
      typeof raw.activePlanVersionId === "string"
        ? raw.activePlanVersionId
        : null,
    planReviewCompletedAt:
      typeof raw.planReviewCompletedAt === "string"
        ? raw.planReviewCompletedAt
        : null,
    planChangeReasonId:
      typeof raw.planChangeReasonId === "string"
        ? raw.planChangeReasonId
        : null,
  });
  const project = migrated as ProjectState;
  return {
    ...project,
    pilot: repairCompletedMaintainPilot(
      project.pilot,
      project.activePlanVersionId,
    ),
  };
}

export function createEmptyProject(now = new Date()): ProjectState {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 8,
    projectId: crypto.randomUUID(),
    projectName: `新しい研究 ${now.toLocaleDateString("ja-JP")}`,
    appVersion: "0.1.0",
    contentVersion: "0.1.4",
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStage: "home",
    themeId: "cosmic-web-growth",
    motivation: null,
    researchQuestion: null,
    hypothesis: null,
    prediction: null,
    methodUnderstanding: {
      contentId: "method-understanding-v1",
      answers: [],
      completedAt: null,
    },
    researchPlanDraft: emptyResearchPlanDraft(),
    choiceOrderSeed: crypto.randomUUID(),
    planReviewHistory: [],
    activePlanVersionId: null,
    planReviewCompletedAt: null,
    planChangeReasonId: null,
    planVersions: [],
    activePlanVersion: null,
    pilot: null,
    resultPackage: null,
    qualityChecks: [],
    qualityDraft: null,
    analysisMode: "gui",
    analysisRecipe: {
      schemaVersion: 1,
      density: {
        transform: "contrast",
        smoothing: { method: "none", sigmaCells: 0 },
      },
      histogram: { bins: 30 },
      highDensity: { rhoOverMeanThreshold: 5 },
      figures: [],
    },
    analysisOutputs: [],
    figures: [],
    interpretation: {
      result: null,
      interpretation: null,
      conclusion: null,
      limitations: [],
    },
    paper: null,
    glossaryViewed: [],
    miraHistory: [],
    completedAt: null,
  };
}
