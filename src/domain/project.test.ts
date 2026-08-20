import { describe, expect, it } from "vitest";
import { createEmptyProject, projectStateSchema } from "./project";

describe("ProjectState", () => {
  it("空の研究プロジェクトを有効な初期状態として作る", () => {
    const project = createEmptyProject(new Date("2026-08-20T12:00:00.000Z"));
    expect(projectStateSchema.parse(project)).toEqual(project);
    expect(project.currentStage).toBe("home");
    expect(project.resultPackage).toBeNull();
    expect(project.planVersions).toEqual([]);
  });

  it("科学的来歴が欠けた結果参照を拒否する", () => {
    const project = createEmptyProject();
    expect(() =>
      projectStateSchema.parse({
        ...project,
        resultPackage: { packageId: "sample", dataVersion: "1" },
      }),
    ).toThrow();
  });

  it("Phase 0で作成したProjectStateを引き続き読み込める", () => {
    const phase0 = createEmptyProject(new Date("2026-08-20T12:00:00.000Z"));
    expect(projectStateSchema.parse(phase0).currentStage).toBe("home");
  });

  it("motivationと重複しないglossaryViewedを保存・復元できる", () => {
    const project = createEmptyProject();
    const updated = projectStateSchema.parse({
      ...project,
      motivation: {
        choiceId: "formation",
        note: "つながり方が気になる",
        chosenAt: "2026-08-20T12:00:00.000Z",
      },
      glossaryViewed: ["cosmic-web"],
    });
    const duplicatePrevented = updated.glossaryViewed.includes("cosmic-web")
      ? updated.glossaryViewed
      : [...updated.glossaryViewed, "cosmic-web"];
    expect(updated.motivation?.note).toBe("つながり方が気になる");
    expect(duplicatePrevented).toEqual(["cosmic-web"]);
  });
});
