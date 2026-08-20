import { describe, expect, it } from "vitest";
import {
  calculatePlanMetrics,
  emptyResearchPlanDraft,
  normalizeSnapshotIds,
  planCompletionMissing,
  snapshotRecommendation,
  updateDraft,
} from "./logic";

describe("研究計画の純粋ロジック", () => {
  it.each([
    [50, 32, 1.5625, 1, 1],
    [25, 32, 0.78125, 0.125, 1],
    [100, 16, 6.25, 64, 0.125],
    [100, 64, 1.5625, 1, 8],
  ])("L=%i, N=%i の派生量", (l, n, spacing, mass, data) => {
    expect(calculatePlanMetrics(l, n)).toMatchObject({
      meanParticleSpacing: spacing,
      relativeParticleMass: mass,
      relativeParticleData: data,
    });
  });
  it("スナップショットを重複除去して時系列順にする", () => {
    expect(normalizeSnapshotIds(["z0", "z5", "z5", "initial"])).toEqual([
      "initial",
      "z5",
      "z0",
    ]);
  });
  it("入力完了と科学的推奨条件を分離する", () => {
    const complete = {
      ...emptyResearchPlanDraft(),
      priorityGoal: "balance" as const,
      boxSizeMpcOverH: 50 as const,
      particleSide: 32 as const,
      snapshotIds: ["z5" as const],
      primaryAnalysis: "density-image" as const,
      plannedFigure: "density-panels" as const,
      expectedPattern: "unsure" as const,
      reasonIds: {
        priorityGoal: "unsure",
        boxSize: "unsure",
        particleSide: "unsure",
        snapshots: "unsure",
        primaryAnalysis: "unsure",
        figurePrediction: "unsure",
      } as const,
    };
    expect(planCompletionMissing(complete)).toEqual([]);
    expect(snapshotRecommendation(complete.snapshotIds).recommended).toBe(
      false,
    );
  });
  it("変更した判断の理由と完了時刻だけを解除する", () => {
    const old = {
      ...emptyResearchPlanDraft(),
      priorityGoal: "balance" as const,
      completedAt: "2026-08-20T00:00:00.000Z",
      reasonIds: {
        ...emptyResearchPlanDraft().reasonIds,
        priorityGoal: "tradeoff" as const,
        boxSize: "evidence" as const,
      },
    };
    const next = updateDraft(
      old,
      { priorityGoal: "large-web" },
      "priorityGoal",
      "2026-08-21T00:00:00.000Z",
    );
    expect(next.reasonIds.priorityGoal).toBeNull();
    expect(next.reasonIds.boxSize).toBe("evidence");
    expect(next.completedAt).toBeNull();
  });
  it("理由だけの変更を保持する", () => {
    const old = emptyResearchPlanDraft();
    const reasonIds = { ...old.reasonIds, boxSize: "tradeoff" as const };
    const next = updateDraft(
      old,
      { reasonIds },
      null,
      "2026-08-21T00:00:00.000Z",
    );
    expect(next.reasonIds.boxSize).toBe("tradeoff");
  });
});
