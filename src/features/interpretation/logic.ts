import type { ProjectState } from "../../domain/project";
import type { ScientificFigure } from "../analysis/records";
import {
  analysisContextFingerprint,
  artifactRelation,
  isGuidedResult,
} from "../analysis/records";
import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "../analysis/numerical";

export const INTERPRETATION_CONTENT_VERSION = "s12-content-v1";
export const INTERPRETATION_REVIEW_VERSION = "s12-review-v1";
export const TREND_TOLERANCE = 1e-9;
const activeRecipe = (project: ProjectState) =>
  project.analysisRecipes.find(
    (x) => x.recipeId === project.activeAnalysisRecipeId,
  );

export type SnapshotStatistic = {
  id: string;
  redshift: number;
  scaleFactor: number;
  normalizedMean: number;
  sigmaDelta: number;
  baselineDenseFraction: { threshold: number; fraction: number };
};
export type EvidenceRef =
  | { kind: "figure"; figureId: string; runId: string; figureKind: string }
  | {
      kind: "snapshot-statistic";
      runId: string;
      snapshotId: string;
      metric: string;
      value: number;
    }
  | {
      kind: "comparison";
      runId: string;
      fromSnapshotId: string;
      toSnapshotId: string;
      metric: string;
      fromValue: number;
      toValue: number;
      direction: "increase" | "decrease" | "no-clear-change";
    };
export type LimitationCategory = "model" | "measurement" | "generalization";
export type InterpretationDraft = {
  recordKind: "interpretation-draft";
  schemaVersion: 1;
  draftId: string;
  contextFingerprint: string;
  runId: string;
  step: number;
  evidence: EvidenceRef[];
  resultClaimId: string | null;
  interpretationClaimId: string | null;
  predictionMatch: "aligned" | "partly" | "not-aligned" | "insufficient" | null;
  answerId: string | null;
  scopeId: string | null;
  limitations: { id: string; category: LimitationCategory; impactId: string }[];
  addressedGuardIds: string[];
  note: string;
  updatedAt: string;
};
export type InterpretationResult = Omit<
  InterpretationDraft,
  "recordKind" | "step" | "updatedAt"
> & {
  recordKind: "evidence-based-interpretation-result";
  resultId: string;
  completedAt: string;
  reviewCodes: ReviewCode[];
};
export type InterpretationStore = {
  drafts: InterpretationDraft[];
  results: InterpretationResult[];
  retained: unknown[];
};
export type ReviewCode =
  | "missing-evidence"
  | "contradicted-by-data"
  | "mixed-result-and-interpretation"
  | "demo-as-cws-or-real"
  | "galaxy-from-dm-only"
  | "single-seed-generalization"
  | "below-resolution"
  | "correlation-as-causation"
  | "prediction-as-proof"
  | "conclusion-does-not-answer-question"
  | "missing-model-limitation"
  | "missing-measurement-limitation"
  | "missing-generalization-limitation"
  | "carried-guard-unaddressed";

const finite = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
export function parseSnapshots(value: unknown): SnapshotStatistic[] {
  if (!Array.isArray(value)) throw new Error("snapshot配列がありません");
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("snapshotが不正です");
    const x = raw as Record<string, unknown>;
    const dense = x.baselineDenseFraction as
      | Record<string, unknown>
      | undefined;
    if (
      typeof x.id !== "string" ||
      ![
        x.redshift,
        x.scaleFactor,
        x.normalizedMean,
        x.sigmaDelta,
        dense?.threshold,
        dense?.fraction,
      ].every(finite)
    )
      throw new Error("snapshotの必須数値が有限ではありません");
    return {
      id: x.id,
      redshift: x.redshift as number,
      scaleFactor: x.scaleFactor as number,
      normalizedMean: x.normalizedMean as number,
      sigmaDelta: x.sigmaDelta as number,
      baselineDenseFraction: {
        threshold: dense!.threshold as number,
        fraction: dense!.fraction as number,
      },
    };
  });
}
export function direction(
  from: number,
  to: number,
  tolerance = TREND_TOLERANCE,
): "increase" | "decrease" | "no-clear-change" {
  if (!finite(from) || !finite(to)) throw new Error("有限値が必要です");
  const d = to - from;
  return Math.abs(d) <= tolerance
    ? "no-clear-change"
    : d > 0
      ? "increase"
      : "decrease";
}
export function trend(
  values: { scaleFactor: number; value: number }[],
  tolerance = TREND_TOLERANCE,
) {
  const sorted = [...values].sort((a, b) => a.scaleFactor - b.scaleFactor);
  if (sorted.some((x) => !finite(x.scaleFactor) || !finite(x.value)))
    throw new Error("有限値が必要です");
  const dirs = sorted
    .slice(1)
    .map((x, i) => direction(sorted[i]!.value, x.value, tolerance));
  return {
    ordered: sorted,
    direction: direction(sorted[0]!.value, sorted.at(-1)!.value, tolerance),
    monotonicIncrease: dirs.every((x) => x === "increase"),
    monotonicDecrease: dirs.every((x) => x === "decrease"),
  };
}

