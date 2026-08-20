import { describe, expect, it } from "vitest";
import { addMiraMessage, miraAdvice } from "./rules";

describe("Miraの決定規則", () => {
  it.each(["formation", "timing", "density", "gravity", "unsure"])(
    "%s に決定的な固有メッセージを返す",
    (choice) => {
      expect(miraAdvice(choice)).toBe(miraAdvice(choice));
      expect(miraAdvice(choice)).not.toBe(
        miraAdvice(choice === "unsure" ? "formation" : "unsure"),
      );
    },
  );
  it("同じ規則の履歴を再読み込み時に重複させない", () => {
    const once = addMiraMessage(
      [],
      "introduction",
      "こんにちは",
      new Date("2026-01-01"),
    );
    expect(addMiraMessage(once, "introduction", "こんにちは")).toEqual(once);
  });
});
