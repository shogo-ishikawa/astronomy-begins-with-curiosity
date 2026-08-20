export const SNAPSHOT_ORDER = [
  "initial",
  "z10",
  "z5",
  "z2",
  "z1",
  "z0",
] as const;
export const REASON_KEYS = [
  "priorityGoal",
  "boxSize",
  "particleSide",
  "snapshots",
  "primaryAnalysis",
  "figurePrediction",
] as const;

export type ReasonKey = (typeof REASON_KEYS)[number];
export type ResearchPlanDraft = {
  contentId: "research-plan-v1";
  priorityGoal: "large-web" | "dense-detail" | "balance" | null;
  boxSizeMpcOverH: 25 | 50 | 75 | 100 | null;
  particleSide: 16 | 32 | 64 | null;
  snapshotIds: (typeof SNAPSHOT_ORDER)[number][];
  primaryAnalysis: "density-image" | "sigma-delta" | "dense-fraction" | null;
  plannedFigure: "density-panels" | "sigma-growth" | "dense-growth" | null;
  expectedPattern:
    | "increase"
    | "decrease"
    | "stable"
    | "complex"
    | "unsure"
    | null;
  reasonIds: Record<
    ReasonKey,
    "evidence" | "tradeoff" | "baseline" | "familiar" | "unsure" | null
  >;
  note: string;
  updatedAt: string | null;
  completedAt: string | null;
};

export function emptyResearchPlanDraft(): ResearchPlanDraft {
  return {
    contentId: "research-plan-v1",
    priorityGoal: null,
    boxSizeMpcOverH: null,
    particleSide: null,
    snapshotIds: [],
    primaryAnalysis: null,
    plannedFigure: null,
    expectedPattern: null,
    reasonIds: Object.fromEntries(
      REASON_KEYS.map((key) => [key, null]),
    ) as ResearchPlanDraft["reasonIds"],
    note: "",
    updatedAt: null,
    completedAt: null,
  };
}

export function calculatePlanMetrics(boxSize: number, particleSide: number) {
  return {
    meanParticleSpacing: boxSize / particleSide,
    relativeParticleMass: (boxSize / 50) ** 3 * (32 / particleSide) ** 3,
    relativeParticleData: (particleSide / 32) ** 3,
    totalParticles: particleSide ** 3,
  };
}

export function normalizeSnapshotIds(ids: readonly string[]) {
  const selected = new Set(ids);
  return SNAPSHOT_ORDER.filter((id) => selected.has(id));
}

export function snapshotRecommendation(ids: readonly string[]) {
  const normalized = normalizeSnapshotIds(ids);
  const intermediateCount = normalized.filter(
    (id) => !["initial", "z0"].includes(id),
  ).length;
  const missing: string[] = [];
  if (!normalized.includes("initial"))
    missing.push("初期状態との比較ができません。");
  if (!normalized.includes("z0"))
    missing.push("現在までの変化を確認できません。");
  if (intermediateCount < 2 || normalized.length < 4)
    missing.push("変化がいつ進んだのか判断しにくくなります。");
  return { recommended: missing.length === 0, missing };
}

export function planCompletionMissing(draft: ResearchPlanDraft) {
  const missing: { key: string; label: string }[] = [];
  const fields = [
    ["priorityGoal", draft.priorityGoal, "研究で優先すること"],
    ["boxSizeMpcOverH", draft.boxSizeMpcOverH, "箱サイズ"],
    ["particleSide", draft.particleSide, "粒子数"],
    ["snapshotIds", draft.snapshotIds.length, "スナップショット"],
    ["primaryAnalysis", draft.primaryAnalysis, "主な解析方法"],
    ["plannedFigure", draft.plannedFigure, "主要図"],
    ["expectedPattern", draft.expectedPattern, "今回の事前予想"],
  ] as const;
  fields.forEach(([key, value, label]) => {
    if (!value) missing.push({ key, label });
  });
  REASON_KEYS.forEach((key) => {
    if (!draft.reasonIds[key])
      missing.push({
        key: `reason-${key}`,
        label: `${reasonLabels[key]}の理由`,
      });
  });
  return missing;
}

export const reasonLabels: Record<ReasonKey, string> = {
  priorityGoal: "優先目的",
  boxSize: "箱サイズ",
  particleSide: "粒子数",
  snapshots: "スナップショット",
  primaryAnalysis: "主解析",
  figurePrediction: "主要図と予想",
};

export function updateDraft(
  draft: ResearchPlanDraft,
  change: Partial<ResearchPlanDraft>,
  reasonToReset: ReasonKey | null,
  now: string,
) {
  const changed = Object.entries(change).some(
    ([key, value]) =>
      JSON.stringify(draft[key as keyof ResearchPlanDraft]) !==
      JSON.stringify(value),
  );
  if (!changed) return draft;
  return {
    ...draft,
    ...change,
    snapshotIds: change.snapshotIds
      ? normalizeSnapshotIds(change.snapshotIds)
      : draft.snapshotIds,
    reasonIds: reasonToReset
      ? { ...draft.reasonIds, [reasonToReset]: null }
      : draft.reasonIds,
    updatedAt: now,
    completedAt: null,
  };
}
