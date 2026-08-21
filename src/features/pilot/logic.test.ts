import { describe, expect, it } from "vitest";
import { createEmptyProject, migrateProject } from "../../domain/project";
import {
  demoProvenance,
  fixtureSummary,
  generateDensity,
  transform,
  viridis,
} from "./fixture";
import {
  adjacentCandidates,
  particleSpacing,
  relativeParticleData,
  settingsFromPlan,
  sigmaDelta,
  validateComparison,
  type PilotSettings,
} from "./logic";
import type { PlanVersion } from "../review/logic";

const base: PilotSettings = {
  boxSizeMpcOverH: 50,
  particleSide: 32,
  snapshotId: "z0",
  projection: "xy",
  densityEstimator: "demo-multiscale-field",
  smoothing: "matched-v1",
  displayGrid: 64,
  seed: 1701,
};
describe("pilot comparison science", () => {
  it("finds both middle and one inward edge neighbour", () => {
    expect(adjacentCandidates(50, [25, 50, 75, 100])).toEqual([25, 75]);
    expect(adjacentCandidates(25, [25, 50, 75, 100])).toEqual([50]);
    expect(adjacentCandidates(64, [16, 32, 64])).toEqual([32]);
  });
  it("accepts exactly one axis and rejects invalid comparisons", () => {
    expect(
      validateComparison(base, { ...base, particleSide: 64 }, "particle-count"),
    ).toBe(true);
    expect(() =>
      validateComparison(
        base,
        { ...base, particleSide: 64, boxSizeMpcOverH: 75 },
        "particle-count",
      ),
    ).toThrow(/固定条件/);
    expect(() => validateComparison(base, base, "particle-count")).toThrow(
      /同値/,
    );
    expect(() =>
      validateComparison(
        base,
        { ...base, particleSide: 128 },
        "particle-count",
      ),
    ).toThrow(/隣接/);
    expect(() =>
      validateComparison(
        base,
        { ...base, snapshotId: "z1", particleSide: 64 },
        "particle-count",
      ),
    ).toThrow(/固定条件/);
  });
  it("calculates d_p, R_N and sigma_delta", () => {
    expect(particleSpacing(50, 32)).toBe(1.5625);
    expect(relativeParticleData(64)).toBe(8);
    expect(relativeParticleData(32)).toBe(1);
    expect(sigmaDelta([1, 1])).toBe(0);
    expect(sigmaDelta([0.5, 1.5])).toBeCloseTo(0.5);
  });
  it("generates deterministic finite non-negative normalized fixture and matching summary", () => {
    const a = generateDensity(base),
      b = generateDensity(base),
      s = fixtureSummary(a);
    expect(a).toEqual(b);
    expect([...a].every(Number.isFinite)).toBe(true);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
    expect(s.mean).toBeCloseTo(1, 12);
    expect(s.sigmaDelta).toBeCloseTo(sigmaDelta(a), 12);
    expect(demoProvenance.kind).toBe("demo-fixture");
  });
  it("uses an identical shared value-to-colour mapping and does not mutate source", () => {
    const source = generateDensity(base),
      before = source.slice(),
      shown = transform(source);
    expect(viridis(shown[3]!, 0, 2)).toEqual(viridis(shown[3]!, 0, 2));
    expect(source).toEqual(before);
  });
});
describe("pilot state compatibility", () => {
  it("builds baseline from immutable active plan values", () => {
    const plan = {
      planVersionId: "p1",
      resolved: {
        boxSizeMpcOverH: 75,
        particleSide: 64,
        snapshotIds: ["z2", "z0"],
      },
    } as PlanVersion;
    expect(settingsFromPlan(plan, "z0")).toMatchObject({
      boxSizeMpcOverH: 75,
      particleSide: 64,
      snapshotId: "z0",
    });
  });
  it("migrates schema 5 without losing existing records and round trips", () => {
    const old = {
      ...createEmptyProject(),
      schemaVersion: 5,
      choiceOrderSeed: "preserved-seed",
      planReviewCompletedAt: "2026-08-20T12:00:00.000Z",
      planChangeReasonId: "preserved-reason",
    };
    const migrated = migrateProject(old);
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.choiceOrderSeed).toBe("preserved-seed");
    expect(migrated.planReviewCompletedAt).toBe("2026-08-20T12:00:00.000Z");
    expect(migrated.planChangeReasonId).toBe("preserved-reason");
    expect(migrateProject(JSON.parse(JSON.stringify(migrated)))).toEqual(
      migrated,
    );
  });
});
