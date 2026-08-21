import { describe, expect, it } from "vitest";
import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "./numerical";
import { isAnalysisDraft, isGuidedResult } from "./records";

const draft = {
  recordKind: "analysis-run-draft",
  schemaVersion: 1,
  runId: "run",
  recipeId: "recipe",
  completedLearningStep: 4,
  contextFingerprint: "context",
  numericalContractId: ANALYSIS_NUMERICAL_CONTRACT_V1.id,
  numericalContractVersion: ANALYSIS_NUMERICAL_CONTRACT_V1.version,
  updatedAt: "2026-08-21T00:00:00.000Z",
};
describe("analysis record compatibility", () => {
  it("requires every draft identity and compatibility field", () => {
    expect(isAnalysisDraft(draft)).toBe(true);
    expect(isAnalysisDraft({ ...draft, completedLearningStep: 7 })).toBe(false);
    expect(isAnalysisDraft({ ...draft, schemaVersion: 2 })).toBe(false);
    expect(isAnalysisDraft({ ...draft, runId: "" })).toBe(false);
    expect(
      isAnalysisDraft({ ...draft, numericalContractVersion: "future" }),
    ).toBe(false);
  });
  it("does not mistake unknown and future records for current outputs", () => {
    const unknown = {
      recordKind: "future-analysis",
      schemaVersion: 99,
      payload: "keep",
    };
    expect(isAnalysisDraft(unknown)).toBe(false);
    expect(isGuidedResult(unknown)).toBe(false);
    const records: unknown[] = [unknown, draft];
    const retained = records.filter((value) => !isAnalysisDraft(value));
    expect(retained).toEqual([unknown]);
  });
});
