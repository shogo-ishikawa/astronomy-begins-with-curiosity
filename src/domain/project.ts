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

export const miraMessageRecordSchema = z.object({
  messageId: z.string().min(1),
  ruleId: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type MiraMessageRecord = z.infer<typeof miraMessageRecordSchema>;

const provenanceSchema = z.object({
  kind: z.enum(["cws", "demo-fixture"]),
  generator: z.string().min(1),
  generatorVersion: z.string().min(1),
  dataVersion: z.string().min(1),
  createdAt: z.string().datetime(),
  notes: z.string(),
});

const analysisRecipeSchema = z.object({
  schemaVersion: z.literal(1),
  density: z.object({
    transform: z.literal("contrast"),
    smoothing: z.object({
      method: z.literal("none"),
      sigmaCells: z.literal(0),
    }),
  }),
  histogram: z.object({ bins: z.number().int().positive() }),
  highDensity: z.object({ rhoOverMeanThreshold: z.number().positive() }),
  figures: z.array(z.string()),
});

export const projectStateSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().uuid(),
  projectName: z.string().min(1).max(80),
  appVersion: z.string().min(1),
  contentVersion: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStage: z.enum(RESEARCH_STAGES),
  themeId: z.literal("cosmic-web-growth"),
  motivation: choiceRecordSchema.nullable(),
  researchQuestion: choiceRecordSchema.nullable(),
  hypothesis: choiceRecordSchema.nullable(),
  prediction: choiceRecordSchema.nullable(),
  planVersions: z.array(z.unknown()),
  activePlanVersion: z.number().int().nonnegative().nullable(),
  pilot: z.unknown().nullable(),
  resultPackage: z
    .object({
      packageId: z.string(),
      dataVersion: z.string(),
      provenance: provenanceSchema,
    })
    .nullable(),
  qualityChecks: z.array(z.unknown()),
  analysisMode: z.enum(["gui", "python-assisted"]),
  analysisRecipe: analysisRecipeSchema,
  analysisOutputs: z.array(z.unknown()),
  figures: z.array(z.unknown()),
  interpretation: z.object({
    result: choiceRecordSchema.nullable(),
    interpretation: choiceRecordSchema.nullable(),
    conclusion: choiceRecordSchema.nullable(),
    limitations: z.array(choiceRecordSchema),
  }),
  paper: z.unknown().nullable(),
  glossaryViewed: z.array(z.string()),
  miraHistory: z.array(miraMessageRecordSchema),
  completedAt: z.string().datetime().nullable(),
});

export type ProjectState = z.infer<typeof projectStateSchema>;

export function createEmptyProject(now = new Date()): ProjectState {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    projectId: crypto.randomUUID(),
    projectName: `新しい研究 ${now.toLocaleDateString("ja-JP")}`,
    appVersion: "0.1.0",
    contentVersion: "0.1.0",
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStage: "home",
    themeId: "cosmic-web-growth",
    motivation: null,
    researchQuestion: null,
    hypothesis: null,
    prediction: null,
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
