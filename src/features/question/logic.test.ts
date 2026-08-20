import { describe, expect, it } from "vitest";
import { questionMeasurementAligned, suggestedQuestions } from "./logic";
describe("研究課題規則", () => {
  it("関心から候補を決定する", () =>
    expect(suggestedQuestions("density")).toEqual([
      "dense-fraction",
      "fluctuation-growth",
    ]));
  it("問いと測定量を判定する", () => {
    expect(
      questionMeasurementAligned("fluctuation-growth", "standard-deviation"),
    ).toBe(true);
    expect(questionMeasurementAligned("fluctuation-growth", "images")).toBe(
      false,
    );
  });
});
