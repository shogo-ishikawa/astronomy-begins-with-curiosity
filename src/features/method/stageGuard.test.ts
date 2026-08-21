import { describe, expect, it } from "vitest";
import { createEmptyProject, type ProjectState } from "../../domain/project";
import { methodContent } from "../../content/ja/method/content";
import {
  createAcquisitionRequest,
  requestFingerprint,
  type BoundResultPackageRef,
} from "../execution/logic";
import {
  QUALITY_CHECK_IDS,
  QUALITY_RULESET_V1,
  REQUIRED_LIMITATION_IDS,
  qualityContextFingerprint,
  type QualityCheckRecord,
} from "../quality/logic";
import type { PlanVersion } from "../review/logic";
import { guardStage } from "./stageGuard";

const now = "2026-08-21T00:00:00.000Z";

function readyProject(): ProjectState {
  const project = createEmptyProject(new Date(now));
  const plan = {
    planVersionId: "plan-1",
    versionNumber: 1,
    subjectHash: "subject-1",
    subjectSnapshot: { draft: {} },
    resolved: {
      boxSizeMpcOverH: 50,
      particleSide: 32,
      totalParticles: 32768,
      boxSizeUnit: "h^-1 Mpc",
      snapshotIds: ["initial", "z10", "z2", "z0"],
    },
  } as PlanVersion;
  project.currentStage = "execution";
  project.motivation = { choiceId: "formation", note: "", chosenAt: now };
  project.researchQuestion = {
    choiceId: "growth",
    measurementId: "sigma-delta",
    timeFocusId: "history",
    spaceFocusId: "balance",
    alignment: { status: "aligned", acknowledged: true, reasonId: null },
    note: "",
    chosenAt: now,
  };
  project.hypothesis = { choiceId: "growth", note: "", chosenAt: now };
  project.prediction = {
    choiceId: "increase",
    direction: "increase",
    reasonId: "gravity",
    alignment: { status: "aligned", acknowledged: true, reasonId: null },
    note: "",
    chosenAt: now,
  };
  project.methodUnderstanding.answers = methodContent.questions
    .filter(({ required }) => required)
    .map((question) => ({
      questionId: question.id,
      choiceId: question.correctChoiceId,
      answeredAt: now,
    }));
  project.methodUnderstanding.completedAt = now;
  project.researchPlanDraft.completedAt = now;
  project.planVersions = [plan];
  project.activePlanVersionId = plan.planVersionId;
  project.planReviewCompletedAt = now;
  project.pilot = {
    status: "complete",
    resultingPlanVersionId: plan.planVersionId,
  } as never;
  return project;
}

function bindResult(project: ProjectState) {
  const plan = project.planVersions[0]!;
  const request = createAcquisitionRequest(plan, project.themeId);
  project.resultPackage = {
    refKind: "bound",
    refSchemaVersion: 1,
    packageId: "demo-package",
    catalogVersion: "catalog-1",
    manifestPath: "L050_N032/manifest.json",
    dataVersion: "1.0.0",
    planVersionId: plan.planVersionId,
    planSubjectHash: plan.subjectHash,
    requestFingerprint: requestFingerprint(request),
    acquisitionFingerprint: "acquisition-1",
    boxSizeMpcOverH: 50,
    particleSide: 32,
    requestedSnapshotIds: request.snapshotIds,
    snapshotInventory: request.snapshotIds.map((id) => ({
      id,
      redshift: id === "z0" ? 0 : 1,
      scaleFactor: id === "z0" ? 1 : 0.5,
    })),
    grid: {
      projection: "xy",
      width: 128,
      height: 128,
      quantity: "rho_over_mean",
      arrayType: "Float32Array",
    },
    provenance: {
      kind: "demo-fixture",
      generator: "test",
      generatorVersion: "1",
      createdAt: now,
      description: "test fixture",
    },
    fixtureVersion: "1",
    acquiredAt: now,
  } satisfies BoundResultPackageRef;
}

function completeQuality(project: ProjectState) {
  const ref = project.resultPackage as BoundResultPackageRef;
  const contextFingerprint = qualityContextFingerprint(project, ref);
  project.qualityChecks = [
    {
      recordKind: "quality-check",
      schemaVersion: 1,
      recordId: "quality-1",
      createdAt: now,
      completedAt: now,
      ruleSetId: QUALITY_RULESET_V1.id,
      methodPackId: "method",
      methodPackVersion: "1",
      missionPackId: "mission",
      contentVersion: "1",
      contextFingerprint,
      context: {
        themeId: project.themeId,
        planVersionId: ref.planVersionId,
        planSubjectHash: ref.planSubjectHash,
        packageId: ref.packageId,
        requestFingerprint: ref.requestFingerprint,
        acquisitionFingerprint: ref.acquisitionFingerprint,
        acquisitionIdentity: ref.acquiredAt,
        catalogVersion: ref.catalogVersion,
        dataVersion: ref.dataVersion,
        fixtureVersion: ref.fixtureVersion,
        snapshotIds: ref.requestedSnapshotIds,
      },
      machineResults: QUALITY_CHECK_IDS.map((checkId) => ({
        checkId,
        outcome: "pass",
        gate: "clear",
        issueCodes: [],
        evidence: {},
      })),
      studentAssessments: QUALITY_CHECK_IDS.map((checkId) => ({
        checkId,
        assessment: "requirement-met",
        reasonIds: [],
        comparedAt: now,
      })),
      responseHistory: [],
      warningAcknowledgements: [],
      limitationAcknowledgements: REQUIRED_LIMITATION_IDS.map(
        (limitationId) => ({ limitationId }),
      ),
      decision: "proceed-to-analysis",
      decisionReasonIds: [],
      overallOutcome: "approved",
      carriedLimitationIds: [],
      supersedesRecordId: null,
    } satisfies QualityCheckRecord,
  ];
}

describe("stage guard", () => {
  it("returns the first missing stage and treats unsure as selected", () => {
    let project = createEmptyProject(new Date(now));
    project = { ...project, currentStage: "method" };
    expect(guardStage(project, "method")).toBe("invitation");
    project.motivation = { choiceId: "unsure", note: "", chosenAt: now };
    expect(guardStage(project, "method")).toBe("question");
  });

  it("keeps quality behind execution until the current result is acquired", () => {
    expect(guardStage(readyProject(), "quality")).toBe("execution");
  });

  it("allows quality for a current bound result regardless of currentStage", () => {
    const project = readyProject();
    bindResult(project);
    expect(guardStage(project, "quality")).toBe("quality");
  });

  it("redirects analysis mode to quality while its review is incomplete", () => {
    const project = readyProject();
    bindResult(project);
    expect(guardStage(project, "analysis-mode")).toBe("quality");
  });

  it("allows analysis mode when the current quality review satisfies entry", () => {
    const project = readyProject();
    bindResult(project);
    completeQuality(project);
    expect(guardStage(project, "analysis-mode")).toBe("analysis-mode");
  });

  it("rejects a result bound to an old plan version", () => {
    const project = readyProject();
    bindResult(project);
    project.planVersions.push({
      ...project.planVersions[0]!,
      planVersionId: "plan-2",
      versionNumber: 2,
      subjectHash: "subject-2",
    });
    project.activePlanVersionId = "plan-2";
    project.pilot = {
      ...project.pilot,
      resultingPlanVersionId: "plan-2",
    } as never;
    expect(guardStage(project, "quality")).toBe("execution");
  });

  it("preserves navigation back to an earlier stage", () => {
    const project = readyProject();
    bindResult(project);
    completeQuality(project);
    expect(guardStage(project, "execution")).toBe("execution");
  });
});
