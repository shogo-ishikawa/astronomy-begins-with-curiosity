import { z } from "zod";
import { PYTHON_PROTOCOL_VERSION } from "./pythonConfig";

const envelope = {
  protocolVersion: z.literal(PYTHON_PROTOCOL_VERSION),
  workerGeneration: z.number().int().nonnegative(),
  requestId: z.string().min(1),
};
export const PythonRequestSchema = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("prepare"), payload: z.object({}) }),
  z.object({
    ...envelope,
    type: z.literal("run"),
    payload: z.object({ source: z.string().max(30_000) }),
  }),
]);
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
