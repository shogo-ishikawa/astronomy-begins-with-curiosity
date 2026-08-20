import { expect, it } from "vitest";
import { glossaryEntries, glossaryById } from "./glossary/entries";
import { methodContent } from "./method/content";
import { prohibitedTechnicalTerms } from "./technicalTerms";
import { planningGlossaryIds } from "./planning";
it("all S04 glossary links exist", () => {
  for (const s of methodContent.sections)
    for (const id of s.glossaryTerms)
      expect(glossaryById.has(id), id).toBe(true);
  for (const q of methodContent.questions)
    for (const id of q.glossaryTerms)
      expect(glossaryById.has(id), id).toBe(true);
});
it("all S05 glossary links exist", () => {
  for (const id of planningGlossaryIds)
    expect(glossaryById.has(id), id).toBe(true);
});
it("uses approved technical spellings", () => {
  const text = JSON.stringify({ glossaryEntries, methodContent });
  for (const term of prohibitedTechnicalTerms) expect(text).not.toContain(term);
});
it("defines filament, node, knot and void relationships", () => {
  for (const id of ["filament", "node", "knot", "void"])
    expect(glossaryById.has(id)).toBe(true);
  expect(glossaryById.get("node")!.detail).toContain("ほぼ同じ意味");
  expect(glossaryById.get("knot")!.detail).toContain("ほぼ同じ意味");
  expect(glossaryById.get("void")!.detail).toContain("物質");
});
