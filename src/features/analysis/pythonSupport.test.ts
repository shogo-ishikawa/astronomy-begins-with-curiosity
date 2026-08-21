import { describe, expect, it } from "vitest";
import {
  compareNumber,
  exactArrayMatch,
  parityTolerance,
} from "./pythonParity";
import {
  limitOutput,
  PythonRequestSchema,
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
});
