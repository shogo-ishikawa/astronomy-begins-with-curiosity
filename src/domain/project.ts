import { z } from "zod";

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
const resultPackageSchema = z.object({
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
  resultPackage: resultPackageSchema.nullable(),
  qualityChecks: z.array(z.unknown()),
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
export const projectStateSchema = base.extend({
  schemaVersion: z.literal(3),
  researchQuestion: researchQuestionSchema.nullable(),
  hypothesis: hypothesisSchema.nullable(),
  prediction: predictionSchema.nullable(),
  methodUnderstanding: methodUnderstandingSchema,
});
export type ProjectState = z.infer<typeof projectStateSchema>;

export function migrateProject(value: unknown): ProjectState {
  const raw = base
    .extend({
      researchQuestion: z.unknown().nullish(),
      hypothesis: z.unknown().nullish(),
      prediction: z.unknown().nullish(),
      methodUnderstanding: z.unknown().optional(),
    })
    .parse(value);
  if (raw.schemaVersion > 3)
    throw new Error(
      "このプロジェクトは新しい版で作成されているため読み込めません。",
    );
  if (raw.schemaVersion === 3) return projectStateSchema.parse(raw);
  return projectStateSchema.parse({
    ...raw,
    schemaVersion: 3,
    researchQuestion: raw.schemaVersion < 2 ? null : raw.researchQuestion,
    hypothesis: raw.schemaVersion < 2 ? null : raw.hypothesis,
    prediction: raw.schemaVersion < 2 ? null : raw.prediction,
    methodUnderstanding: {
      contentId: "method-understanding-v1",
      answers: [],
      completedAt: null,
    },
  });
}

export function createEmptyProject(now = new Date()): ProjectState {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 3,
    projectId: crypto.randomUUID(),
    projectName: `新しい研究 ${now.toLocaleDateString("ja-JP")}`,
    appVersion: "0.1.0",
    contentVersion: "0.1.2",
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
    planVersions: [],
    activePlanVersion: null,
    pilot: null,
    resultPackage: null,
    qualityChecks: [],
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
