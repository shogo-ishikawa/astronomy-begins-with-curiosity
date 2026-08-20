import { describe, expect, it } from "vitest";
import { legacyChoiceOrderSeed, orderChoices } from "./choiceOrder";
const values = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "unsure" }];
describe("stable choice order", () => {
  it("is deterministic, immutable, complete, and pins fallback", () => {
    const before = [...values];
    const context = {
      choiceOrderSeed: "seed",
      themeId: "theme",
      groupId: "group",
    };
    const a = orderChoices(
      values,
      { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
      context,
    );
    expect(
      orderChoices(
        values,
        { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
        context,
      ),
    ).toEqual(a);
    expect(values).toEqual(before);
    expect(new Set(a.map((x) => x.id))).toEqual(
      new Set(values.map((x) => x.id)),
    );
    expect(a.at(-1)?.id).toBe("unsure");
  });
  it("keeps natural order", () =>
    expect(
      orderChoices(
        values,
        { kind: "natural", dimension: "ordinal" },
        { choiceOrderSeed: "x", themeId: "t", groupId: "g" },
      ),
    ).toEqual(values));
  it("derives legacy seeds deterministically", () =>
    expect(legacyChoiceOrderSeed("id")).toBe(legacyChoiceOrderSeed("id")));
});
