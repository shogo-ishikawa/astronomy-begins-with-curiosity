import type { ProjectState } from "../../domain/project";
import { calculatePlanMetrics } from "../planning/logic";
import {
  REVIEW_CONTENT_ID,
  REVIEW_RULE_SET_ID,
  limitationChoices,
} from "./content";

export type ReviewOverallState =
  | "research-ready"
  | "one-revision-needed"
  | "question-method-mismatch"
  | "snapshot-insufficient"
  | "resource-warning";
export type ReviewFinding = {
  findingId: string;
  ruleId: string;
  category:
    | "question-method"
    | "prediction-figure"
    | "volume"
    | "resolution"
    | "snapshot"
    | "resource"
    | "limitation";
  severity: "blocking" | "warning" | "strength";
  messageId: string;
  evidenceIds: string[];
  suggestedActionIds: string[];
  acknowledgementRequired: boolean;
};
export type ReviewedPlanSubject = {
  contentId: string;
  ruleSetId: string;
  researchQuestion: ProjectState["researchQuestion"];
  hypothesis: ProjectState["hypothesis"];
  prediction: ProjectState["prediction"];
  draft: ProjectState["researchPlanDraft"];
  limitationChoiceIds: string[];
};
export type ReviewAcknowledgementRecord = {
  findingId: string;
  reasonId: string;
  acknowledged: boolean;
};
export type StudentReviewDecision =
  | "approve"
  | "approve-with-warning"
  | "revise"
  | null;
export type PlanReviewRecord = {
  reviewId: string;
  ruleSetId: string;
  reviewedAt: string;
  subjectHash: string;
  subjectSnapshot: ReviewedPlanSubject;
  overallState: ReviewOverallState;
  findings: ReviewFinding[];
  acknowledgementRecords: ReviewAcknowledgementRecord[];
  limitationChoiceIds: string[];
  studentDecision: StudentReviewDecision;
  committedPlanVersionId: string | null;
  completedAt: string | null;
};
export type PlanVersion = {
  planVersionId: string;
  versionNumber: number;
  createdAt: string;
  sourceReviewId: string;
  subjectHash: string;
  contentId: string;
  ruleSetId: string;
  subjectSnapshot: ReviewedPlanSubject;
  resolved: {
    boxSizeMpcOverH: number;
    boxSizeUnit: "h^-1 Mpc";
    particleSide: number;
    totalParticles: number;
    snapshotIds: string[];
    snapshotRedshifts: Record<string, number | "initial">;
    meanParticleSpacingMpcOverH: number;
    relativeParticleMass: number;
    relativeParticleData: number;
    formulaVersion: "plan-metrics-v1";
  };
  review: { overallState: ReviewOverallState; findings: ReviewFinding[] };
  warningAcknowledgements: ReviewAcknowledgementRecord[];
  limitationChoiceIds: string[];
  changeReasonId: string;
};

