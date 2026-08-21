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
let stdout = "";
let stderr = "";
function send(message: PythonResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}
function pythonString(value: unknown) {
  return JSON.stringify(JSON.stringify(value));
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
        batched: (text) => {
          stdout += `${text}\n`;
          send({
            ...base,
            type: "output",
            payload: { stream: "stdout", ...limitOutput(stdout) },
          });
        },
      });
      pyodide.setStderr({
        batched: (text) => {
          stderr += `${text}\n`;
          send({
            ...base,
            type: "output",
            payload: { stream: "stderr", ...limitOutput(stderr) },
          });
        },
      });
      send({
        ...base,
        type: "status",
        payload: { phase: "ready", message: "準備完了" },
      });
      return;
    }
    if (!pyodide) throw new Error("先にPython環境を準備してください。");
    stdout = "";
    stderr = "";
    send({
      ...base,
      type: "status",
      payload: { phase: "running", message: "実行中" },
    });
    const serializableInput = {
      ...request.payload.input,
      snapshots: request.payload.input.snapshots.map((snapshot) => ({
        ...snapshot,
        density: Array.from(snapshot.density),
      })),
    };
    const wrapper = `
import ast, base64, io, json, platform
source = ${pythonString(request.payload.source)}
tree = ast.parse(source, mode="exec")
allowed_imports = {"numpy", "matplotlib", "io"}
for node in ast.walk(tree):
    if isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
        raise ValueError("教材に不要な任意ループは使えません。")
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        names = [x.name.split('.')[0] for x in node.names] if isinstance(node, ast.Import) else [(node.module or '').split('.')[0]]
        if any(x not in allowed_imports for x in names): raise ValueError("許可されていないimportです。")
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"open", "eval", "exec", "input", "compile", "__import__"}:
        raise ValueError(node.func.id + "は使えません。")
    if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
        raise ValueError("dunder属性は使えません。")
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
payload = json.loads(${pythonString(serializableInput)})
edges = np.asarray(payload["sharedHistogramEdges"], dtype=np.float64)
results = []
for snap in payload["snapshots"]:
    rho_values = snap["density"]
    dense_threshold = payload["denseThreshold"]
    shared_histogram_edges = edges
    scope = {"np": np, "rho_values": rho_values, "dense_threshold": dense_threshold, "shared_histogram_edges": shared_histogram_edges}
    exec(compile(tree, "student_analysis.py", "exec"), {"__builtins__": {"print": print, "len": len, "range": range}}, scope)
    rho = np.asarray(rho_values, dtype=np.float64)
    input_mean = np.mean(rho); q = rho / input_mean; delta = q - 1.0
    sigma_delta = np.sqrt(np.mean(delta ** 2))
    counts, _ = np.histogram(delta, bins=edges)
    dense = []
    for threshold in payload["sensitivityThresholds"]:
        count = int(np.count_nonzero(q >= threshold)); dense.append({"threshold": threshold, "count": count, "fraction": count / delta.size})
    results.append({"id": snap["id"], "redshift": snap["redshift"], "scaleFactor": snap["scaleFactor"], "inputMean": float(input_mean), "normalizedMean": float(np.mean(q)), "contrastMean": float(np.mean(delta)), "sigmaDelta": float(sigma_delta), "dense": dense, "histogramCounts": counts.tolist(), "histogramFractions": (counts / delta.size).tolist()})
factors = [x["scaleFactor"] for x in results]
fig, axes = plt.subplots(1, 2, figsize=(8, 3))
axes[0].plot(factors, [x["sigmaDelta"] for x in results], marker="o")
axes[0].set(xlabel="scale factor a", ylabel="sigma delta")
for threshold in payload["sensitivityThresholds"]:
    axes[1].plot(factors, [next(d["fraction"] for d in x["dense"] if d["threshold"] == threshold) for x in results], marker="o", label=f"q >= {threshold}")
axes[1].set(xlabel="scale factor a", ylabel="dense cell fraction"); axes[1].legend()
fig.tight_layout(); image = io.BytesIO(); fig.savefig(image, format="png"); plt.close(fig)
answer = {"runtime": {"pyodide": ${JSON.stringify(PYODIDE_CONFIG.version)}, "python": platform.python_version(), "numpy": np.__version__, "matplotlib": matplotlib.__version__}, "snapshots": results, "figureSeries": {"scaleFactors": factors, "sigma": [x["sigmaDelta"] for x in results], "denseFractions": {str(t): [next(d["fraction"] for d in x["dense"] if d["threshold"] == t) for x in results] for t in payload["sensitivityThresholds"]}, "histogramEdges": edges.tolist()}, "figureMetadata": payload["figureSpec"], "image": base64.b64encode(image.getvalue()).decode("ascii")}
json.dumps(answer, allow_nan=False)
`;
    const proxy = await pyodide.runPythonAsync(wrapper);
    const encoded = typeof proxy === "string" ? proxy : String(proxy);
    if (typeof proxy === "object" && proxy && "destroy" in proxy)
      (proxy as { destroy(): void }).destroy();
    const answer = JSON.parse(encoded) as Record<string, unknown> & {
      image: string;
    };
    const binary = atob(answer.image);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    delete (answer as { image?: string }).image;
    const payload = {
      ...answer,
      imageBytes: bytes,
      stdout: limitOutput(stdout),
      stderr: limitOutput(stderr),
    };
    send(
      { ...base, type: "result", payload: payload as PythonResponse & never },
      [bytes.buffer],
    );
    send({
      ...base,
      type: "status",
      payload: { phase: "complete", message: "完了" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Python実行に失敗しました。";
    if (/使えません|import/.test(message))
      send({
        ...base,
        type: "validation-error",
        payload: { messages: [message] },
      });
    else
      send({
        ...base,
        type: "error",
        payload: {
          code: "python-runtime-error",
          message,
          traceback: error instanceof Error ? error.stack : undefined,
        },
      });
  }
};
