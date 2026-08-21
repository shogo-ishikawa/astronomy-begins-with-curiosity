import type { SnapshotId } from "../execution/logic";

export const ANALYSIS_NUMERICAL_CONTRACT_V1 = {
  id: "abcs-analysis-numerical-contract",
  version: "1.0.0",
  accumulator: "javascript-number",
  varianceDivisor: "N",
  histogramBins: 30,
  histogramIntervals: "left-closed-right-open-last-closed",
  baselineDenseThreshold: 2,
  denseOperator: ">=",
  sensitivityThresholds: [1.5, 2, 3],
  timeAxis: "scale-factor",
  smoothing: false,
  logarithm: false,
  clipping: false,
  futureParityTolerance: { absolute: 1e-12, relative: 1e-6 },
} as const;

export type DenseFraction = {
  threshold: number;
  operator: ">=";
  deltaThreshold: number;
  matchingCellCount: number;
  totalCellCount: number;
  fraction: number;
  decimal: string;
  percent: string;
};

export type SnapshotStatistics = {
  inputMean: number;
  normalized: number[];
  normalizedMean: number;
  contrast: number[];
  contrastMean: number;
  sigmaDelta: number;
  denseFractions: DenseFraction[];
};

export function denseFraction(
  values: readonly number[],
  threshold: number,
): DenseFraction {
  const matchingCellCount = values.reduce(
    (n, value) => n + (value >= threshold ? 1 : 0),
    0,
  );
  const fraction = matchingCellCount / values.length;
  return {
    threshold,
    operator: ">=",
    deltaThreshold: threshold - 1,
    matchingCellCount,
    totalCellCount: values.length,
    fraction,
    decimal: fraction.toFixed(6),
    percent: `${(fraction * 100).toFixed(2)}%`,
  };
}

export function analyzeDensity(
  values: ArrayLike<number>,
  expectedLength?: number,
): SnapshotStatistics {
  const input = Array.from(values);
  if (!input.length) throw new Error("密度グリッドが空です。");
  if (expectedLength !== undefined && input.length !== expectedLength)
    throw new Error("密度グリッドのセル数がmanifestと一致しません。");
  if (input.some((value) => !Number.isFinite(value)))
    throw new Error("密度に有限でない値があります。");
  if (input.some((value) => value < 0))
    throw new Error("密度に負の値があります。");
  const inputMean = input.reduce((sum, value) => sum + value, 0) / input.length;
  if (!Number.isFinite(inputMean) || inputMean <= 0)
    throw new Error("密度グリッドの平均が有限の正数ではありません。");
  const normalized = input.map((value) => value / inputMean);
  const contrast = normalized.map((value) => value - 1);
  const normalizedMean =
    normalized.reduce((sum, value) => sum + value, 0) / input.length;
  const contrastMean =
    contrast.reduce((sum, value) => sum + value, 0) / input.length;
  const sigmaDelta = Math.sqrt(
    contrast.reduce((sum, value) => sum + value * value, 0) / input.length,
  );
  return {
    inputMean,
    normalized,
    normalizedMean,
    contrast,
    contrastMean,
    sigmaDelta,
    denseFractions: ANALYSIS_NUMERICAL_CONTRACT_V1.sensitivityThresholds.map(
      (threshold) => denseFraction(normalized, threshold),
    ),
  };
}

export function commonHistogramBoundaries(
  series: readonly (readonly number[])[],
  binCount = ANALYSIS_NUMERICAL_CONTRACT_V1.histogramBins,
) {
  if (!series.length || series.some((values) => !values.length))
    throw new Error("ヒストグラムの入力が空です。");
  let minimum = Math.min(...series.flatMap((values) => [...values]));
  let maximum = Math.max(...series.flatMap((values) => [...values]));
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
    throw new Error("ヒストグラムに有限でない値があります。");
  if (minimum === maximum) {
    const padding = Math.max(1, Math.abs(minimum)) * Number.EPSILON * binCount;
    minimum -= padding;
    maximum += padding;
  }
  const width = (maximum - minimum) / binCount;
  return Array.from({ length: binCount + 1 }, (_, index) =>
    index === binCount ? maximum : minimum + width * index,
  );
}

export function histogram(
  values: readonly number[],
  boundaries: readonly number[],
) {
  const counts = Array<number>(boundaries.length - 1).fill(0);
  const maximum = boundaries.at(-1)!;
  for (const value of values) {
    let index: number;
    if (value === maximum) index = counts.length - 1;
    else {
      // upper_bound makes an exact internal boundary part of the right bin.
      let low = 1;
      let high = boundaries.length;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (boundaries[middle]! <= value) low = middle + 1;
        else high = middle;
      }
      index = low - 1;
    }
    if (index < 0 || index >= counts.length)
      throw new Error("値が共通ビン境界の外です。");
    counts[index]++;
  }
  return {
    binCount: counts.length,
    boundaries: [...boundaries],
    counts,
    fractions: counts.map((count) => count / values.length),
    totalCellCount: values.length,
  };
}

export const SCALE_FACTOR_PLOT = { left: 55, right: 495 } as const;
export function scaleFactorX(
  scaleFactor: number,
  values: readonly number[],
): number {
  if (!values.length || !Number.isFinite(scaleFactor))
    throw new Error("スケール因子が不正です。");
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum)
    return (SCALE_FACTOR_PLOT.left + SCALE_FACTOR_PLOT.right) / 2;
  return (
    SCALE_FACTOR_PLOT.left +
    ((scaleFactor - minimum) / (maximum - minimum)) *
      (SCALE_FACTOR_PLOT.right - SCALE_FACTOR_PLOT.left)
  );
}

export function sortByScaleFactor<
  T extends { id: SnapshotId; scaleFactor: number },
>(values: readonly T[]): T[] {
  return [...values].sort((a, b) => a.scaleFactor - b.scaleFactor);
}
