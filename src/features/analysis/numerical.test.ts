import { describe, expect, it } from "vitest";
import {
  analyzeDensity,
  commonHistogramBoundaries,
  histogram,
  scaleFactorX,
  sortByScaleFactor,
} from "./numerical";

describe("S11 numerical contract", () => {
  it.each([
    [[1, 1, 1, 1], [0, 0, 0, 0], 0, 0],
    [[0, 1, 2, 1], [-1, 0, 1, 0], Math.sqrt(0.5), 0.25],
    [[1, 1, 4], [-0.5, -0.5, 1], Math.sqrt(0.5), 1 / 3],
  ] as const)(
    "calculates population statistics for %j",
    (input, contrast, sigma, fraction) => {
      const copy = [...input];
      const result = analyzeDensity(input);
      expect(result.contrast).toEqual(contrast);
      expect(result.sigmaDelta).toBeCloseTo(sigma, 14);
      expect(result.denseFractions[1]!.fraction).toBeCloseTo(fraction, 14);
      expect(input).toEqual(copy);
    },
  );
  it("includes equality and has monotonic dense fractions", () => {
    const result = analyzeDensity([1, 1, 4]);
    expect(result.normalized).toEqual([0.5, 0.5, 2]);
    expect(result.denseFractions.map((x) => x.fraction)).toEqual([
      1 / 3,
      1 / 3,
      0,
    ]);
  });
  it("uses shared valid boundaries, puts maximum last, and conserves cells", () => {
    const boundaries = commonHistogramBoundaries([
      [0, 0],
      [-1, 0, 1],
    ]);
    expect(
      boundaries.every((x, index) => index === 0 || x > boundaries[index - 1]!),
    ).toBe(true);
    for (const values of [
      [0, 0],
      [-1, 0, 1],
    ])
      expect(
        histogram(values, boundaries).counts.reduce((a, b) => a + b, 0),
      ).toBe(values.length);
    expect(histogram([-1, 1], boundaries).counts.at(-1)).toBe(1);
    const exact = boundaries[10]!;
    expect(histogram([exact], boundaries).counts[10]).toBe(1);
    expect(commonHistogramBoundaries([[2, 2]])).toHaveLength(31);
  });
  it("plots irregular scale factors at proportional x coordinates", () => {
    const factors = [0.02, 0.0909, 0.1667, 0.3333, 0.5, 1];
    const positions = factors.map((factor) => scaleFactorX(factor, factors));
    expect(positions[1]! - positions[0]!).toBeLessThan(
      positions[5]! - positions[4]!,
    );
    expect(scaleFactorX(0.5, [0.5])).toBe(275);
  });
  it("rejects invalid inputs", () => {
    for (const input of [[], [NaN], [Infinity], [-1], [0, 0]])
      expect(() => analyzeDensity(input)).toThrow();
  });
  it("rejects a manifest length mismatch and sorts a ascending", () => {
    expect(() => analyzeDensity([1], 2)).toThrow(/manifest/);
    expect(
      sortByScaleFactor([
        { id: "z0", scaleFactor: 1 },
        { id: "z2", scaleFactor: 1 / 3 },
      ]).map((x) => x.id),
    ).toEqual(["z2", "z0"]);
  });
});
