import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "./numerical";

export type ParityRow = {
  label: string;
  gui: number;
  python: number;
  absoluteDifference: number;
  tolerance: number;
  matches: boolean;
};

export function parityTolerance(a: number, b: number) {
  const rule = ANALYSIS_NUMERICAL_CONTRACT_V1.futureParityTolerance;
  return rule.absolute + rule.relative * Math.max(Math.abs(a), Math.abs(b));
}

export function compareNumber(
  label: string,
  gui: number,
  python: number,
): ParityRow {
  if (!Number.isFinite(gui) || !Number.isFinite(python))
    throw new Error("一致検証には有限値が必要です。");
  const absoluteDifference = Math.abs(python - gui);
  const tolerance = parityTolerance(gui, python);
  return {
    label,
    gui,
    python,
    absoluteDifference,
    tolerance,
    matches: absoluteDifference <= tolerance,
  };
}

export function exactArrayMatch(
  gui: readonly number[],
  python: readonly number[],
) {
  return (
    gui.length === python.length &&
    gui.every((value, index) => value === python[index])
  );
}
