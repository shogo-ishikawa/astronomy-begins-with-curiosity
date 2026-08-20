import { describe, expect, it } from "vitest";
import { hypothesisPredictionAligned, predictionChoices } from "./logic";
describe("仮説と予想規則", () => {
  it("測定対象で予想文を変える", () =>
    expect(
      predictionChoices("dense-fraction", "dense-fraction")[0]?.label,
    ).toContain("割合が増える"));
  it("方向を判定し、未確定は許容する", () => {
    expect(hypothesisPredictionAligned("gravity-growth", "increase")).toBe(
      true,
    );
    expect(hypothesisPredictionAligned("gravity-growth", "decrease")).toBe(
      false,
    );
    expect(hypothesisPredictionAligned("uncertain", "decrease")).toBe(true);
  });
});
