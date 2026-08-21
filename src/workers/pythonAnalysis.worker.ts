import {
  PYODIDE_CONFIG,
  PYTHON_PROTOCOL_VERSION,
} from "../features/analysis/pythonConfig";
import {
  PythonRequestSchema,
  limitOutput,
  type PythonResponse,
} from "../features/analysis/pythonProtocol";

type Pyodide = {
  loadPackage(names: string[]): Promise<void>;
  runPythonAsync(source: string): Promise<unknown>;
  setStdout(options: { batched(text: string): void }): void;
  setStderr(options: { batched(text: string): void }): void;
};
let pyodide: Pyodide | undefined;
function send(message: PythonResponse) {
  self.postMessage(message);
}
self.onmessage = async (event: MessageEvent) => {
  const parsed = PythonRequestSchema.safeParse(event.data);
  if (!parsed.success) return;
  const request = parsed.data;
  const base = {
    protocolVersion: PYTHON_PROTOCOL_VERSION,
    workerGeneration: request.workerGeneration,
    requestId: request.requestId,
  } as const;
  try {
    if (request.type === "prepare") {
      send({
        ...base,
        type: "status",
        payload: {
          phase: "loading-python",
          message: "Python実行環境を読み込み中",
        },
      });
      const module = (await import(
        /* @vite-ignore */ PYODIDE_CONFIG.moduleUrl
      )) as { loadPyodide(options: { indexURL: string }): Promise<Pyodide> };
      pyodide = await module.loadPyodide({ indexURL: PYODIDE_CONFIG.indexUrl });
      send({
        ...base,
        type: "status",
        payload: {
          phase: "loading-packages",
          message: "NumPy・Matplotlibを読み込み中",
        },
      });
      await pyodide.loadPackage(["numpy", "matplotlib"]);
      pyodide.setStdout({
        batched: (text) =>
          send({
            ...base,
            type: "output",
            payload: { stream: "stdout", ...limitOutput(text) },
          }),
      });
      pyodide.setStderr({
        batched: (text) =>
          send({
            ...base,
            type: "output",
            payload: { stream: "stderr", ...limitOutput(text) },
          }),
      });
      send({
        ...base,
        type: "status",
        payload: { phase: "ready", message: "準備完了" },
      });
    } else {
      if (!pyodide) throw new Error("先にPython環境を準備してください。");
      send({
        ...base,
        type: "status",
        payload: { phase: "running", message: "実行中" },
      });
      await pyodide.runPythonAsync(request.payload.source);
      send({
        ...base,
        type: "status",
        payload: { phase: "complete", message: "完了" },
      });
    }
  } catch (error) {
    send({
      ...base,
      type: "error",
      payload: {
        code: "python-runtime-error",
        message:
          error instanceof Error ? error.message : "Python実行に失敗しました。",
        traceback: error instanceof Error ? error.stack : undefined,
      },
    });
  }
};
