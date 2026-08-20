import { expect, it } from "vitest";
import { createEmptyProject } from "../../domain/project";
import { guardStage } from "./stageGuard";
it("returns first missing stage and treats unsure as selected", () => {
  let p = createEmptyProject(new Date("2025-01-01T00:00:00Z"));
  p = { ...p, currentStage: "method" };
  expect(guardStage(p, "method")).toBe("invitation");
  p = {
    ...p,
    motivation: {
      choiceId: "unsure",
      note: "",
      chosenAt: new Date().toISOString(),
    },
  };
  expect(guardStage(p, "method")).toBe("question");
});
