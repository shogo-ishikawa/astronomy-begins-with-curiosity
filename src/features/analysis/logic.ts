import type { ProjectState } from "../../domain/project";
import type { SnapshotId } from "../execution/logic";
import {
  METHOD_PACK as QUALITY_METHOD_PACK,
  QUALITY_RULESET_V1,
  canEnterAnalysisMode,
  qualityContextFingerprint,
  type QualityCheckRecord,
} from "../quality/logic";

export type AnalysisModeId = "guided-operations" | "python-with-mira";
export type PythonSupportLevel =
  | "first-time"
  | "basic-experience"
  | "think-and-write";
export type ComparisonStrategy = "all-planned" | "milestones" | "endpoints";
export type AnalysisRecipeRelation = "current" | "stale" | "unverifiable";

export const ANALYSIS_RULESET = {
  id: "analysis-design-rules-v1",
  version: "1.0.0",
} as const;
export const ANALYSIS_METHOD_PACK = {
  id: "cosmological-nbody-analysis",
  version: "1.0.0",
} as const;
export const ANALYSIS_MISSION_PACK = {
  id: "cosmic-web-growth-analysis-ja",
  version: "1.0.0",
} as const;
export const DENSE_FRACTION_DEFINITION = {
  quantity: "rho_over_mean",
  operator: ">=",
  threshold: 2,
  deltaOperator: ">=",
  deltaThreshold: 1,
  resultFields: ["matchingCellCount", "totalCellCount", "fraction"],
} as const;

export type AnalysisRecipe = {
  recipeKind: "cosmic-web-growth-v1";
  researchQuestionId: string;
  hypothesisId: string;
  predictionId: string;
  input: { quantity: "rho_over_mean"; snapshotIds: SnapshotId[] };
  measurements: {
    primaryMeasurementId: "density-image" | "sigma-delta" | "dense-fraction";
    transformIds: string[];
    summaryMethodIds: string[];
    denseFractionDefinition: typeof DENSE_FRACTION_DEFINITION;
  };
  comparison: {
    strategyId: ComparisonStrategy;
    snapshotIds: SnapshotId[];
    timeAxis: "scale-factor";
  };
  figures: {
    primaryFigureId: "density-panels" | "sigma-growth" | "dense-growth";
    supportingFigureIds: string[];
    sharedColorRange: boolean;
    sharedHistogramBins: boolean;
  };
  predictionCriteria: {
    supportConditionId: string;
    nonSupportConditionId: string;
    inconclusiveConditionId: string;
  };
  interpretationGuardIds: string[];
  carriedWarningIds: string[];
  carriedLimitationIds: string[];
};
export type AnalysisDesignResponse = {
  questionId: string;
  optionId: string;
  answeredAt: string;
  attempt: number;
};
export type AnalysisDesignDraft = {
  draftKind: "analysis-design-draft";
  draftId: string;
  createdAt: string;
  updatedAt: string;
  contextFingerprint: string;
  comparisonStrategy: ComparisonStrategy | null;
  snapshotIds: SnapshotId[];
  supportingFigureIds: string[];
  supportConditionId: string | null;
  nonSupportConditionId: string | null;
  inconclusiveConditionId: string | null;
  claimScopeId: string | null;
  purposeId: string | null;
  measurementReasonId: string | null;
  primaryFigureTradeoffId: string | null;
  modeId: AnalysisModeId | null;
  modeReasonIds: string[];
  pythonSupportLevel: PythonSupportLevel | null;
  responseHistory: AnalysisDesignResponse[];
  supersedesRecipeId: string | null;
};
export type AnalysisRecipeRecord = {
  recordKind: "analysis-recipe";
  schemaVersion: 1;
  recipeId: string;
  versionNumber: number;
  createdAt: string;
  completedAt: string;
  supersedesRecipeId: string | null;
  context: {
    themeId: string;
    planVersionId: string;
    planSubjectHash: string;
    packageId: string;
    acquisitionIdentity: string;
    acquisitionFingerprint: string;
    qualityRecordId: string;
    qualityContextFingerprint: string;
  };
  recipe: AnalysisRecipe;
  modeDecision: {
    modeId: AnalysisModeId;
    reasonIds: string[];
    pythonSupportLevel: PythonSupportLevel | null;
  };
  ruleSetId: string;
  methodPackId: string;
  methodPackVersion: string;
  missionPackId: string;
  missionPackVersion: string;
  scientificDefinitionFingerprint: string;
  setupFingerprint: string;
  responseHistory: AnalysisDesignResponse[];
};

