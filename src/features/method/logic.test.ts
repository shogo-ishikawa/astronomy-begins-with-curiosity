import { describe, expect, it } from "vitest";
import { methodContent } from "../../content/ja/method/content";
import { answerMethod, isMethodComplete, type MethodRecord } from "./logic";
const empty: MethodRecord = {
  contentId: methodContent.contentId,
  answers: [],
  completedAt: null,
};
describe("S04 understanding", () => {
  it("has unique questions, choices, one answer, and unsure", () => {
    expect(new Set(methodContent.questions.map((q) => q.id)).size).toBe(
      methodContent.questions.length,
    );
    for (const q of methodContent.questions) {
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
      expect(q.choices.filter((c) => c.id === q.correctChoiceId)).toHaveLength(
        1,
      );
      expect(q.choices.some((c) => c.id === "unsure")).toBe(true);
    }
  });
  it("completes only after every correct answer", () => {
    let state = empty;
    for (const q of methodContent.questions.slice(0, -1))
      state = answerMethod(
        state,
        q.id,
        q.correctChoiceId,
        new Date().toISOString(),
      );
    expect(isMethodComplete(state)).toBe(false);
    expect(state.completedAt).toBeNull();
    const q = methodContent.questions.at(-1)!;
    state = answerMethod(
      state,
      q.id,
      q.correctChoiceId,
      new Date().toISOString(),
    );
    expect(isMethodComplete(state)).toBe(true);
    expect(state.completedAt).not.toBeNull();
  });
  it("wrong and unsure do not complete, and re-answer replaces only its question", () => {
    let state = answerMethod(
      empty,
      "observation-role",
      "unsure",
      new Date().toISOString(),
    );
    state = answerMethod(
      state,
      "particle-meaning",
      "one-galaxy",
      new Date().toISOString(),
    );
    const old = state.answers.find((a) => a.questionId === "particle-meaning");
    state = answerMethod(
      state,
      "observation-role",
      "complementary",
      new Date().toISOString(),
    );
    expect(state.answers).toHaveLength(2);
    expect(
      state.answers.find((a) => a.questionId === "particle-meaning"),
    ).toEqual(old);
    expect(state.completedAt).toBeNull();
  });
});
