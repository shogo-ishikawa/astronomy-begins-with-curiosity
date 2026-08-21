import type { ProjectState } from "../../domain/project";
import { latestQuality, type AnalysisRecipeRecord } from "./logic";
import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "./numerical";

export type AnalysisRunDraft = {
  recordKind: "analysis-run-draft";
  schemaVersion: 1;
  runId: string;
  recipeId: string;
  completedLearningStep: number;
  contextFingerprint: string;
  numericalContractId: string;
  numericalContractVersion: string;
  updatedAt: string;
};

export type GuidedAnalysisResult = {
  recordKind: "guided-analysis-result";
  schemaVersion: 1;
  runId: string;
  recipeId: string;
  contextFingerprint: string;
  numericalContract: { id: string; version: string };
  completedAt: string;
  caption: string;
  snapshots: unknown[];
  [key: string]: unknown;
};

type FigureBase = {
  recordKind: "scientific-figure";
  schemaVersion: 1;
  figureId: string;
  runId: string;
  recipeId: string;
  role: "primary" | "supporting" | "exploratory";
  title: string;
  caption: string;
  createdAt: string;
  snapshotIds: string[];
  provenance: unknown;
};
export type ScientificFigure =
  | (FigureBase & {
      figureKind: "density-panels";
      displayMode: "comparison" | "structure";
      axes: { x: "grid-x"; y: "grid-y"; color: "normalized-density-q" };
      colorMap: "cividis-like";
      displayRanges: { snapshotId: string; minimum: number; maximum: number }[];
    })
  | (FigureBase & {
      figureKind: "histogram";
      axes: { x: "density-contrast-delta"; y: "cell-fraction" };
      binCount: number;
      boundaries: number[];
      baselineThreshold: { operator: ">="; q: 2; delta: 1 };
    })
  | (FigureBase & {
      figureKind: "sigma-growth";
      axes: { x: "scale-factor-a"; y: "sigma-delta" };
    })
  | (FigureBase & {
      figureKind: "dense-growth";
      axes: { x: "scale-factor-a"; y: "dense-cell-fraction" };
      baselineThreshold: { operator: ">="; q: 2; delta: 1 };
      sensitivityThresholds: number[];
      displayedSeries: number[];
    });

export function analysisContextFingerprint(
  project: ProjectState,
  recipe: AnalysisRecipeRecord,
): string | undefined {
  const ref =
    project.resultPackage?.refKind === "bound"
      ? project.resultPackage
      : undefined;
  const quality = latestQuality(project);
  if (!ref || !quality) return undefined;
  return JSON.stringify({
    recipeId: recipe.recipeId,
    recipeVersion: recipe.versionNumber,
    scientificDefinitionFingerprint: recipe.scientificDefinitionFingerprint,
    setupFingerprint: recipe.setupFingerprint,
    planVersionId: ref.planVersionId,
    planSubjectHash: ref.planSubjectHash,
    packageId: ref.packageId,
    requestFingerprint: ref.requestFingerprint,
    acquisitionFingerprint: ref.acquisitionFingerprint,
    qualityRecordId: quality.recordId,
    qualityFingerprint: quality.contextFingerprint,
    dataVersion: ref.dataVersion,
    fixtureVersion: ref.fixtureVersion,
    numericalContractId: ANALYSIS_NUMERICAL_CONTRACT_V1.id,
    numericalContractVersion: ANALYSIS_NUMERICAL_CONTRACT_V1.version,
  });
}

export function isAnalysisDraft(value: unknown): value is AnalysisRunDraft {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Partial<AnalysisRunDraft>;
  return (
    x.recordKind === "analysis-run-draft" &&
    x.schemaVersion === 1 &&
    typeof x.runId === "string" &&
    x.runId.length > 0 &&
    typeof x.recipeId === "string" &&
    x.recipeId.length > 0 &&
    Number.isInteger(x.completedLearningStep) &&
    x.completedLearningStep! >= 0 &&
    x.completedLearningStep! <= 6 &&
    typeof x.contextFingerprint === "string" &&
    x.numericalContractId === ANALYSIS_NUMERICAL_CONTRACT_V1.id &&
    x.numericalContractVersion === ANALYSIS_NUMERICAL_CONTRACT_V1.version
  );
}

export function isGuidedResult(value: unknown): value is GuidedAnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Partial<GuidedAnalysisResult>;
  return (
    x.recordKind === "guided-analysis-result" &&
    x.schemaVersion === 1 &&
    typeof x.runId === "string" &&
    typeof x.recipeId === "string" &&
    typeof x.contextFingerprint === "string" &&
    x.numericalContract?.id === ANALYSIS_NUMERICAL_CONTRACT_V1.id &&
    x.numericalContract?.version === ANALYSIS_NUMERICAL_CONTRACT_V1.version
  );
}

export function artifactRelation(
  project: ProjectState,
  recipe: AnalysisRecipeRecord,
  value: unknown,
): "current" | "stale" | "unverifiable" {
  const current = analysisContextFingerprint(project, recipe);
  if (!current || (!isAnalysisDraft(value) && !isGuidedResult(value)))
    return "unverifiable";
  return value.recipeId === recipe.recipeId &&
    value.contextFingerprint === current
    ? "current"
    : "stale";
}
