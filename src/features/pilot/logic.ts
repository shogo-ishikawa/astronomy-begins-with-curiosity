import type { ProjectState } from "../../domain/project";
import type { PlanVersion } from "../review/logic";

export type PilotAxis = "particle-count" | "box-size";
export type DisplayMode = "shared" | "individual";
export type PilotSettings = {
  boxSizeMpcOverH: number;
  particleSide: number;
  snapshotId: string;
  projection: "xy";
  densityEstimator: "demo-multiscale-field";
  smoothing: "matched-v1";
  displayGrid: 64;
  seed: 1701;
};
export type PilotRecord = {
  pilotId: string;
  status:
    | "setup"
    | "prediction-locked"
    | "revealed"
    | "awaiting-rereview"
    | "complete";
  baselinePlanVersionId: string;
  baseline: PilotSettings;
  axis: PilotAxis | null;
  comparison: PilotSettings | null;
  fixedFields: string[];
  predictionIds: string[];
  predictionNote: string;
  predictionLockedAt: string | null;
  fixtureRef: null | {
    fixtureId: string;
    generatorVersion: "1.0.0";
    dataVersion: "demo-pilot-1";
    seed: 1701;
  };
  revealedAt: string | null;
  displayMode: DisplayMode;
  colorScale: null | {
    transform: "log1p";
    sharedMin: number;
    sharedMax: number;
  };
  observationIds: string[];
  predictionAssessment:
    | "supported"
    | "partly"
    | "different"
    | "uncertain"
    | null;
  decisions: {
    decision: "maintain" | "revise" | "unsure";
    reason: string;
    at: string;
  }[];
  revisionDraftRef: string | null;
  resultingPlanVersionId: string | null;
  completedAt: string | null;
  contentVersion: "pilot-content-v1";
  dataVersion: "demo-pilot-1";
  formulaVersion: "pilot-formulas-v1";
};

export const boxCandidates = [25, 50, 75, 100] as const;
export const particleCandidates = [16, 32, 64] as const;
export function adjacentCandidates(value: number, values: readonly number[]) {
  const i = values.indexOf(value);
  if (i < 0) throw new Error("未知の候補です。");
  return [values[i - 1], values[i + 1]].filter(
    (x): x is number => x !== undefined,
  );
}
export function settingsFromPlan(
  plan: PlanVersion,
  snapshotId = plan.resolved.snapshotIds[0],
): PilotSettings {
  return {
    boxSizeMpcOverH: plan.resolved.boxSizeMpcOverH,
    particleSide: plan.resolved.particleSide,
    snapshotId,
    projection: "xy",
    densityEstimator: "demo-multiscale-field",
    smoothing: "matched-v1",
    displayGrid: 64,
    seed: 1701,
  };
}
export function validateComparison(
  base: PilotSettings,
  other: PilotSettings,
  axis: PilotAxis,
) {
  const mutable = axis === "box-size" ? "boxSizeMpcOverH" : "particleSide";
  for (const key of Object.keys(base) as (keyof PilotSettings)[])
    if (key !== mutable && base[key] !== other[key])
      throw new Error(`固定条件 ${key} が変化しています。`);
  if (base[mutable] === other[mutable])
    throw new Error("同値比較はできません。");
  const candidates = axis === "box-size" ? boxCandidates : particleCandidates;
  if (
    !adjacentCandidates(base[mutable] as number, candidates).includes(
      other[mutable] as never,
    )
  )
    throw new Error("比較相手は隣接候補にしてください。");
  return true;
}
export const particleSpacing = (L: number, n: number) => L / n;
export const relativeParticleData = (n: number) => (n / 32) ** 3;
export function sigmaDelta(values: ArrayLike<number>) {
  if (!values.length) throw new Error("空の密度場です。");
  let mean = 0;
  for (let i = 0; i < values.length; i++) mean += values[i]!;
  mean /= values.length;
  let variance = 0;
  for (let i = 0; i < values.length; i++)
    variance += (values[i]! / mean - 1) ** 2;
  return Math.sqrt(variance / values.length);
}
export function activeReviewedPlan(project: ProjectState) {
  if (!project.activePlanVersionId || !project.planReviewCompletedAt)
    return null;
  return (
    project.planVersions.find(
      (p) => p.planVersionId === project.activePlanVersionId,
    ) ?? null
  );
}
export function isPilotComplete(project: ProjectState) {
  return project.pilot?.status === "complete";
}
