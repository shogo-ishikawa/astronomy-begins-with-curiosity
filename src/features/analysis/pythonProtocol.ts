import { z } from "zod";
import { PYTHON_PROTOCOL_VERSION } from "./pythonConfig";

const finite = z.number().finite();
const envelope = {
  protocolVersion: z.literal(PYTHON_PROTOCOL_VERSION),
  workerGeneration: z.number().int().nonnegative(),
  requestId: z.string().min(1),
};
export const PythonFigureSpecSchema = z.object({
  figureKinds: z.array(
    z.enum(["density-panels", "histogram", "sigma-growth", "dense-growth"]),
  ),
  displayMode: z.enum(["comparison", "structure"]),
  colorMap: z.literal("cividis"),
  axes: z.array(z.string().min(1)),
});
const snapshotInput = z.object({
  id: z.string().min(1),
  scaleFactor: finite.positive(),
  redshift: finite.nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  density: z.union([z.array(finite).min(1), z.instanceof(Float64Array)]),
});
export const PythonAnalysisInputSchema = z
  .object({
    snapshots: z.array(snapshotInput).min(1),
    sharedHistogramEdges: z.array(finite).length(31),
    denseThreshold: z.literal(2),
    sensitivityThresholds: z.tuple([
      z.literal(1.5),
      z.literal(2),
      z.literal(3),
    ]),
    numericalContract: z.object({
      id: z.string().min(1),
      version: z.string().min(1),
    }),
    figureSpec: PythonFigureSpecSchema,
  })
  .superRefine((value, context) => {
    value.snapshots.forEach((snapshot, index) => {
      if (snapshot.density.length !== snapshot.width * snapshot.height)
        context.addIssue({
          code: "custom",
          path: ["snapshots", index, "density"],
          message: "shapeが一致しません。",
        });
      if (
        index &&
        snapshot.scaleFactor < value.snapshots[index - 1]!.scaleFactor
      )
        context.addIssue({
          code: "custom",
          path: ["snapshots", index, "scaleFactor"],
          message: "スナップショット順が不正です。",
        });
    });
  });

export const PythonRequestSchema = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("prepare"), payload: z.object({}) }),
  z.object({
    ...envelope,
    type: z.literal("run"),
    payload: z.object({
      source: z.string().max(30_000),
      input: PythonAnalysisInputSchema,
    }),
  }),
]);
const denseResult = z.object({
  threshold: z.union([z.literal(1.5), z.literal(2), z.literal(3)]),
  count: z.number().int().nonnegative(),
  fraction: finite,
});
const resultSnapshot = z
  .object({
    id: z.string().min(1),
    redshift: finite.nonnegative(),
    scaleFactor: finite.positive(),
    inputMean: finite,
    normalizedMean: finite,
    contrastMean: finite,
    sigmaDelta: finite,
    dense: z.array(denseResult).length(3),
    histogramCounts: z.array(z.number().int().nonnegative()).length(30),
    histogramFractions: z.array(finite).length(30),
  })
  .superRefine((value, context) => {
    const count = value.histogramCounts.reduce((a, b) => a + b, 0);
    if (count <= 0 || value.dense.some((x) => x.count > count))
      context.addIssue({ code: "custom", message: "セル数合計が不正です。" });
  });
export const PythonResultPayloadSchema = z.object({
  runtime: z.object({
    pyodide: z.string(),
    python: z.string(),
    numpy: z.string(),
    matplotlib: z.string(),
  }),
  snapshots: z.array(resultSnapshot).min(1),
  figureSeries: z.object({
    scaleFactors: z.array(finite),
    sigma: z.array(finite),
    denseFractions: z.record(z.string(), z.array(finite)),
    histogramEdges: z.array(finite).length(31),
  }),
  figureMetadata: PythonFigureSpecSchema,
  imageBytes: z.instanceof(Uint8Array),
  stdout: z.object({ text: z.string(), truncated: z.boolean() }),
  stderr: z.object({ text: z.string(), truncated: z.boolean() }),
});
export const PythonResponseSchema = z.discriminatedUnion("type", [
  z.object({
    ...envelope,
    type: z.literal("status"),
    payload: z.object({
      phase: z.enum([
        "loading-python",
        "loading-packages",
        "ready",
        "running",
        "complete",
        "error",
      ]),
      message: z.string(),
    }),
  }),
  z.object({
    ...envelope,
    type: z.literal("output"),
    payload: z.object({
      stream: z.enum(["stdout", "stderr"]),
      text: z.string(),
      truncated: z.boolean(),
    }),
  }),
  z.object({
    ...envelope,
    type: z.literal("validation-error"),
    payload: z.object({ messages: z.array(z.string()).min(1) }),
  }),
  z.object({
    ...envelope,
    type: z.literal("result"),
    payload: PythonResultPayloadSchema,
  }),
  z.object({
    ...envelope,
    type: z.literal("error"),
    payload: z.object({
      code: z.string(),
      message: z.string(),
      traceback: z.string().optional(),
    }),
  }),
]);
export type PythonRequest = z.infer<typeof PythonRequestSchema>;
export type PythonResponse = z.infer<typeof PythonResponseSchema>;
export type PythonResultPayload = z.infer<typeof PythonResultPayloadSchema>;
export function isCurrentResponse(
  value: unknown,
  generation: number,
  pending: ReadonlySet<string>,
) {
  const parsed = PythonResponseSchema.safeParse(value);
  return (
    parsed.success &&
    parsed.data.workerGeneration === generation &&
    pending.has(parsed.data.requestId)
  );
}
export function limitOutput(text: string) {
  const lines = text.split("\n");
  let value = lines.slice(0, 200).join("\n");
  if (new TextEncoder().encode(value).byteLength > 65_536)
    value = value.slice(0, 65_536);
  return {
    text: value,
    truncated: lines.length > 200 || value.length < text.length,
  };
}