export function currentAnalysis(project: ProjectState) {
  const recipe = activeRecipe(project);
  if (!recipe) return;
  const result = [...project.analysisOutputs]
    .reverse()
    .find(
      (x) =>
        isGuidedResult(x) && artifactRelation(project, recipe, x) === "current",
    );
  if (!result || !isGuidedResult(result)) return;
  try {
    return {
      recipe,
      result,
      snapshots: parseSnapshots(result.snapshots),
      figures: project.figures.filter(
        (x): x is ScientificFigure =>
          !!x &&
          typeof x === "object" &&
          (x as ScientificFigure).recordKind === "scientific-figure" &&
          (x as ScientificFigure).runId === result.runId &&
          (x as ScientificFigure).recipeId === recipe.recipeId,
      ),
    };
  } catch {
    return;
  }
}
export function canEnterInterpretation(project: ProjectState) {
  const current = currentAnalysis(project);
  return current && current.figures.length
    ? { canEnter: true as const }
    : {
        canEnter: false as const,
        reason: "現在有効なS11A GUI解析結果と同一runの科学図が必要です。",
      };
}
export function interpretationFingerprint(project: ProjectState) {
  const x = currentAnalysis(project);
  if (!x) return;
  return JSON.stringify({
    runId: x.result.runId,
    recipeId: x.recipe.recipeId,
    analysisContext: analysisContextFingerprint(project, x.recipe),
    contract: ANALYSIS_NUMERICAL_CONTRACT_V1,
    figures: x.figures.map((f) => f.figureId).sort(),
    question: project.researchQuestion,
    hypothesis: project.hypothesis,
    prediction: project.prediction,
    content: INTERPRETATION_CONTENT_VERSION,
    review: INTERPRETATION_REVIEW_VERSION,
  });
}
export function normalizeInterpretation(value: unknown): InterpretationStore {
  const empty = {
    drafts: [],
    results: [],
    retained: [],
  } as InterpretationStore;
  if (!value || typeof value !== "object")
    return { ...empty, retained: value == null ? [] : [value] };
  const x = value as Record<string, unknown>;
  if ("result" in x && "conclusion" in x) return empty;
  if (Array.isArray(x.drafts) && Array.isArray(x.results))
    return {
      drafts: x.drafts.filter(isDraft),
      results: x.results.filter(isResult),
      retained: [
        ...(Array.isArray(x.retained) ? x.retained : []),
        ...x.drafts.filter((v) => !isDraft(v)),
        ...x.results.filter((v) => !isResult(v)),
      ],
    };
  return { ...empty, retained: [value] };
}
const isDraft = (v: unknown): v is InterpretationDraft =>
  !!v &&
  typeof v === "object" &&
  (v as InterpretationDraft).recordKind === "interpretation-draft" &&
  (v as InterpretationDraft).schemaVersion === 1;
const isResult = (v: unknown): v is InterpretationResult =>
  !!v &&
  typeof v === "object" &&
  (v as InterpretationResult).recordKind ===
    "evidence-based-interpretation-result" &&
  (v as InterpretationResult).schemaVersion === 1;
