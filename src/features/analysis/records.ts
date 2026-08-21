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
  commonHistogramBoundaries: number[];
  dataVersion: string;
  fixtureVersion: string;
  [key: string]: unknown;
};

export type PythonAnalysisDraft = {
  recordKind: "python-analysis-draft";
  schemaVersion: 1;
  currentStep: number;
  codeByStep: Record<string, string>;
  hintLevelByStep: Record<string, number>;
  supportLevel: "first-time" | "basic-experience" | "think-and-write";
  referencedGuiResultId: string;
  recipeId: string;
  contextFingerprint: string;
  updatedAt: string;
};
export type PythonAssistedAnalysisResult = {
  recordKind: "python-assisted-analysis-result";
  schemaVersion: 1;
  recordId: string;
  runId: string;
  referencedGuiResultId: string;
  recipeId: string;
  contextFingerprint: string;
  executedEngine: "pyodide-python";
  runtime: {
    pyodide: string;
    python: string;
    numpy: string;
    matplotlib: string;
  };
  snapshots: unknown[];
  parityRows: import("./pythonParity").ParityRow[];
  createdAt: string;
  completedAt: string;
  [key: string]: unknown;
};

const stringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((x) => typeof x === "string");
export function isPythonAnalysisDraft(
  value: unknown,
): value is PythonAnalysisDraft {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Partial<PythonAnalysisDraft>;
  return (
    x.recordKind === "python-analysis-draft" &&
    x.schemaVersion === 1 &&
    Number.isInteger(x.currentStep) &&
    x.currentStep! >= 0 &&
    x.currentStep! <= 9 &&
    stringRecord(x.codeByStep) &&
    typeof x.hintLevelByStep === "object" &&
    ["first-time", "basic-experience", "think-and-write"].includes(
      x.supportLevel ?? "",
    ) &&
    typeof x.referencedGuiResultId === "string" &&
    x.referencedGuiResultId.length > 0 &&
    typeof x.recipeId === "string" &&
    typeof x.contextFingerprint === "string" &&
    typeof x.updatedAt === "string"
  );
}
export function isPythonAssistedResult(
  value: unknown,
): value is PythonAssistedAnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Partial<PythonAssistedAnalysisResult>;
  return (
    x.recordKind === "python-assisted-analysis-result" &&
    x.schemaVersion === 1 &&
    x.executedEngine === "pyodide-python" &&
    typeof x.recordId === "string" &&
    x.recordId.length > 0 &&
    typeof x.runId === "string" &&
    typeof x.referencedGuiResultId === "string" &&
    typeof x.recipeId === "string" &&
    typeof x.contextFingerprint === "string" &&
    typeof x.runtime === "object" &&
    x.runtime !== null &&
    [
      x.runtime.pyodide,
      x.runtime.python,
      x.runtime.numpy,
      x.runtime.matplotlib,
    ].every((v) => typeof v === "string") &&
    Array.isArray(x.snapshots) &&
    Array.isArray(x.parityRows) &&
    typeof x.createdAt === "string" &&
    typeof x.completedAt === "string"
  );
}

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
    Array.isArray(x.commonHistogramBoundaries) &&
    x.commonHistogramBoundaries.length === 31 &&
    x.commonHistogramBoundaries.every(Number.isFinite) &&
    typeof x.dataVersion === "string" &&
    typeof x.fixtureVersion === "string" &&
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
