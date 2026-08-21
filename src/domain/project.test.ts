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
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.researchPlanDraft.contentId).toBe("research-plan-v1");
    expect(migrated.methodUnderstanding).toEqual({
      contentId: "method-understanding-v1",
      answers: [],
      completedAt: null,
    });
  });
  it("schema 6の旧ResultPackageをlegacy-unboundへ保全し、nullは維持する", () => {
    const old = {
      ...createEmptyProject(),
      schemaVersion: 6,
      resultPackage: {
        packageId: "old",
        dataVersion: "1",
        provenance: {
          kind: "demo-fixture",
          generator: "g",
          generatorVersion: "1",
          dataVersion: "1",
          createdAt: "2026-08-21T00:00:00.000Z",
          notes: "",
        },
      },
    };
    expect(migrateProject(old).resultPackage).toMatchObject({
      refKind: "legacy-unbound",
      packageId: "old",
    });
    expect(
      migrateProject({ ...old, resultPackage: null }).resultPackage,
    ).toBeNull();
  });

  it("未知の将来版を拒否する", () => {
    expect(() =>
      migrateProject({ ...createEmptyProject(), schemaVersion: 99 }),
    ).toThrow(/新しい版/);
  });
  it.each([null, []])(
    "schema 7のqualityChecks %sをtyped historyへ移行する",
    (value) => {
      const old = {
        ...createEmptyProject(),
        schemaVersion: 7,
        qualityChecks: value ?? [],
      };
      const migrated = migrateProject(old);
      expect(migrated.qualityChecks).toEqual([]);
      expect(migrated.qualityDraft).toBeNull();
    },
  );
  it("schema 7の旧品質記録を合格扱いせず保持する", () => {
    const migrated = migrateProject({
      ...createEmptyProject(),
      schemaVersion: 7,
      qualityChecks: [{ passed: true }],
    });
    expect(migrated.qualityChecks).toEqual([
      { recordKind: "legacy-unbound", original: { passed: true } },
    ]);
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
