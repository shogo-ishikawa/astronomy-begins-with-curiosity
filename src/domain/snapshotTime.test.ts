import { describe, expect, it } from "vitest";
import { formatSnapshotId, scaleFactor, snapshotTimes } from "./snapshotTime";

describe("スナップショット時刻表示", () => {
  it.each([
    [10, 1 / 11],
    [5, 1 / 6],
    [2, 1 / 3],
    [1, 0.5],
    [0, 1],
  ])("z=%s で a=1/(1+z)", (z, expected) =>
    expect(scaleFactor(z)).toBeCloseTo(expected, 12),
  );
  it("initialを赤方偏移へ推測変換しない", () => {
    expect(formatSnapshotId("initial")).toBe(
      "計算開始時（開始赤方偏移は実行時に確定）",
    );
    expect(formatSnapshotId("initial")).not.toContain("nitial");
  });
  it("通常時刻はmetadataからzとaを表示する", () => {
    for (const item of snapshotTimes.filter((x) => x.redshift !== null)) {
      expect(formatSnapshotId(item.id)).toContain(`z = ${item.redshift}`);
      expect(scaleFactor(item.redshift!)).toBe(1 / (1 + item.redshift!));
    }
  });
});
