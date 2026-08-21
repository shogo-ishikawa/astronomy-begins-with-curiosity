import { describe, expect, it } from "vitest";
import {
  compareNumber,
  exactArrayMatch,
  parityTolerance,
} from "./pythonParity";
import {
  limitOutput,
  PythonAnalysisInputSchema,
  PythonRequestSchema,
  PythonResultPayloadSchema,
  isCurrentResponse,
} from "./pythonProtocol";
import { validateEducationalPython } from "./pythonTemplate";

describe("S11B Python support", () => {
  it("applies the numerical contract at the boundary and outside it", () => {
    const tolerance = parityTolerance(1, 1);
    expect(compareNumber("inside", 1, 1 + tolerance * 0.5).matches).toBe(true);
    expect(compareNumber("outside", 1, 1 + tolerance * 2).matches).toBe(false);
    expect(() => compareNumber("nan", 1, Number.NaN)).toThrow(/有限値/);
    expect(exactArrayMatch([1, 2], [1, 2])).toBe(true);
    expect(exactArrayMatch([1, 2], [2, 1])).toBe(false);
  });

  it("validates protocol envelopes and ignores stale generations", () => {
    const request = {
      protocolVersion: 1,
      workerGeneration: 2,
      requestId: "r",
      type: "prepare",
      payload: {},
    };
    expect(PythonRequestSchema.safeParse(request).success).toBe(true);
    const response = {
      ...request,
      type: "status",
      payload: { phase: "ready", message: "準備完了" },
    };
    expect(isCurrentResponse(response, 2, new Set(["r"]))).toBe(true);
    expect(isCurrentResponse(response, 3, new Set(["r"]))).toBe(false);
  });

  it("limits output and rejects code outside the educational subset", () => {
    expect(limitOutput(Array(202).fill("line").join("\n")).truncated).toBe(
      true,
    );
    expect(validateEducationalPython("q = rho / input_mean")).toEqual([]);
    for (const source of [
      "open('x')",
      "import requests",
      "for x in rho: pass",
      "x.__class__",
      "from js import document",
    ])
      expect(validateEducationalPython(source).length).toBeGreaterThan(0);
  });

  it("rejects non-finite values, shape errors, and invalid snapshot order", () => {
    const input = {
      snapshots: [
        {
          id: "z1",
          scaleFactor: 0.5,
          redshift: 1,
          width: 2,
          height: 2,
          density: [1, 2, 3, 4],
        },
      ],
      sharedHistogramEdges: Array.from({ length: 31 }, (_, i) => i - 15),
      denseThreshold: 2,
      sensitivityThresholds: [1.5, 2, 3],
      numericalContract: { id: "contract", version: "1" },
      figureSpec: {
        figureKinds: ["histogram"],
        displayMode: "comparison",
        colorMap: "cividis",
        axes: ["delta", "fraction"],
      },
    };
    expect(PythonAnalysisInputSchema.safeParse(input).success).toBe(true);
    expect(
      PythonAnalysisInputSchema.safeParse({
        ...input,
        snapshots: [{ ...input.snapshots[0], density: [1, 2] }],
      }).success,
    ).toBe(false);
    expect(
      PythonAnalysisInputSchema.safeParse({
        ...input,
        snapshots: [{ ...input.snapshots[0], density: [1, 2, Number.NaN, 4] }],
      }).success,
    ).toBe(false);
    expect(
      PythonAnalysisInputSchema.safeParse({
        ...input,
        snapshots: [
          { ...input.snapshots[0], id: "late", scaleFactor: 0.8 },
          { ...input.snapshots[0], id: "early", scaleFactor: 0.2 },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates structured results and refuses binary/shape substitutions", () => {
    const snapshot = {
      id: "z0",
      redshift: 0,
      scaleFactor: 1,
      inputMean: 1,
      normalizedMean: 1,
      contrastMean: 0,
      sigmaDelta: 0,
      dense: [1.5, 2, 3].map((threshold) => ({
        threshold,
        count: 0,
        fraction: 0,
      })),
      histogramCounts: [4, ...Array(29).fill(0)],
      histogramFractions: [1, ...Array(29).fill(0)],
    };
    const payload = {
      runtime: { pyodide: "314.0.5", python: "3", numpy: "2", matplotlib: "3" },
      snapshots: [snapshot],
      figureSeries: {
        scaleFactors: [1],
        sigma: [0],
        denseFractions: { "2": [0] },
        histogramEdges: Array.from({ length: 31 }, (_, i) => i),
      },
      figureMetadata: {
        figureKinds: ["histogram"],
        displayMode: "comparison",
        colorMap: "cividis",
        axes: ["delta"],
      },
      imageBytes: new Uint8Array([137, 80, 78, 71]),
      stdout: { text: "", truncated: false },
      stderr: { text: "", truncated: false },
    };
    expect(PythonResultPayloadSchema.safeParse(payload).success).toBe(true);
    expect(
      PythonResultPayloadSchema.safeParse({
        ...payload,
        imageBytes: "data:image/png;base64,...",
      }).success,
    ).toBe(false);
    expect(
      PythonResultPayloadSchema.safeParse({
        ...payload,
        snapshots: [{ ...snapshot, histogramCounts: [4] }],
      }).success,
    ).toBe(false);
  });
});
