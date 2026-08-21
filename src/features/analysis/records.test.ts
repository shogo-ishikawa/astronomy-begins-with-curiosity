import { describe, expect, it } from "vitest";
import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "./numerical";
import {
  isAnalysisDraft,
  isGuidedResult,
  isPythonAnalysisDraft,
  isPythonAssistedResult,
} from "./records";

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
  it("strictly separates Python drafts and append-only completion records", () => {
    const pythonDraft = {
      recordKind: "python-analysis-draft",
      schemaVersion: 1,
      currentStep: 2,
      codeByStep: { mean: "rho = values" },
      hintLevelByStep: {},
      supportLevel: "first-time",
      referencedGuiResultId: "gui-a",
      recipeId: "recipe",
      contextFingerprint: "context-a",
      updatedAt: "2026-08-21T00:00:00.000Z",
    };
    expect(isPythonAnalysisDraft(pythonDraft)).toBe(true);
    expect(
      isPythonAnalysisDraft({ ...pythonDraft, supportLevel: "unknown" }),
    ).toBe(false);
    const otherRun = {
      ...pythonDraft,
      referencedGuiResultId: "gui-b",
      contextFingerprint: "context-b",
    };
    const retained = [
      pythonDraft,
      otherRun,
      { recordKind: "future", binary: new Uint8Array([1]) },
    ].filter(
      (value) =>
        !(
          isPythonAnalysisDraft(value) &&
          value.referencedGuiResultId === "gui-a" &&
          value.contextFingerprint === "context-a"
        ),
    );
    expect(retained).toEqual([
      otherRun,
      { recordKind: "future", binary: new Uint8Array([1]) },
    ]);
    const completed = {
      recordKind: "python-assisted-analysis-result",
      schemaVersion: 1,
      recordId: "python-result",
      runId: "python-run",
      referencedGuiResultId: "gui-a",
      recipeId: "recipe",
      contextFingerprint: "context-a",
      executedEngine: "pyodide-python",
      runtime: { pyodide: "314.0.5", python: "3", numpy: "2", matplotlib: "3" },
      snapshots: [],
      parityRows: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      completedAt: "2026-08-21T00:00:01.000Z",
    };
    expect(isPythonAssistedResult(completed)).toBe(true);
    expect(JSON.stringify(completed)).not.toMatch(
      /imageBytes|blob:|data:image|Uint8Array/,
    );
    expect([
      completed,
      { ...completed, recordId: "python-result-2" },
    ]).toHaveLength(2);
  });
});
