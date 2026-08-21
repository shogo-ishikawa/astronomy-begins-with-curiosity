import { describe, expect, it } from "vitest";
import { glossaryById } from "../glossary/entries";
import { stageSupport } from "./stageSupport";

describe("stage support content", () => {
  it("references existing glossary entries and limits key terms", () => {
    for (const support of Object.values(stageSupport)) {
      expect(support.keyTermIds.length).toBeLessThanOrEqual(3);
      for (const id of support.keyTermIds)
        expect(glossaryById.has(id), id).toBe(true);
    }
  });
});