const finding = (
  id: string,
  category: ReviewFinding["category"],
  severity: ReviewFinding["severity"],
  actions: string[] = [],
): ReviewFinding => ({
  findingId: id,
  ruleId: `rule-${id}`,
  category,
  severity,
  messageId: id,
  evidenceIds: [],
  suggestedActionIds: actions,
  acknowledgementRequired: severity === "warning",
});
export function buildReviewedSubject(
  project: ProjectState,
  limitations: string[] = [],
): ReviewedPlanSubject {
  return structuredClone({
    contentId: REVIEW_CONTENT_ID,
    ruleSetId: REVIEW_RULE_SET_ID,
    researchQuestion: project.researchQuestion,
    hypothesis: project.hypothesis,
    prediction: project.prediction,
    draft: project.researchPlanDraft,
    limitationChoiceIds: [...limitations].sort(),
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(
        ([key]) => !["updatedAt", "completedAt", "chosenAt"].includes(key),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${canonical(val)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function subjectHash(subject: ReviewedPlanSubject) {
  let hash = 2166136261;
  for (const c of canonical(subject)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `subject-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
export function reviewPlan(subject: ReviewedPlanSubject) {
  const d = subject.draft;
  const results: ReviewFinding[] = [];
  const timeQuestion = subject.researchQuestion?.timeFocusId !== "uncertain";
  if (
    timeQuestion &&
    !["density-panels", "sigma-growth", "dense-growth"].includes(
      d.plannedFigure ?? "",
    )
  )
    results.push(
      finding("question-method-mismatch", "question-method", "blocking", [
        "plannedFigure",
      ]),
    );
  else
    results.push(
      finding("question-method-strength", "question-method", "strength"),
      finding("prediction-figure-strength", "prediction-figure", "strength"),
    );
  if (d.primaryAnalysis === "density-image")
    results.push(
      finding("density-comparison", "prediction-figure", "strength"),
    );
  if (d.primaryAnalysis === "dense-fraction")
    results.push(
      finding("dense-fraction-dependency", "prediction-figure", "strength"),
    );
  if (d.priorityGoal === "large-web" && d.boxSizeMpcOverH === 25)
    results.push(
      finding("large-web-small-box", "volume", "blocking", [
        "boxSizeMpcOverH",
        "priorityGoal",
      ]),
    );
  if (d.priorityGoal === "dense-detail" && d.particleSide === 16)
    results.push(
      finding("dense-detail-low-particles", "resolution", "blocking", [
        "particleSide",
        "priorityGoal",
      ]),
    );
  if (d.boxSizeMpcOverH === 100 && d.particleSide === 16)
    results.push(
      finding("wide-coarse", "resolution", "blocking", [
        "boxSizeMpcOverH",
        "particleSide",
      ]),
    );
  const intermediate = d.snapshotIds.filter(
    (id) => id !== "initial" && id !== "z0",
  ).length;
  if (
    !d.snapshotIds.includes("initial") ||
    !d.snapshotIds.includes("z0") ||
    intermediate < 2 ||
    d.snapshotIds.length < 4
  )
    results.push(
      finding("snapshot-insufficient", "snapshot", "blocking", ["snapshotIds"]),
    );
  else results.push(finding("snapshot-strength", "snapshot", "strength"));
  if (d.boxSizeMpcOverH === 100 && d.particleSide === 64)
    results.push(
      finding("resource-warning", "resource", "warning", [
        "boxSizeMpcOverH",
        "particleSide",
      ]),
    );
  else results.push(finding("resource-strength", "resource", "strength"));
  const ids = new Set(results.map((x) => x.findingId));
  const overallState: ReviewOverallState = ids.has("question-method-mismatch")
    ? "question-method-mismatch"
    : ids.has("snapshot-insufficient")
      ? "snapshot-insufficient"
      : results.some((x) => x.severity === "blocking")
        ? "one-revision-needed"
        : results.some((x) => x.severity === "warning")
          ? "resource-warning"
          : "research-ready";
  return { overallState, findings: results };
}
export function limitationsComplete(ids: string[]) {
  const categories = new Set(
    limitationChoices
      .filter(
        (x) =>
          ids.includes(x.id) &&
          !["misconception", "unsure"].includes(x.category),
      )
      .map((x) => x.category),
  );
  return (
    categories.has("finite") &&
    categories.has("seed") &&
    categories.has("physics") &&
    categories.has("analysis")
  );
}
export function canCommitReview(
  review: PlanReviewRecord,
  changeReasonId: string | null,
  versionCount: number,
) {
  return (
    !review.findings.some((x) => x.severity === "blocking") &&
    review.findings
      .filter((x) => x.severity === "warning")
      .every((x) =>
        review.acknowledgementRecords.some(
          (a) => a.findingId === x.findingId && a.reasonId && a.acknowledged,
        ),
      ) &&
    limitationsComplete(review.limitationChoiceIds) &&
    review.studentDecision !== null &&
    (versionCount === 0 || Boolean(changeReasonId))
  );
}
export function createPlanVersion(
  review: PlanReviewRecord,
  existing: PlanVersion[],
  changeReasonId: string | null,
  now: string,
): PlanVersion[] {
  if (existing.some((x) => x.sourceReviewId === review.reviewId))
    return existing;
  if (!canCommitReview(review, changeReasonId, existing.length))
    throw new Error("研究計画版を保存する条件が整っていません。");
  const d = review.subjectSnapshot.draft;
  if (!d.boxSizeMpcOverH || !d.particleSide)
    throw new Error("計画値が不足しています。");
  const m = calculatePlanMetrics(d.boxSizeMpcOverH, d.particleSide);
  const versionNumber =
    Math.max(0, ...existing.map((x) => x.versionNumber)) + 1;
  const planVersionId = `plan-${review.subjectHash}-${review.reviewId}`;
  return [
    ...existing,
    structuredClone({
      planVersionId,
      versionNumber,
      createdAt: now,
      sourceReviewId: review.reviewId,
      subjectHash: review.subjectHash,
      contentId: review.subjectSnapshot.contentId,
      ruleSetId: review.ruleSetId,
      subjectSnapshot: review.subjectSnapshot,
      resolved: {
        boxSizeMpcOverH: d.boxSizeMpcOverH,
        boxSizeUnit: "h^-1 Mpc",
        particleSide: d.particleSide,
        totalParticles: m.totalParticles,
        snapshotIds: d.snapshotIds,
        snapshotRedshifts: {
          initial: "initial",
          z10: 10,
          z5: 5,
          z2: 2,
          z1: 1,
          z0: 0,
        },
        meanParticleSpacingMpcOverH: m.meanParticleSpacing,
        relativeParticleMass: m.relativeParticleMass,
        relativeParticleData: m.relativeParticleData,
        formulaVersion: "plan-metrics-v1",
      },
      review: { overallState: review.overallState, findings: review.findings },
      warningAcknowledgements: review.acknowledgementRecords,
      limitationChoiceIds: review.limitationChoiceIds,
      changeReasonId: existing.length ? changeReasonId! : "initial-plan",
    }),
  ];
}
