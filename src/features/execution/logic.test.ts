import { describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../domain/project";
import type { PlanVersion } from "../review/logic";
import {
  acquire,
  acquisitionFingerprint,
  canEnterExecution,
  canonicalSnapshots,
  createAcquisitionRequest,
  findExactPackage,
  generateSnapshot,
  isSafeManifestPath,
  localRefState,
  manifestSchema,
  requestFingerprint,
  resolveDataUrl,
} from "./logic";
import manifestJson from "../../../public/data/cosmic-web/v1/L050_N032/manifest.json";
import catalogJson from "../../../public/data/cosmic-web/v1/catalog.json";

const manifest = manifestSchema.parse(manifestJson);
const plan = {
  planVersionId: "plan-1",
  versionNumber: 1,
  subjectHash: "subject-a",
  resolved: {
    boxSizeMpcOverH: 50,
    particleSide: 32,
    totalParticles: 32768,
    snapshotIds: ["z0", "initial", "z2", "z10"],
    boxSizeUnit: "h^-1 Mpc",
  },
  subjectSnapshot: {
    draft: { primaryAnalysis: "sigma-delta", plannedFigure: "sigma-growth" },
  },
} as unknown as PlanVersion;
const request = createAcquisitionRequest(plan, "cosmic-web-growth");
describe("S08 acquisition domain", () => {
  it("canonicalizes snapshot order and stable request fingerprints", () => {
    expect(request.snapshotIds).toEqual(["initial", "z10", "z2", "z0"]);
    expect(canonicalSnapshots(["z0", "z2", "initial", "z10"])).toEqual(
      request.snapshotIds,
    );
    expect(
      requestFingerprint({
        ...request,
        snapshotIds: ["initial", "z10", "z2", "z0"],
      }),
    ).toBe(requestFingerprint(request));
    expect(requestFingerprint({ ...request, planVersionId: "other" })).not.toBe(
      requestFingerprint(request),
    );
  });
  it("changes acquisition fingerprint with package data and fixture versions", () => {
    const a = acquisitionFingerprint(request, "c1", "p1", "d1", "f1");
    expect(acquisitionFingerprint(request, "c1", "p1", "d2", "f1")).not.toBe(a);
    expect(acquisitionFingerprint(request, "c1", "p1", "d1", "f2")).not.toBe(a);
  });
  it.each(["/manifest.json", "https://bad.test/x", "//host/x", "a/../x"])(
    "rejects dangerous path %s",
    (p) => expect(isSafeManifestPath(p)).toBe(false),
  );
  it("resolves a non-root BASE_URL", () =>
    expect(resolveDataUrl("/repo/", "L050_N032/manifest.json")).toBe(
      "http://localhost:3000/repo/data/cosmic-web/v1/L050_N032/manifest.json",
    ));
  it("finds exactly one matching package", () =>
    expect(findExactPackage(catalogJson as never, request).packageId).toBe(
      "L050_N032_demo_v1",
    ));
  it("generates deterministic positive normalized fields with growing variance", () => {
    const a = generateSnapshot(manifest, "initial"),
      b = generateSnapshot(manifest, "initial"),
      late = generateSnapshot(manifest, "z0");
    expect(a).toEqual(b);
    expect(a).toHaveLength(128 * 128);
    expect([...a].every((x) => Number.isFinite(x) && x > 0)).toBe(true);
    expect([...a].reduce((x, y) => x + y, 0) / a.length).toBeCloseTo(1, 6);
    const variance = (v: Float32Array) =>
      [...v].reduce((s, x) => s + (x - 1) ** 2, 0) / v.length;
    expect(variance(late)).toBeGreaterThan(variance(a));
  });
  it("requires active approved plan and matching completed pilot", () => {
    const p = createEmptyProject();
    p.planVersions = [plan];
    p.activePlanVersionId = plan.planVersionId;
    p.planReviewCompletedAt = new Date().toISOString();
    p.pilot = { status: "complete", resultingPlanVersionId: "other" } as never;
    expect(canEnterExecution(p)).toBe(false);
    p.pilot = {
      status: "complete",
      resultingPlanVersionId: plan.planVersionId,
    } as never;
    expect(canEnterExecution(p)).toBe(true);
  });
  it("does not persist partial acquisition and fetches only one manifest", async () => {
    const save = vi.fn(),
      fetcher = vi.fn(
        async (url: string | URL | Request) =>
          new Response(
            JSON.stringify(
              String(url).endsWith("catalog.json") ? catalogJson : manifestJson,
            ),
          ),
      );
    const ref = await acquire(request, "/repo/", fetcher as typeof fetch);
    await save(ref);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(ref.snapshotInventory.map((x) => x.id)).toEqual(request.snapshotIds);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("retains existing ref when acquisition fails", async () => {
    const existing = {
      refKind: "legacy-unbound",
      packageId: "old",
      dataVersion: "old",
      provenance: {},
    } as const;
    await expect(
      acquire(
        request,
        "/repo/",
        vi.fn(async () => {
          throw Error("offline");
        }) as typeof fetch,
      ),
    ).rejects.toThrow("offline");
    expect(existing.packageId).toBe("old");
  });
  it("derives stale locally and otherwise waits for verification", () => {
    const p = createEmptyProject();
    p.planVersions = [plan];
    p.activePlanVersionId = plan.planVersionId;
    p.planReviewCompletedAt = new Date().toISOString();
    p.pilot = {
      status: "complete",
      resultingPlanVersionId: plan.planVersionId,
    } as never;
    expect(localRefState(null, p, request)).toBe("stale");
  });
});