export function relation(
  project: ProjectState,
  record: { contextFingerprint: string },
): "current" | "stale" | "unverifiable" {
  const fp = interpretationFingerprint(project);
  return !fp
    ? "unverifiable"
    : fp === record.contextFingerprint
      ? "current"
      : "stale";
}
export function resolveEvidence(project: ProjectState, refs: EvidenceRef[]) {
  const current = currentAnalysis(project);
  if (!current) throw new Error("current analysis unavailable");
  const seen = new Set<string>();
  return refs.map((ref) => {
    const key = JSON.stringify(ref);
    if (seen.has(key)) throw new Error("duplicate evidence");
    seen.add(key);
    if (ref.runId !== current.result.runId) throw new Error("different run");
    if (ref.kind === "figure") {
      const f = current.figures.find(
        (x) => x.figureId === ref.figureId && x.figureKind === ref.figureKind,
      );
      if (!f) throw new Error("unrelated figure");
      return f;
    }
    const get = (id: string, metric: string) => {
      const s = current.snapshots.find((x) => x.id === id);
      if (!s) throw new Error("missing snapshot");
      const v =
        metric === "sigmaDelta"
          ? s.sigmaDelta
          : metric === "normalizedMean"
            ? s.normalizedMean
            : metric === "denseFraction"
              ? s.baselineDenseFraction.fraction
              : NaN;
      if (!finite(v)) throw new Error("invalid metric");
      return v;
    };
    if (ref.kind === "snapshot-statistic") {
      if (get(ref.snapshotId, ref.metric) !== ref.value)
        throw new Error("changed value");
      return ref;
    }
    if (
      get(ref.fromSnapshotId, ref.metric) !== ref.fromValue ||
      get(ref.toSnapshotId, ref.metric) !== ref.toValue ||
      direction(ref.fromValue, ref.toValue) !== ref.direction
    )
      throw new Error("changed comparison");
    return ref;
  });
}

export function reviewDraft(
  d: InterpretationDraft,
  carried: string[] = [],
): ReviewCode[] {
  const codes = new Set<ReviewCode>();
  const figures = d.evidence.filter((x) => x.kind === "figure").length,
    numeric = d.evidence.length - figures;
  if (!figures || !numeric || d.evidence.length < 3)
    codes.add("missing-evidence");
  const claim = d.resultClaimId ?? "";
  const interp = d.interpretationClaimId ?? "";
  if (claim.includes("cause")) codes.add("mixed-result-and-interpretation");
  if (claim.includes("contradicted")) codes.add("contradicted-by-data");
  if (interp === "real-cws") codes.add("demo-as-cws-or-real");
  if (interp === "galaxy") codes.add("galaxy-from-dm-only");
  if (d.scopeId === "universe") codes.add("single-seed-generalization");
  if (interp === "below-resolution") codes.add("below-resolution");
  if (interp === "causal") codes.add("correlation-as-causation");
  if (d.predictionMatch === "aligned" && d.answerId === "prediction-proof")
    codes.add("prediction-as-proof");
  if (!d.answerId || !d.scopeId)
    codes.add("conclusion-does-not-answer-question");
  for (const [cat, code] of [
    ["model", "missing-model-limitation"],
    ["measurement", "missing-measurement-limitation"],
    ["generalization", "missing-generalization-limitation"],
  ] as const)
    if (!d.limitations.some((x) => x.category === cat && x.impactId))
      codes.add(code);
  if (carried.some((x) => !d.addressedGuardIds.includes(x)))
    codes.add("carried-guard-unaddressed");
  return [...codes];
}
export function saveDraft(
  store: InterpretationStore,
  draft: InterpretationDraft,
) {
  const existing = store.drafts.find((x) => x.draftId === draft.draftId);
  if (existing && existing.contextFingerprint !== draft.contextFingerprint)
    throw new Error("draft context mismatch");
  return {
    ...store,
    drafts: [
      ...store.drafts.filter((x) => x.draftId !== draft.draftId),
      structuredClone(draft),
    ],
  };
}
export function appendResult(
  store: InterpretationStore,
  result: InterpretationResult,
) {
  if (store.results.some((x) => x.resultId === result.resultId))
    throw new Error("result is immutable");
  return { ...store, results: [...store.results, structuredClone(result)] };
}
