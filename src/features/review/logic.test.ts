import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../domain/project";
import {
  buildReviewedSubject,
  reviewPlan,
  subjectHash,
  limitationsComplete,
} from "./logic";
function project() {
  const p = createEmptyProject();
  p.researchPlanDraft = {
    ...p.researchPlanDraft,
    priorityGoal: "balance",
    boxSizeMpcOverH: 50,
    particleSide: 32,
    snapshotIds: ["initial", "z10", "z5", "z0"],
    primaryAnalysis: "sigma-delta",
    plannedFigure: "sigma-growth",
    expectedPattern: "increase",
    reasonIds: {
      priorityGoal: "evidence",
      boxSize: "evidence",
      particleSide: "evidence",
      snapshots: "evidence",
      primaryAnalysis: "evidence",
      figurePrediction: "evidence",
    },
  };
  return p;
}
describe("plan review", () => {
  it("returns every matching finding and deterministic priority", () => {
    const p = project();
    p.researchPlanDraft = {
      ...p.researchPlanDraft,
      priorityGoal: "large-web",
      boxSizeMpcOverH: 25,
      snapshotIds: ["z5"],
    };
    const a = reviewPlan(buildReviewedSubject(p));
    expect(a.overallState).toBe("snapshot-insufficient");
    expect(a.findings.map((x) => x.findingId)).toEqual(
      expect.arrayContaining(["large-web-small-box", "snapshot-insufficient"]),
    );
    expect(reviewPlan(buildReviewedSubject(p))).toEqual(a);
  });
  it("computes required numerical warnings", () => {
    const p = project();
    p.researchPlanDraft = {
      ...p.researchPlanDraft,
      boxSizeMpcOverH: 100,
      particleSide: 64,
    };
    expect(reviewPlan(buildReviewedSubject(p)).overallState).toBe(
      "resource-warning",
    );
  });
  it("hash ignores timestamps but changes plan decisions", () => {
    const p = project();
    const a = buildReviewedSubject(p);
    const b = structuredClone(a);
    b.draft.updatedAt = "2026-01-01T00:00:00.000Z";
    expect(subjectHash(a)).toBe(subjectHash(b));
    b.draft.boxSizeMpcOverH = 75;
    expect(subjectHash(a)).not.toBe(subjectHash(b));
  });
  it("requires four limitation categories", () =>
    expect(
      limitationsComplete([
        "finite-volume",
        "single-realization",
        "dm-only",
        "discrete-snapshots",
      ]),
    ).toBe(true));
});
