import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  migrateProject,
  projectStateSchema,
} from "./project";

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

  it.each([1, 2])("schemaVersion %sをS04初期値付きで移行する", (version) => {
    const old: Record<string, unknown> = {
      ...createEmptyProject(new Date("2026-08-20T12:00:00.000Z")),
      schemaVersion: version,
    };
    delete old.methodUnderstanding;
    if (version === 1) {
      delete old.researchQuestion;
      delete old.hypothesis;
      delete old.prediction;
    }
    const migrated = migrateProject(old);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.researchPlanDraft.contentId).toBe("research-plan-v1");
    expect(migrated.methodUnderstanding).toEqual({
      contentId: "method-understanding-v1",
      answers: [],
      completedAt: null,
    });
  });

  it("未知の将来版を拒否する", () => {
    expect(() =>
      migrateProject({ ...createEmptyProject(), schemaVersion: 99 }),
    ).toThrow(/新しい版/);
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
