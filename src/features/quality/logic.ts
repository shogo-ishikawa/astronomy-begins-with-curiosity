import type { ProjectState } from "../../domain/project";
import {
  canonicalSnapshots,
  createAcquisitionRequest,
  requestFingerprint,
  type BoundResultPackageRef,
  type RuntimeResultPackage,
  type SnapshotId,
} from "../execution/logic";

export const QUALITY_CHECK_IDS = [
  "plan-configuration-match",
  "required-snapshots-present",
  "payload-complete",
  "values-valid",
  "diagnostics-clear",
  "reproducibility-metadata",
] as const;
export type QualityCheckId = (typeof QUALITY_CHECK_IDS)[number];
export type QualityOutcome = "pass" | "warning" | "fail" | "unavailable";
export type QualityGate = "clear" | "acknowledgement-required" | "blocked";
export type StudentAssessment =
  | "requirement-met"
  | "requirement-met-with-caution"
  | "action-required"
  | "insufficient-evidence";
export type QualityDecision =
  | "proceed-to-analysis"
  | "proceed-with-conditions"
  | "reacquire-data"
  | "review-again";
export type QualityRecordRelation = "current" | "stale" | "unverifiable";

export const QUALITY_RULESET_V1 = {
  id: "abcs-quality-ruleset-v1",
  version: "1.0.0",
  normalizedMeanPassTolerance: 1e-4,
  normalizedMeanWarningTolerance: 1e-2,
} as const;
export const METHOD_PACK = { id: "cosmological-nbody-grid", version: "1.0.0" };
export const MISSION_PACK = { id: "cosmic-web-quality-ja", version: "1.0.0" };
export const REQUIRED_LIMITATION_IDS = [
  "not-cws-or-observation",
  "educational-fixture-not-nbody",
  "not-for-cosmological-precision",
  "dark-matter-only",
  "no-direct-star-galaxy-formation",
  "abcs-learning-scope",
] as const;

export type MachineQualityResult = {
  checkId: QualityCheckId;
  outcome: QualityOutcome;
  gate: QualityGate;
  issueCodes: string[];
  evidence: Record<string, unknown>;
};
export type StudentQualityAssessment = {
  checkId: QualityCheckId;
  assessment: StudentAssessment;
  reasonIds: string[];
  comparedAt: string;
};
export type StudentResponseAttempt = StudentQualityAssessment & {
  attempt: number;
};
export type QualityReviewDraft = {
  draftKind: "quality-review-draft";
  draftId: string;
  contextFingerprint: string;
  startedAt: string;
  currentCheckId: QualityCheckId;
  assessments: StudentQualityAssessment[];
  responseHistory: StudentResponseAttempt[];
  warningAcknowledgementIds: string[];
  limitationAcknowledgementIds: string[];
  shuffleSeed: string;
};
export type QualityCheckRecord = {
  recordKind: "quality-check";
  schemaVersion: 1;
  recordId: string;
  createdAt: string;
  completedAt: string;
  ruleSetId: string;
  methodPackId: string;
  methodPackVersion: string;
  missionPackId: string;
  contentVersion: string;
  contextFingerprint: string;
  context: {
    themeId: string;
    planVersionId: string;
    planSubjectHash: string;
    packageId: string;
    requestFingerprint: string;
    acquisitionFingerprint: string;
    acquisitionIdentity: string;
    catalogVersion: string;
    dataVersion: string;
    fixtureVersion: string;
    snapshotIds: SnapshotId[];
  };
  machineResults: MachineQualityResult[];
  studentAssessments: StudentQualityAssessment[];
  responseHistory: StudentResponseAttempt[];
  warningAcknowledgements: { checkId: QualityCheckId }[];
  limitationAcknowledgements: { limitationId: string }[];
  decision: QualityDecision;
  decisionReasonIds: string[];
  overallOutcome:
    | "approved"
    | "approved-with-conditions"
    | "blocked"
    | "inconclusive";
  carriedLimitationIds: string[];
  supersedesRecordId: string | null;
};
export type LegacyQualityRecord = {
  recordKind: "legacy-unbound";
  original: unknown;
};