function hash(value: unknown) {
  let h = 2166136261;
  for (const c of JSON.stringify(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `af-${(h >>> 0).toString(16).padStart(8, "0")}`;
}
export const scientificFingerprint = (
  context: AnalysisRecipeRecord["context"],
  recipe: AnalysisRecipe,
) =>
  hash({
    context,
    recipe,
    rules: ANALYSIS_RULESET,
    method: ANALYSIS_METHOD_PACK,
  });
export const setupFingerprint = (
  scientific: string,
  mode: AnalysisRecipeRecord["modeDecision"],
) => hash({ scientific, mode });

export function latestQuality(project: ProjectState) {
  const ref =
    project.resultPackage?.refKind === "bound" ? project.resultPackage : null;
  if (!ref) return undefined;
  const fp = qualityContextFingerprint(project, ref);
  return [...project.qualityChecks]
    .reverse()
    .find(
      (x): x is QualityCheckRecord =>
        x.recordKind === "quality-check" && x.contextFingerprint === fp,
    );
}

export function analysisDesignContext(project: ProjectState) {
  const ref =
    project.resultPackage?.refKind === "bound" ? project.resultPackage : null;
  const quality = latestQuality(project);
  if (!ref || !quality) return undefined;
  return {
    themeId: project.themeId,
    planVersionId: ref.planVersionId,
    planSubjectHash: ref.planSubjectHash,
    packageId: ref.packageId,
    acquisitionIdentity: ref.acquiredAt,
    acquisitionFingerprint: ref.acquisitionFingerprint,
    qualityRecordId: quality.recordId,
    qualityContextFingerprint: quality.contextFingerprint,
  };
}

export function createAnalysisDraft(
  project: ProjectState,
  now: string,
  id: string,
): AnalysisDesignDraft {
  const ref =
    project.resultPackage?.refKind === "bound" ? project.resultPackage : null;
  const context = analysisDesignContext(project);
  if (
    !ref ||
    !context ||
    !canEnterAnalysisMode(project, context.qualityContextFingerprint).canEnter
  )
    throw new Error("現行の品質確認から解析設計を開始できません。");
  return {
    draftKind: "analysis-design-draft",
    draftId: id,
    createdAt: now,
    updatedAt: now,
    contextFingerprint: hash(context),
    comparisonStrategy: null,
    snapshotIds: [],
    supportingFigureIds: [],
    supportConditionId: null,
    nonSupportConditionId: null,
    inconclusiveConditionId: null,
    claimScopeId: null,
    purposeId: null,
    measurementReasonId: null,
    primaryFigureTradeoffId: null,
    modeId: null,
    modeReasonIds: [],
    pythonSupportLevel: null,
    responseHistory: [],
    supersedesRecipeId: null,
  };
}

const FIGURE_BY_MEASUREMENT = {
  "density-image": "density-panels",
  "sigma-delta": "sigma-growth",
  "dense-fraction": "dense-growth",
} as const;
export function buildRecipe(
  project: ProjectState,
  draft: AnalysisDesignDraft,
): AnalysisRecipe {
  const plan = project.planVersions.find(
    (p) => p.planVersionId === project.activePlanVersionId,
  );
  if (!plan) throw new Error("承認済みPlanVersionがありません。");
  const primary = plan.subjectSnapshot.draft.primaryAnalysis;
  const figure = plan.subjectSnapshot.draft.plannedFigure;
  if (!primary || !figure || FIGURE_BY_MEASUREMENT[primary] !== figure)
    throw new Error(
      "PlanVersionの主解析と主図が対応していません。自動修正せず計画を見直してください。",
    );
  return {
    recipeKind: "cosmic-web-growth-v1",
    researchQuestionId: project.researchQuestion?.choiceId ?? "",
    hypothesisId: project.hypothesis?.choiceId ?? "",
    predictionId: project.prediction?.choiceId ?? "",
    input: { quantity: "rho_over_mean", snapshotIds: draft.snapshotIds },
    measurements: {
      primaryMeasurementId: primary,
      transformIds: primary === "density-image" ? [] : ["density-contrast"],
      summaryMethodIds:
        primary === "sigma-delta"
          ? ["population-standard-deviation"]
          : primary === "dense-fraction"
            ? ["dense-cell-fraction"]
            : [],
      denseFractionDefinition: DENSE_FRACTION_DEFINITION,
    },
    comparison: {
      strategyId: draft.comparisonStrategy!,
      snapshotIds: draft.snapshotIds,
      timeAxis: "scale-factor",
    },
    figures: {
      primaryFigureId: figure,
      supportingFigureIds: draft.supportingFigureIds,
      sharedColorRange: [figure, ...draft.supportingFigureIds].includes(
        "density-panels",
      ),
      sharedHistogramBins: draft.supportingFigureIds.includes("histogram"),
    },
    predictionCriteria: {
      supportConditionId: draft.supportConditionId!,
      nonSupportConditionId: draft.nonSupportConditionId!,
      inconclusiveConditionId: draft.inconclusiveConditionId!,
    },
    interpretationGuardIds: [
      draft.claimScopeId!,
      "dark-matter-not-star-formation",
    ],
    carriedWarningIds:
      latestQuality(project)
        ?.machineResults.filter((x) => x.outcome === "warning")
        .map((x) => x.checkId) ?? [],
    carriedLimitationIds: latestQuality(project)?.carriedLimitationIds ?? [],
  };
}

export function validateDraft(
  project: ProjectState,
  draft: AnalysisDesignDraft,
): string[] {
  const missing: string[] = [];
  for (const [key, value] of Object.entries({
    purpose: draft.purposeId,
    measurement: draft.measurementReasonId,
    comparison: draft.comparisonStrategy,
    figure: draft.primaryFigureTradeoffId,
    support: draft.supportConditionId,
    nonSupport: draft.nonSupportConditionId,
    inconclusive: draft.inconclusiveConditionId,
    claim: draft.claimScopeId,
    mode: draft.modeId,
    reason: draft.modeReasonIds[0],
  }))
    if (!value) missing.push(key);
  const required = draft.comparisonStrategy === "milestones" ? 3 : 2;
  if (draft.snapshotIds.length < required) missing.push("snapshots");
  if (!draft.supportingFigureIds.length) missing.push("supportingFigure");
  if (draft.modeId === "python-with-mira" && !draft.pythonSupportLevel)
    missing.push("pythonSupport");
  try {
    buildRecipe(project, draft);
  } catch {
    missing.push("planAlignment");
  }
  return [...new Set(missing)];
}

export function finalizeAnalysisDesign(
  project: ProjectState,
  draft: AnalysisDesignDraft,
  now: string,
  recipeId: string,
): ProjectState {
  const context = analysisDesignContext(project);
  if (
    !context ||
    hash(context) !== draft.contextFingerprint ||
    !canEnterAnalysisMode(project, context.qualityContextFingerprint).canEnter
  )
    throw new Error("解析設計中に品質または取得contextが変わりました。");
  if (validateDraft(project, draft).length)
    throw new Error("必須の解析設計が未完了です。");
  const recipe = buildRecipe(project, draft);
  const scientific = scientificFingerprint(context, recipe);
  const modeDecision = {
    modeId: draft.modeId!,
    reasonIds: draft.modeReasonIds,
    pythonSupportLevel:
      draft.modeId === "python-with-mira" ? draft.pythonSupportLevel : null,
  };
  const record: AnalysisRecipeRecord = {
    recordKind: "analysis-recipe",
    schemaVersion: 1,
    recipeId,
    versionNumber: project.analysisRecipes.length + 1,
    createdAt: draft.createdAt,
    completedAt: now,
    supersedesRecipeId: draft.supersedesRecipeId,
    context,
    recipe,
    modeDecision,
    ruleSetId: ANALYSIS_RULESET.id,
    methodPackId: ANALYSIS_METHOD_PACK.id,
    methodPackVersion: ANALYSIS_METHOD_PACK.version,
    missionPackId: ANALYSIS_MISSION_PACK.id,
    missionPackVersion: ANALYSIS_MISSION_PACK.version,
    scientificDefinitionFingerprint: scientific,
    setupFingerprint: setupFingerprint(scientific, modeDecision),
    responseHistory: structuredClone(draft.responseHistory),
  };
  return {
    ...project,
    analysisRecipes: [...project.analysisRecipes, record],
    activeAnalysisRecipeId: recipeId,
    analysisDesignDraft: null,
    currentStage: "analysis-mode",
    updatedAt: now,
  };
}

export function recipeRelation(
  project: ProjectState,
  record: AnalysisRecipeRecord,
): AnalysisRecipeRelation {
  if (project.resultPackage?.refKind !== "bound") return "unverifiable";
  const context = analysisDesignContext(project);
  if (!context) return "unverifiable";
  const inventory = new Set(
    project.resultPackage.snapshotInventory.map((x) => x.id),
  );
  return JSON.stringify(context) === JSON.stringify(record.context) &&
    record.ruleSetId === ANALYSIS_RULESET.id &&
    record.methodPackVersion === ANALYSIS_METHOD_PACK.version &&
    record.recipe.input.snapshotIds.every((id) => inventory.has(id))
    ? "current"
    : "stale";
}

export function canEnterAnalysis(project: ProjectState) {
  const record = project.analysisRecipes.find(
    (x) => x.recipeId === project.activeAnalysisRecipeId,
  );
  const relation = record ? recipeRelation(project, record) : "stale";
  const newerDraft = Boolean(
    project.analysisDesignDraft &&
      record &&
      project.analysisDesignDraft.updatedAt > record.completedAt,
  );
  const validMode = Boolean(
    record &&
      ["guided-operations", "python-with-mira"].includes(
        record.modeDecision.modeId,
      ) &&
      (record.modeDecision.modeId !== "python-with-mira" ||
        record.modeDecision.pythonSupportLevel),
  );
  const quality = latestQuality(project);
  const entry = canEnterAnalysisMode(project, quality?.contextFingerprint);
  const ok = Boolean(
    record &&
      relation === "current" &&
      !newerDraft &&
      validMode &&
      entry.canEnter &&
      validateRecipe(record.recipe).length === 0,
  );
  return {
    canEnter: ok,
    relation,
    reason: ok ? null : "現行の解析レシピがS11進入条件を満たしていません。",
  };
}
function validateRecipe(recipe: AnalysisRecipe) {
  const errors: string[] = [];
  const required = recipe.comparison.strategyId === "milestones" ? 3 : 2;
  if (recipe.comparison.snapshotIds.length < required)
    errors.push("snapshot-count");
  if (recipe.carriedLimitationIds.length === 0) errors.push("limitations");
  if (
    recipe.figures.primaryFigureId === "density-panels" &&
    !recipe.figures.sharedColorRange
  )
    errors.push("color-range");
  if (
    recipe.figures.supportingFigureIds.includes("histogram") &&
    !recipe.figures.sharedHistogramBins
  )
    errors.push("histogram-bins");
  return errors;
}

// Kept as an explicit compatibility assertion: S09 and S10 use distinct packs.
void QUALITY_METHOD_PACK;
void QUALITY_RULESET_V1;
