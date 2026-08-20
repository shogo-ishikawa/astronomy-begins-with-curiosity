import type { PilotSettings } from "./logic";
import { sigmaDelta } from "./logic";
export const demoProvenance = {
  kind: "demo-fixture" as const,
  generator: "ABCs multiscale Fourier field",
  generatorVersion: "1.0.0",
  dataVersion: "demo-pilot-1",
  seed: 1701,
  createdAt: "2026-08-20T00:00:00.000Z",
  conditions:
    "64×64、固定された複数フーリエモード、lognormal相当変換、平均1へ規格化",
  notes:
    "合成データです。CWSの計算結果や観測データではなく、N体計算の収束性を再現しません。",
};
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function generateDensity(settings: PilotSettings) {
  const size = settings.displayGrid,
    out = new Float64Array(size * size);
  const phaseKey =
    settings.boxSizeMpcOverH === 50 ? "common" : `L${settings.boxSizeMpcOverH}`;
  const phase =
    (hash(`${settings.seed}:${phaseKey}:${settings.snapshotId}`) / 2 ** 32) *
    Math.PI *
    2;
  const detail = Math.min(1.15, 0.55 + settings.particleSide / 90);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const X = (2 * Math.PI * x) / size,
        Y = (2 * Math.PI * y) / size;
      const field =
        0.62 * Math.sin(X + phase) +
        0.52 * Math.cos(Y * 0.8 - phase * 0.4) +
        0.38 * Math.sin(X + Y * 1.7 + phase * 0.7) +
        detail * 0.18 * Math.cos(5 * X - 3 * Y + phase) +
        detail * 0.1 * Math.sin(9 * X + 7 * Y - phase * 0.2);
      out[y * size + x] = Math.exp(0.72 * field);
    }
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  for (let i = 0; i < out.length; i++) out[i] /= mean;
  return out;
}
export function fixtureSummary(values: Float64Array) {
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    sigmaDelta: sigmaDelta(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
export function transform(values: Float64Array) {
  return Float64Array.from(values, (v) => Math.log1p(v));
}
export function viridis(value: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const stops = [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ];
  const p = t * (stops.length - 1),
    i = Math.min(stops.length - 2, Math.floor(p)),
    f = p - i;
  return stops[i]!.map((v, j) =>
    Math.round(v + (stops[i + 1]![j]! - v) * f),
  ) as [number, number, number];
}
