import { describe, expect, it } from "vitest";
import {
  appendResult,
  direction,
  normalizeInterpretation,
  parseSnapshots,
  reviewDraft,
  saveDraft,
  trend,
  type InterpretationDraft,
  type InterpretationResult,
} from "./logic";

const snapshot = (id: string, a: number, sigma: number) => ({
  id,
  redshift: 1 / a - 1,
  scaleFactor: a,
  inputMean: 1,
  normalizedMean: 1,
  contrastMean: 0,
  sigmaDelta: sigma,
  histogram: {},
  baselineDenseFraction: { threshold: 2, fraction: sigma / 10 },
});
const draft: InterpretationDraft = {
  recordKind: "interpretation-draft",
  schemaVersion: 1,
  draftId: "d",
  contextFingerprint: "fp",
  runId: "r",
  step: 5,
  evidence: [
    { kind: "figure", figureId: "f", runId: "r", figureKind: "sigma-growth" },
    {
      kind: "snapshot-statistic",
      runId: "r",
      snapshotId: "a",
      metric: "sigmaDelta",
      value: 1,
    },
    {
      kind: "comparison",
      runId: "r",
      fromSnapshotId: "a",
      toSnapshotId: "b",
      metric: "sigmaDelta",
      fromValue: 1,
      toValue: 2,
      direction: "increase",
    },
  ],
  resultClaimId: "sigma-observed",
  interpretationClaimId: "structure-consistent",
  predictionMatch: "aligned",
  answerId: "density-changed",
  scopeId: "fixture-run",
  limitations: [
    { id: "m", category: "model", impactId: "i" },
    { id: "n", category: "measurement", impactId: "i" },
    { id: "g", category: "generalization", impactId: "i" },
  ],
  addressedGuardIds: ["guard"],
  note: "",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("S12 scientific logic", () => {
  it("strictly parses snapshots and rejects non-finite values", () => {
    expect(parseSnapshots([snapshot("a", 0.5, 1)])[0]).toMatchObject({
      id: "a",
      sigmaDelta: 1,
    });
    expect(() => parseSnapshots([snapshot("a", 0.5, NaN)])).toThrow(/有限/);
  });
  it("sorts by scale factor and prevents excessive monotonic claims", () => {
    const x = trend([
      { scaleFactor: 1, value: 3 },
      { scaleFactor: 0.2, value: 1 },
      { scaleFactor: 0.6, value: 0.9 },
    ]);
    expect(x.direction).toBe("increase");
    expect(x.monotonicIncrease).toBe(false);
  });
  it.each([
    [1, 2, "increase"],
    [2, 1, "decrease"],
    [1, 1 + 1e-10, "no-clear-change"],
  ] as const)("classifies %s to %s", (a, b, want) =>
    expect(direction(a, b)).toBe(want),
  );
  it("emits every required Mira review code from metadata", () => {
    const bad = {
      ...draft,
      evidence: [],
      resultClaimId: "contradicted-cause",
      interpretationClaimId: "real-cws",
      predictionMatch: "aligned" as const,
      answerId: "prediction-proof",
      scopeId: "universe",
      limitations: [],
      addressedGuardIds: [],
    };
    const codes = new Set(reviewDraft(bad, ["guard"]));
    for (const code of [
      "missing-evidence",
      "contradicted-by-data",
      "mixed-result-and-interpretation",
      "demo-as-cws-or-real",
      "single-seed-generalization",
      "prediction-as-proof",
      "missing-model-limitation",
      "missing-measurement-limitation",
      "missing-generalization-limitation",
      "carried-guard-unaddressed",
    ])
      expect(codes).toContain(code);
    expect(reviewDraft({ ...bad, interpretationClaimId: "galaxy" })).toContain(
      "galaxy-from-dm-only",
    );
    expect(
      reviewDraft({ ...bad, interpretationClaimId: "below-resolution" }),
    ).toContain("below-resolution");
    expect(reviewDraft({ ...bad, interpretationClaimId: "causal" })).toContain(
      "correlation-as-causation",
    );
    expect(reviewDraft({ ...bad, answerId: null, scopeId: null })).toContain(
      "conclusion-does-not-answer-question",
    );
  });
  it("normalizes the placeholder, retains unknown records, updates only matching drafts, and appends immutable results", () => {
    expect(
      normalizeInterpretation({
        result: null,
        interpretation: null,
        conclusion: null,
        limitations: [],
      }),
    ).toEqual({ drafts: [], results: [], retained: [] });
    expect(normalizeInterpretation({ future: 2 }).retained).toHaveLength(1);
    const store = saveDraft(normalizeInterpretation(null), draft);
    expect(() =>
      saveDraft(store, { ...draft, contextFingerprint: "other" }),
    ).toThrow(/context/);
    const result = {
      ...draft,
      recordKind: "evidence-based-interpretation-result",
      resultId: "x",
      completedAt: "2026-01-01T00:00:00Z",
      reviewCodes: [],
    } as InterpretationResult;
    const done = appendResult(store, result);
    expect(done.results).toHaveLength(1);
    expect(() => appendResult(done, result)).toThrow(/immutable/);
  });
});
