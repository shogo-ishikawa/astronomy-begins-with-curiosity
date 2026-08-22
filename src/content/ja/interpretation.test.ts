import { describe, expect, it } from "vitest";
import { claims, validateClaims } from "./interpretation";
import { orderChoices } from "../../domain/choiceOrder";
describe("S12 content pack", () => {
  it("validates IDs and feedback", () =>
    expect(() => validateClaims()).not.toThrow());
  it("uses stable shuffle and pins unsure last", () => {
    const context = {
      choiceOrderSeed: "seed",
      themeId: "cosmic-web-growth",
      groupId: "s12",
    };
    const a = orderChoices(
      claims,
      { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
      context,
    );
    expect(
      orderChoices(
        claims,
        { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
        context,
      ),
    ).toEqual(a);
    expect(a.at(-1)?.id).toBe("unsure");
  });
});