const hash = (value: unknown) => {
  let h = 2166136261;
  for (const c of JSON.stringify(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `qf-${(h >>> 0).toString(16).padStart(8, "0")}`;
};
export function qualityContextFingerprint(
  project: ProjectState,
  ref: BoundResultPackageRef,
) {
  return hash({
    schema: 1,
    themeId: project.themeId,
    planVersionId: ref.planVersionId,
    planSubjectHash: ref.planSubjectHash,
    requestFingerprint: ref.requestFingerprint,
    acquisitionFingerprint: ref.acquisitionFingerprint,
    acquisitionIdentity: ref.acquiredAt,
    packageId: ref.packageId,
    catalogVersion: ref.catalogVersion,
    dataVersion: ref.dataVersion,
    fixtureVersion: ref.fixtureVersion,
    snapshots: canonicalSnapshots(ref.requestedSnapshotIds),
    grid: ref.grid,
    rules: QUALITY_RULESET_V1,
    method: METHOD_PACK,
  });
}
const result = (
  checkId: QualityCheckId,
  outcome: QualityOutcome,
  issueCodes: string[],
  evidence: Record<string, unknown>,
): MachineQualityResult => ({
  checkId,
  outcome,
  issueCodes,
  evidence,
  gate:
    outcome === "pass"
      ? "clear"
      : outcome === "warning"
        ? "acknowledgement-required"
        : "blocked",
});
export function meanOutcome(mean: number): QualityOutcome {
  const delta = Math.abs(mean - 1);
  const within = (limit: number) => delta - limit <= Number.EPSILON * 8;
  return within(QUALITY_RULESET_V1.normalizedMeanPassTolerance)
    ? "pass"
    : within(QUALITY_RULESET_V1.normalizedMeanWarningTolerance)
      ? "warning"
      : "fail";
}
export function runQualityChecks(
  project: ProjectState,
  runtime: RuntimeResultPackage,
): MachineQualityResult[] {
  const ref = project.resultPackage;
  const plan = project.planVersions.find(
    (p) => p.planVersionId === project.activePlanVersionId,
  );
  if (!plan || !ref || ref.refKind !== "bound")
    return QUALITY_CHECK_IDS.map((id) =>
      result(id, "unavailable", ["context-unavailable"], {}),
    );
  const request = createAcquisitionRequest(plan, project.themeId),
    manifest = runtime.manifest;
  const loadedIds = runtime.snapshots.map((s) => s.id),
    manifestIds = manifest.snapshots.map((s) => s.id);
  const missing = request.snapshotIds.filter((id) => !loadedIds.includes(id));
  const duplicates = manifestIds.filter(
    (id, i) => manifestIds.indexOf(id) !== i,
  );
  const configOk =
    ref.planVersionId === plan.planVersionId &&
    ref.planSubjectHash === plan.subjectHash &&
    manifest.simulation.boxSizeMpcOverH === request.boxSizeMpcOverH &&
    manifest.simulation.particleSide === request.particleSide &&
    manifest.simulation.particleCount === request.particleSide ** 3 &&
    ref.requestFingerprint === requestFingerprint(request) &&
    manifest.grid.projection === request.projection &&
    manifest.grid.quantity === request.quantity;
  const expectedLength = manifest.grid.width * manifest.grid.height;
  const lengths = runtime.snapshots.map((s) => ({
    id: s.id,
    expected: expectedLength,
    actual: s.values.length,
  }));
  let total = 0,
    finite = 0,
    nan = 0,
    positiveInfinity = 0,
    negativeInfinity = 0,
    negative = 0;
  const summaries = runtime.snapshots.map((s) => {
    let sum = 0,
      count = 0,
      min = Infinity,
      max = -Infinity;
    for (const value of s.values) {
      total++;
      if (Number.isNaN(value)) nan++;
      else if (value === Infinity) positiveInfinity++;
      else if (value === -Infinity) negativeInfinity++;
      else {
        finite++;
        count++;
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
        if (value < 0) negative++;
      }
    }
    return { id: s.id, mean: count ? sum / count : null, min, max };
  });
  const worstMean = summaries.reduce<QualityOutcome>((worst, s) => {
    const next = s.mean === null ? "fail" : meanOutcome(s.mean);
    return ["pass", "warning", "fail"].indexOf(next) >
      ["pass", "warning", "fail"].indexOf(worst)
      ? next
      : worst;
  }, "pass");
  const metadataOk =
    manifest.simulation.boxSizeUnit === "h^-1 Mpc" &&
    manifest.grid.quantity === "rho_over_mean" &&
    Number.isInteger(manifest.simulation.seed) &&
    Boolean(
      manifest.dataVersion &&
        manifest.payload.fixtureVersion &&
        manifest.provenance.generatorVersion &&
        manifest.provenance.description,
    ) &&
    manifest.simulation.boundary === "periodic" &&
    manifest.simulation.physics === "collisionless-dark-matter-only" &&
    manifest.cosmology.status === "not-modeled";
  return [
    result(
      "plan-configuration-match",
      configOk ? "pass" : "fail",
      configOk ? [] : ["plan-mismatch"],
      {
        planVersionId: plan.planVersionId,
        planSubjectHash: plan.subjectHash,
        boxSizeMpcOverH: [
          request.boxSizeMpcOverH,
          manifest.simulation.boxSizeMpcOverH,
        ],
        boxSizeUnit: manifest.simulation.boxSizeUnit,
        particleSide: [request.particleSide, manifest.simulation.particleSide],
        particleCount: manifest.simulation.particleCount,
        requestedSnapshots: request.snapshotIds,
        projection: manifest.grid.projection,
        quantity: manifest.grid.quantity,
        packageId: manifest.packageId,
        requestFingerprint: ref.requestFingerprint,
      },
    ),
    result(
      "required-snapshots-present",
      missing.length || duplicates.length ? "fail" : "pass",
      [
        ...(missing.length ? ["snapshot-missing"] : []),
        ...(duplicates.length ? ["snapshot-duplicate"] : []),
      ],
      {
        requestedIds: request.snapshotIds,
        manifestIds,
        loadedIds,
        missingIds: missing,
        duplicateIds: duplicates,
        times: manifest.snapshots.filter((s) =>
          request.snapshotIds.includes(s.id),
        ),
      },
    ),
    result(
      "payload-complete",
      lengths.some((x) => x.actual !== x.expected) ||
        runtime.snapshots.length !== request.snapshotIds.length
        ? "fail"
        : "pass",
      lengths.some((x) => x.actual !== x.expected) ? ["payload-length"] : [],
      {
        requiredSnapshotCount: request.snapshotIds.length,
        reconstructedSnapshotCount: runtime.snapshots.length,
        lengths,
        partial: false,
      },
    ),
    result(
      "values-valid",
      nan ||
        positiveInfinity ||
        negativeInfinity ||
        negative ||
        lengths.some((x) => x.actual < x.expected)
        ? "fail"
        : "pass",
      nan || positiveInfinity || negativeInfinity || negative
        ? ["invalid-values"]
        : [],
      {
        total,
        finite,
        nan,
        positiveInfinity,
        negativeInfinity,
        missingElements: lengths.reduce(
          (n, x) => n + Math.max(0, x.expected - x.actual),
          0,
        ),
        negative,
      },
    ),
    result(
      "diagnostics-clear",
      worstMean,
      worstMean === "pass" ? [] : ["normalized-mean"],
      {
        summaries,
        expectedMean: 1,
        passTolerance: QUALITY_RULESET_V1.normalizedMeanPassTolerance,
        warningTolerance: QUALITY_RULESET_V1.normalizedMeanWarningTolerance,
        diagnosticCode: "normalized-mean",
        severity: worstMean,
      },
    ),
    result(
      "reproducibility-metadata",
      metadataOk ? "pass" : "fail",
      metadataOk ? [] : ["metadata-missing-or-unsupported"],
      {
        boxSize: manifest.simulation.boxSizeMpcOverH,
        boxSizeUnit: manifest.simulation.boxSizeUnit,
        quantity: manifest.grid.quantity,
        quantityUnit: "dimensionless",
        redshiftUnit: "dimensionless",
        scaleFactorUnit: "dimensionless",
        seed: manifest.simulation.seed,
        packageVersion: manifest.schemaVersion,
        catalogVersion: runtime.catalog.catalogVersion,
        dataVersion: manifest.dataVersion,
        fixtureVersion: manifest.payload.fixtureVersion,
        generatorVersion: manifest.provenance.generatorVersion,
        provenance: manifest.provenance,
        zStart: manifest.simulation.zStart,
        boundary: manifest.simulation.boundary,
        physics: manifest.simulation.physics,
        grid: manifest.grid,
        cosmology: manifest.cosmology,
        demoLabel: "DEMO / synthetic fixture",
      },
    ),
  ];
}
export function stableShuffle<T>(
  items: readonly T[],
  seed: string,
  id: (item: T) => string,
) {
  return [...items].sort((a, b) =>
    hash([seed, id(a)]).localeCompare(hash([seed, id(b)])),
  );
}
export function assessmentMatches(
  result: MachineQualityResult,
  assessment: StudentAssessment,
) {
  return (
    assessment ===
    (
      {
        pass: "requirement-met",
        warning: "requirement-met-with-caution",
        fail: "action-required",
        unavailable: "insufficient-evidence",
      } as const
    )[result.outcome]
  );
}
export function qualityRecordRelation(
  record: QualityCheckRecord,
  fingerprintValue?: string,
): QualityRecordRelation {
  return !fingerprintValue
    ? "unverifiable"
    : record.contextFingerprint === fingerprintValue
      ? "current"
      : "stale";
}
export function canEnterAnalysisMode(
  project: ProjectState,
  fingerprintValue?: string,
) {
  const records = project.qualityChecks.filter(
    (x): x is QualityCheckRecord =>
      (x as QualityCheckRecord).recordKind === "quality-check" &&
      (x as QualityCheckRecord).contextFingerprint === fingerprintValue,
  );
  const latest = records.at(-1),
    ids = latest?.machineResults.map((x) => x.checkId) ?? [];
  const ok = Boolean(
    project.planReviewCompletedAt &&
      project.activePlanVersionId &&
      project.planVersions.some(
        (plan) => plan.planVersionId === project.activePlanVersionId,
      ) &&
      project.pilot?.status === "complete" &&
      project.pilot.resultingPlanVersionId === project.activePlanVersionId &&
      project.resultPackage?.refKind === "bound" &&
      project.resultPackage.planVersionId === project.activePlanVersionId &&
      latest &&
      latest.ruleSetId === QUALITY_RULESET_V1.id &&
      new Set(ids).size === 6 &&
      QUALITY_CHECK_IDS.every((id) => ids.includes(id)) &&
      latest.studentAssessments.length === 6 &&
      !latest.machineResults.some((x) => x.gate === "blocked") &&
      latest.machineResults
        .filter((x) => x.outcome === "warning")
        .every((x) =>
          latest.warningAcknowledgements.some((a) => a.checkId === x.checkId),
        ) &&
      REQUIRED_LIMITATION_IDS.every((id) =>
        latest.limitationAcknowledgements.some((a) => a.limitationId === id),
      ) &&
      ["proceed-to-analysis", "proceed-with-conditions"].includes(
        latest.decision,
      ) &&
      ["approved", "approved-with-conditions"].includes(latest.overallOutcome),
  );
  return {
    canEnter: ok,
    reason: ok
      ? null
      : "現行データの品質確認記録が解析進入条件を満たしていません。",
  };
}
