import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  migrateProject,
  projectStateSchema,
} from "../../domain/project";
import {
  DENSE_FRACTION_DEFINITION,
  scientificFingerprint,
  setupFingerprint,
  type AnalysisRecipe,
  type AnalysisRecipeRecord,
} from "./logic";

const context: AnalysisRecipeRecord["context"] = {
  themeId: "cosmic-web-growth",
  planVersionId: "plan-1",
  planSubjectHash: "subject-1",
  packageId: "package-1",
  acquisitionIdentity: "2026-08-21T00:00:00.000Z",
  acquisitionFingerprint: "acq-1",
  qualityRecordId: "quality-1",
  qualityContextFingerprint: "quality-context-1",
};
const recipe = {
  recipeKind: "cosmic-web-growth-v1",
  researchQuestionId: "question",
  hypothesisId: "hypothesis",
  predictionId: "prediction",
  input: { quantity: "rho_over_mean", snapshotIds: ["initial", "z0"] },
  measurements: {
    primaryMeasurementId: "dense-fraction",
    transformIds: ["density-contrast"],
    summaryMethodIds: ["dense-cell-fraction"],
    denseFractionDefinition: DENSE_FRACTION_DEFINITION,
  },
  comparison: {
    strategyId: "endpoints",
    snapshotIds: ["initial", "z0"],
    timeAxis: "scale-factor",
  },
  figures: {
    primaryFigureId: "dense-growth",
    supportingFigureIds: ["histogram"],
    sharedColorRange: false,
    sharedHistogramBins: true,
  },
  predictionCriteria: {
    supportConditionId: "support",
    nonSupportConditionId: "not",
    inconclusiveConditionId: "check",
  },
  interpretationGuardIds: ["fixture-only"],
  carriedWarningIds: [],
  carriedLimitationIds: ["demo"],
} satisfies AnalysisRecipe;

describe("S10 analysis design", () => {
  it("uses the approved inclusive dense-fraction definition", () => {
    expect(DENSE_FRACTION_DEFINITION).toMatchObject({
      operator: ">=",
      threshold: 2,
      deltaOperator: ">=",
      deltaThreshold: 1,
    });
  });
  it("keeps science fingerprint mode-independent and setup mode-dependent", () => {
    const science = scientificFingerprint(context, recipe);
    const guided = setupFingerprint(science, {
      modeId: "guided-operations",
      reasonIds: ["stepwise"],
      pythonSupportLevel: null,
    });
    const python = setupFingerprint(science, {
      modeId: "python-with-mira",
      reasonIds: ["stepwise"],
      pythonSupportLevel: "first-time",
    });
    expect(scientificFingerprint(context, recipe)).toBe(science);
    expect(guided).not.toBe(python);
  });
  it("migrates schema 8 placeholders without selecting a mode or creating a record", () => {
    const current = createEmptyProject(new Date("2026-08-21T00:00:00.000Z"));
    const old = {
      ...current,
      schemaVersion: 8,
      analysisMode: "gui",
      analysisRecipe: { highDensity: { rhoOverMeanThreshold: 5 } },
    };
    delete (old as Partial<typeof old>).analysisDesignDraft;
    delete (old as Partial<typeof old>).analysisRecipes;
    delete (old as Partial<typeof old>).activeAnalysisRecipeId;
    delete (old as Partial<typeof old>).legacyAnalysisSetup;
    const migrated = migrateProject(old);
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.analysisDesignDraft).toBeNull();
    expect(migrated.analysisRecipes).toEqual([]);
    expect(migrated.activeAnalysisRecipeId).toBeNull();
    expect(migrated.legacyAnalysisSetup).toEqual({
      analysisMode: "gui",
      analysisRecipe: old.analysisRecipe,
    });
    expect(migrateProject(migrated)).toEqual(migrated);
    expect(
      projectStateSchema.parse(JSON.parse(JSON.stringify(migrated))),
    ).toBeTruthy();
  });
});
