import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../domain/project";
import manifestJson from "../../../public/data/cosmic-web/v1/L050_N032/manifest.json";
import catalogJson from "../../../public/data/cosmic-web/v1/catalog.json";
import {
  acquisitionFingerprint,
  createAcquisitionRequest,
  generateSnapshot,
  manifestSchema,
  requestFingerprint,
} from "../execution/logic";
import type { PlanVersion } from "../review/logic";
import {
  QUALITY_CHECK_IDS,
  meanOutcome,
  qualityContextFingerprint,
  runQualityChecks,
  stableShuffle,
} from "./logic";

const manifest = manifestSchema.parse(manifestJson);
function fixture() {
  const project = createEmptyProject(new Date("2026-08-21T00:00:00Z"));
  const plan = {
    planVersionId: "plan-1",
    versionNumber: 1,
    subjectHash: "subject",
    resolved: {
      boxSizeMpcOverH: 50,
      particleSide: 32,
      totalParticles: 32768,
      snapshotIds: ["initial", "z10", "z2", "z0"],
      boxSizeUnit: "h^-1 Mpc",
    },
    subjectSnapshot: { draft: {} },
  } as unknown as PlanVersion;
  project.planVersions = [plan];
  project.activePlanVersionId = plan.planVersionId;
  project.planReviewCompletedAt = "2026-08-21T00:00:00Z";
  project.pilot = {
    status: "complete",
    resultingPlanVersionId: plan.planVersionId,
  } as never;
  const request = createAcquisitionRequest(plan, project.themeId);
  project.resultPackage = {
    refKind: "bound",
    refSchemaVersion: 1,
    packageId: manifest.packageId,
    catalogVersion: "cosmic-web-demo-catalog-1.0.0",
    manifestPath: "L050_N032/manifest.json",
    dataVersion: manifest.dataVersion,
    planVersionId: plan.planVersionId,
    planSubjectHash: plan.subjectHash,
    requestFingerprint: requestFingerprint(request),
    acquisitionFingerprint: acquisitionFingerprint(
      request,
      "cosmic-web-demo-catalog-1.0.0",
      manifest.packageId,
      manifest.dataVersion,
      manifest.payload.fixtureVersion,
    ),
    boxSizeMpcOverH: 50,
    particleSide: 32,
    requestedSnapshotIds: request.snapshotIds,
    snapshotInventory: manifest.snapshots.filter((x) =>
      request.snapshotIds.includes(x.id),
    ),
    grid: manifest.grid,
    provenance: manifest.provenance,
    fixtureVersion: manifest.payload.fixtureVersion,
    acquiredAt: "2026-08-21T01:00:00Z",
  };
  const runtime = {
    catalog: catalogJson as never,
    manifest,
    snapshots: request.snapshotIds.map((id) => ({
      id,
      values: generateSnapshot(manifest, id),
    })),
  };
  return { project, runtime };
}
describe("S09 quality engine", () => {
  it("creates each required deterministic check exactly once", () => {
    const { project, runtime } = fixture();
    const a = runQualityChecks(project, runtime),
      b = runQualityChecks(project, runtime);
    expect(a).toEqual(b);
    expect(a.map((x) => x.checkId)).toEqual(QUALITY_CHECK_IDS);
    expect(new Set(a.map((x) => x.checkId)).size).toBe(6);
    expect(a.every((x) => x.outcome === "pass")).toBe(true);
  });
  it.each([
    [1.0001, "pass"],
    [1.0001001, "warning"],
    [1.01, "warning"],
    [1.010001, "fail"],
  ] as const)("classifies normalized mean boundary %s", (mean, outcome) =>
    expect(meanOutcome(mean)).toBe(outcome),
  );
  it("blocks NaN, infinities, negative values and short payloads", () => {
    const { project, runtime } = fixture();
    runtime.snapshots[0]!.values = new Float32Array([
      NaN,
      Infinity,
      -Infinity,
      -1,
    ]);
    const results = runQualityChecks(project, runtime);
    expect(results.find((x) => x.checkId === "values-valid")?.gate).toBe(
      "blocked",
    );
    expect(results.find((x) => x.checkId === "payload-complete")?.gate).toBe(
      "blocked",
    );
  });
  it("keeps shuffle and fingerprint stable but changes acquisition identity", () => {
    const { project } = fixture();
    const ref = project.resultPackage!;
    expect(stableShuffle(["a", "b", "c"], "seed", (x) => x)).toEqual(
      stableShuffle(["a", "b", "c"], "seed", (x) => x),
    );
    const first = qualityContextFingerprint(project, ref as never);
    expect(
      qualityContextFingerprint(project, {
        ...ref,
        acquiredAt: "2026-08-22T00:00:00Z",
      } as never),
    ).not.toBe(first);
  });
});
