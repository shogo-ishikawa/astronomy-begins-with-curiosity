import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { orderChoices } from "../../domain/choiceOrder";
import { reloadResultPackage } from "../execution/logic";
import { ANALYSIS_NUMERICAL_CONTRACT_V1 } from "./numerical";
import {
  analysisContextFingerprint,
  isPythonAnalysisDraft,
  isPythonAssistedResult,
  type GuidedAnalysisResult,
  type PythonAnalysisDraft,
  type PythonAssistedAnalysisResult,
} from "./records";
import { PYTHON_PROTOCOL_VERSION } from "./pythonConfig";
import {
  PythonResponseSchema,
  type PythonResultPayload,
} from "./pythonProtocol";
import { compareNumber, type ParityRow } from "./pythonParity";
import {
  PYTHON_STEPS,
  PYTHON_TEMPLATE_META,
  validateEducationalPython,
} from "./pythonTemplate";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage">;
export type PythonWorkerFactory = () => WorkerLike;
const defaultFactory: PythonWorkerFactory = () =>
  new Worker(
    new URL("../../workers/pythonAnalysis.worker.ts", import.meta.url),
    { type: "module" },
  );
const SUPPORT_LABELS = {
  "first-time": "初めて学ぶ",
  "basic-experience": "基礎経験あり",
  "think-and-write": "自分で考えて書きたい",
} as const;
const HINT_DETAILS = [
  "まず、GUIと同じ入力・定義を使うことを確認します。違う実装で再現することが目的です。",
  "次に必要なのは、配列をfloat64へ変換し、入力平均を自分で計算する処理です。",
  "現在のコードにある rho、q、delta と数式の対応を一行ずつ確かめてください。",
  "エラー名だけでなく、どの変数・shape・演算で止まったかを確認しましょう。",
  "正規化は q = rho / input_mean、密度コントラストは delta = q - 1.0 と書けます。",
  "下の正規テンプレートへ戻す操作で、動く完成例を復元できます。",
];

type SavedSnapshot = {
  id: string;
  inputMean: number;
  normalizedMean: number;
  contrastMean: number;
  sigmaDelta: number;
  histogram: { counts: number[]; fractions: number[] };
  baselineDenseFraction: { threshold: number; count: number; fraction: number };
  sensitivityDenseFractions: {
    threshold: number;
    count: number;
    fraction: number;
  }[];
};

export function PythonAnalysisWorkspace({
  project,
  guiResult,
  onSave,
  onBack,
  workerFactory = defaultFactory,
}: {
  project: ProjectState;
  guiResult: GuidedAnalysisResult;
  onSave: (project: ProjectState) => Promise<boolean>;
  onBack: () => void;
  workerFactory?: PythonWorkerFactory;
}) {
  const recipe = project.analysisRecipes.find(
    (x) => x.recipeId === guiResult.recipeId,
  )!;
  const context = `${analysisContextFingerprint(project, recipe)}:${guiResult.runId}:${PYTHON_TEMPLATE_META.version}`;
  const existing = [...project.analysisOutputs]
    .reverse()
    .find(
      (x): x is PythonAnalysisDraft =>
        isPythonAnalysisDraft(x) &&
        x.referencedGuiResultId === guiResult.runId &&
        x.contextFingerprint === context,
    );
  const saved = [...project.analysisOutputs]
    .reverse()
    .find(
      (x): x is PythonAssistedAnalysisResult =>
        isPythonAssistedResult(x) &&
        x.referencedGuiResultId === guiResult.runId &&
        x.contextFingerprint === context,
    );
  const initialSupport = recipe.modeDecision.pythonSupportLevel ?? "first-time";
  const [step, setStep] = useState(
    existing?.currentStep ?? (initialSupport === "think-and-write" ? 1 : 0),
  );
  const [code, setCode] = useState<Record<string, string>>(
    existing?.codeByStep ??
      Object.fromEntries(
        PYTHON_STEPS.map((x) => [
          x.id,
          initialSupport === "think-and-write" && x.id !== "purpose"
            ? ""
            : x.code,
        ]),
      ),
  );
  const [hints, setHints] = useState<Record<string, number>>(
    existing?.hintLevelByStep ?? {},
  );
  const [support, setSupport] = useState(
    existing?.supportLevel ?? initialSupport,
  );
  const [phase, setPhase] = useState(
    saved ? "保存済み結果（図は必要時に再実行）" : "未準備",
  );
  const [error, setError] = useState("");
  const [traceback, setTraceback] = useState("");
  const [output, setOutput] = useState({ stdout: "", stderr: "" });
  const [result, setResult] = useState<PythonResultPayload>();
  const [parity, setParity] = useState<ParityRow[]>(saved?.parityRows ?? []);
  const [meaning, setMeaning] = useState("");
  const [imageUrl, setImageUrl] = useState<string>();
  const worker = useRef<WorkerLike | undefined>(undefined);
  const generation = useRef(0);
  const pending = useRef(new Set<string>());
  const projectRef = useRef(project);
  projectRef.current = project;
  const current = PYTHON_STEPS[step]!;
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  const source = useMemo(
    () => PYTHON_STEPS.map((x) => code[x.id] ?? "").join("\n"),
    [code],
  );

  async function persist(next = step) {
    const now = new Date().toISOString();
    const draft = {
      recordKind: "python-analysis-draft",
      schemaVersion: 1,
      currentStep: next,
      codeByStep: code,
      completedStepIds: PYTHON_STEPS.slice(0, next).map((x) => x.id),
      hintLevelByStep: hints,
      supportLevel: support,
      lastErrorCode: error ? "validation" : null,
      referencedGuiResultId: guiResult.runId,
      recipeId: guiResult.recipeId,
      contextFingerprint: context,
      numericalContract: {
        id: ANALYSIS_NUMERICAL_CONTRACT_V1.id,
        version: ANALYSIS_NUMERICAL_CONTRACT_V1.version,
      },
      template: PYTHON_TEMPLATE_META,
      updatedAt: now,
    } as const;
    const outputs = projectRef.current.analysisOutputs.filter(
      (x) =>
        !(
          isPythonAnalysisDraft(x) &&
          x.referencedGuiResultId === guiResult.runId &&
          x.contextFingerprint === context
        ),
    );
    return onSave({
      ...projectRef.current,
      analysisOutputs: [...outputs, draft],
      updatedAt: now,
    });
  }
  function handleMessage(event: MessageEvent) {
    const parsed = PythonResponseSchema.safeParse(event.data);
    if (!parsed.success) return;
    const message = parsed.data;
    if (
      message.workerGeneration !== generation.current ||
      !pending.current.has(message.requestId)
    )
      return;
    if (message.type === "status") {
      setPhase(message.payload.message);
      if (["ready", "complete", "error"].includes(message.payload.phase))
        pending.current.delete(message.requestId);
    }
    if (message.type === "output")
      setOutput((x) => ({
        ...x,
        [message.payload.stream]: message.payload.text,
      }));
    if (message.type === "validation-error") {
      setError(message.payload.messages.join(" "));
      setPhase("検証エラー");
      pending.current.delete(message.requestId);
    }
    if (message.type === "error") {
      setError(
        "Python実行中に問題が起きました。コードと入力を確認してください。 " +
          message.payload.message,
      );
      setTraceback(message.payload.traceback ?? "");
      setPhase("エラー");
      pending.current.delete(message.requestId);
    }
    if (message.type === "result") {
      pending.current.delete(message.requestId);
      setResult(message.payload);
      setOutput({
        stdout: message.payload.stdout.text,
        stderr: message.payload.stderr.text,
      });
      compare(message.payload);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(message.payload.imageBytes)], {
          type: "image/png",
        }),
      );
      setImageUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    }
  }
  function prepare() {
    worker.current?.terminate();
    generation.current++;
    pending.current.clear();
    setResult(undefined);
    setError("");
    setTraceback("");
    setImageUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return undefined;
    });
    const instance = workerFactory();
    worker.current = instance;
    instance.onmessage = handleMessage;
    const requestId = crypto.randomUUID();
    pending.current.add(requestId);
    instance.postMessage({
      protocolVersion: PYTHON_PROTOCOL_VERSION,
      workerGeneration: generation.current,
      requestId,
      type: "prepare",
      payload: {},
    });
    setPhase("Python実行環境を読み込み中");
  }
  function stop() {
    worker.current?.terminate();
    worker.current = undefined;
    generation.current++;
    pending.current.clear();
    setPhase("停止済み");
    setImageUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return undefined;
    });
  }
  function compare(python: PythonResultPayload) {
    const rows: ParityRow[] = [];
    const gui = guiResult.snapshots as SavedSnapshot[];
    if (
      gui.map((x) => x.id).join("|") !==
      python.snapshots.map((x) => x.id).join("|")
    )
      rows.push({
        label: "スナップショットIDと順序",
        gui: 0,
        python: 1,
        absoluteDifference: 1,
        tolerance: 0,
        matches: false,
      });
    gui.forEach((g, i) => {
      const p = python.snapshots[i];
      if (!p) return;
      for (const [label, gv, pv] of [
        ["入力平均", g.inputMean, p.inputMean],
        ["規格化後の平均", g.normalizedMean, p.normalizedMean],
        ["密度コントラストの平均", g.contrastMean, p.contrastMean],
        ["σδ", g.sigmaDelta, p.sigmaDelta],
      ] as const)
        rows.push(compareNumber(`${g.id}: ${label}`, gv, pv));
      const guiDense = [
        g.baselineDenseFraction,
        ...g.sensitivityDenseFractions,
      ];
      p.dense.forEach((d) => {
        const gd = guiDense.find((x) => x.threshold === d.threshold);
        if (gd) {
          rows.push({
            label: `${g.id}: q≥${d.threshold} セル数`,
            gui: gd.count,
            python: d.count,
            absoluteDifference: Math.abs(gd.count - d.count),
            tolerance: 0,
            matches: gd.count === d.count,
          });
          rows.push(
            compareNumber(
              `${g.id}: q≥${d.threshold} 割合`,
              gd.fraction,
              d.fraction,
            ),
          );
        }
      });
      g.histogram.counts.forEach((v, bin) => {
        rows.push({
          label: `${g.id}: ビン${bin + 1}セル数`,
          gui: v,
          python: p.histogramCounts[bin]!,
          absoluteDifference: Math.abs(v - p.histogramCounts[bin]!),
          tolerance: 0,
          matches: v === p.histogramCounts[bin],
        });
        rows.push(
          compareNumber(
            `${g.id}: ビン${bin + 1}割合`,
            g.histogram.fractions[bin]!,
            p.histogramFractions[bin]!,
          ),
        );
      });
    });
    const figures = project.figures.filter(
      (x) =>
        typeof x === "object" &&
        x !== null &&
        (x as { runId?: string }).runId === guiResult.runId,
    );
    const kinds = figures
      .map((x) => (x as { figureKind?: string }).figureKind)
      .filter(Boolean)
      .sort();
    const actual = [...python.figureMetadata.figureKinds].sort();
    if (JSON.stringify(kinds) !== JSON.stringify(actual))
      rows.push({
        label: "図種とメタデータ",
        gui: 0,
        python: 1,
        absoluteDifference: 1,
        tolerance: 0,
        matches: false,
      });
    setParity(rows);
  }
  async function run() {
    if (!worker.current || phase !== "準備完了" || pending.current.size) return;
    const issues = validateEducationalPython(source);
    if (issues.length) {
      setError(issues.join(" "));
      return;
    }
    setError("");
    setOutput({ stdout: "", stderr: "" });
    try {
      const loaded = await reloadResultPackage(
        project.resultPackage as Extract<
          ProjectState["resultPackage"],
          { refKind: "bound" }
        >,
      );
      const wanted = new Set(recipe.recipe.input.snapshotIds);
      const inventory = new Map(
        loaded.manifest.snapshots.map((x) => [x.id, x]),
      );
      const snapshots = loaded.snapshots
        .filter((x) => wanted.has(x.id))
        .map((x) => ({
          id: x.id,
          scaleFactor: inventory.get(x.id)!.scaleFactor,
          redshift: inventory.get(x.id)!.redshift,
          width: loaded.manifest.grid.width,
          height: loaded.manifest.grid.height,
          density: Float64Array.from(x.values),
        }))
        .sort((a, b) => a.scaleFactor - b.scaleFactor);
      const figures = project.figures.filter(
        (x) =>
          typeof x === "object" &&
          x !== null &&
          (x as { runId?: string }).runId === guiResult.runId,
      );
      const figureKinds = figures.map(
        (x) =>
          (
            x as {
              figureKind:
                | "density-panels"
                | "histogram"
                | "sigma-growth"
                | "dense-growth";
            }
          ).figureKind,
      );
      const displayMode =
        (
          figures.find(
            (x) =>
              (x as { figureKind?: string }).figureKind === "density-panels",
          ) as { displayMode?: "comparison" | "structure" } | undefined
        )?.displayMode ?? "comparison";
      const requestId = crypto.randomUUID();
      pending.current.add(requestId);
      worker.current.postMessage(
        {
          protocolVersion: PYTHON_PROTOCOL_VERSION,
          workerGeneration: generation.current,
          requestId,
          type: "run",
          payload: {
            source,
            input: {
              snapshots,
              sharedHistogramEdges: guiResult.commonHistogramBoundaries,
              denseThreshold: 2,
              sensitivityThresholds: [1.5, 2, 3],
              numericalContract: {
                id: ANALYSIS_NUMERICAL_CONTRACT_V1.id,
                version: ANALYSIS_NUMERICAL_CONTRACT_V1.version,
              },
              figureSpec: {
                figureKinds,
                displayMode,
                colorMap: "cividis",
                axes: figures.map((x) =>
                  JSON.stringify((x as { axes?: unknown }).axes ?? {}),
                ),
              },
            },
          },
        },
        snapshots.map((x) => x.density.buffer),
      );
      setPhase("実行中");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "解析入力を読み込めませんでした。",
      );
    }
  }
  async function complete() {
    if (
      !result ||
      parity.some((x) => !x.matches) ||
      meaning !== "reproduction"
    ) {
      setError(
        meaning && meaning !== "reproduction"
          ? "Mira: 一致が示すのは実装の再現性です。仮説や物理的解釈の正しさを証明したわけではありません。もう一度選んでください。"
          : "全項目の一致と最終判断を確認してから完了してください。",
      );
      return;
    }
    const now = new Date().toISOString();
    const completed = {
      recordKind: "python-assisted-analysis-result",
      schemaVersion: 1,
      recordId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      referencedGuiResultId: guiResult.runId,
      recipeId: recipe.recipeId,
      provenance: {
        ...recipe.context,
        dataVersion: guiResult.dataVersion,
        fixtureVersion: guiResult.fixtureVersion,
      },
      contextFingerprint: context,
      requestedMode: recipe.modeDecision.modeId,
      supportLevel: support,
      executedEngine: "pyodide-python",
      runtime: result.runtime,
      workerProtocolVersion: PYTHON_PROTOCOL_VERSION,
      numericalContract: ANALYSIS_NUMERICAL_CONTRACT_V1,
      template: PYTHON_TEMPLATE_META,
      completedCode: source,
      codeHash: await crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(source))
        .then((x) =>
          Array.from(new Uint8Array(x), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
        ),
      snapshots: result.snapshots,
      histogramCounts: result.snapshots.map((x) => ({
        id: x.id,
        counts: x.histogramCounts,
      })),
      figureSpec: result.figureMetadata,
      figureSeries: result.figureSeries,
      parityRows: parity,
      tolerance: ANALYSIS_NUMERICAL_CONTRACT_V1.futureParityTolerance,
      finalJudgement: meaning,
      createdAt: now,
      completedAt: now,
    };
    const ok = await onSave({
      ...projectRef.current,
      analysisOutputs: [...projectRef.current.analysisOutputs, completed],
      updatedAt: now,
    });
    if (ok) {
      setPhase("Python解析の完了結果を保存しました");
      setError("");
    } else setError("保存できなかったため、Python解析を完了しませんでした。");
  }
  const choices = orderChoices(
    [
      {
        id: "reproduction",
        label: "同じデータと定義から、二つの実装で同じ数値を再現できた",
      },
      { id: "hypothesis", label: "仮説が証明された" },
      { id: "interpretation", label: "物理的解釈が正しいことを証明した" },
    ],
    { kind: "stable-shuffle", orderVersion: 1 },
    {
      choiceOrderSeed: project.choiceOrderSeed,
      themeId: project.themeId,
      groupId: "python-parity-meaning",
    },
  );
  return (
    <article className="python-analysis-workspace">
      <p className="eyebrow">S11 / 任意の発展</p>
      <h2 tabIndex={-1}>Pythonで同じ解析を確かめる（発展）</h2>
      <p>
        NumPyで同じ数値を計算し、Matplotlib（Agg）で図を作ります。Pythonが利用できなくてもGUI結果は保持されます。
      </p>
      <p>
        <strong>教材用コード範囲:</strong> Web
        Workerは完全なセキュリティsandboxではありません。秘密情報や出所不明のコードを貼り付けないでください。
      </p>
      <label>
        Miraの支援水準{" "}
        <select
          value={support}
          onChange={(e) =>
            setSupport(e.target.value as keyof typeof SUPPORT_LABELS)
          }
        >
          {Object.entries(SUPPORT_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p role="status">状態: {phase}</p>
      {[
        "未準備",
        "停止済み",
        "エラー",
        "保存済み結果（図は必要時に再実行）",
      ].includes(phase) && (
        <button className="primary" onClick={prepare}>
          Python環境を準備する
        </button>
      )}{" "}
      {worker.current && <button onClick={stop}>停止</button>}{" "}
      <button onClick={prepare}>Python環境を再起動する</button>
      <ol className="analysis-step-list">
        {PYTHON_STEPS.map((x, i) => (
          <li key={x.id} aria-current={i === step ? "step" : undefined}>
            {i + 1}. {x.title}
          </li>
        ))}
      </ol>
      <aside className="mira-analysis">
        <strong>Mira（研究パートナー）</strong>
        <p>
          私と数式、変数、二つの実装の違いを確認します。ここでは結果の解釈を先取りしません。
        </p>
      </aside>
      <h3>{current.title}</h3>
      <label htmlFor={`python-${current.id}`}>学生が編集する短いコード</label>
      <textarea
        id={`python-${current.id}`}
        className="python-code"
        rows={4}
        value={code[current.id]}
        onChange={(e) => setCode({ ...code, [current.id]: e.target.value })}
      />
      <button onClick={() => setCode({ ...code, [current.id]: current.code })}>
        完成版の正規テンプレートへ戻す
      </button>
      <button
        onClick={() =>
          setHints({
            ...hints,
            [current.id]: Math.min(6, (hints[current.id] ?? 0) + 1),
          })
        }
      >
        ヒントをもう一段見る
      </button>
      {(hints[current.id] ?? 0) > 0 && (
        <p>
          <strong>ヒント {hints[current.id]}/6:</strong>{" "}
          {HINT_DETAILS[(hints[current.id] ?? 1) - 1]}
        </p>
      )}
      {step < 9 && (
        <button
          className="primary"
          onClick={() =>
            void (async () => {
              const issues = validateEducationalPython(code[current.id] ?? "");
              if (issues.length) {
                setError(issues.join(" "));
                return;
              }
              const next = step + 1;
              if (await persist(next)) {
                setStep(next);
                setError("");
              }
            })()
          }
        >
          次の段階へ
        </button>
      )}
      <button
        className="primary"
        disabled={phase !== "準備完了" || pending.current.size > 0}
        onClick={() => void run()}
      >
        解析コードを実行する
      </button>
      {output.stdout && (
        <section>
          <h3>stdout</h3>
          <pre>{output.stdout}</pre>
        </section>
      )}
      {output.stderr && (
        <section>
          <h3>stderr</h3>
          <pre>{output.stderr}</pre>
        </section>
      )}
      {imageUrl && (
        <figure>
          <img
            src={imageUrl}
            alt="PythonがMatplotlibで生成した標準偏差と高密度セル割合の図"
          />
          <figcaption>
            画像自体は保存せず、図に渡した系列と仕様を照合します。
          </figcaption>
        </figure>
      )}
      {parity.length > 0 && (
        <section>
          <h3>GUI / Python 一致表</h3>
          <p>
            {parity.every((x) => x.matches)
              ? "全項目が一致しました。"
              : "不一致の項目があります。完了できません。"}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>量</th>
                  <th>GUI値</th>
                  <th>Python値</th>
                  <th>絶対差</th>
                  <th>許容値</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {parity.map((x, i) => (
                  <tr key={`${x.label}-${i}`}>
                    <th>{x.label}</th>
                    <td>{x.gui}</td>
                    <td>{x.python}</td>
                    <td>{x.absoluteDifference}</td>
                    <td>{x.tolerance}</td>
                    <td>{x.matches ? "一致" : "不一致"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {step === 9 && (
        <fieldset>
          <legend>二つの実装の一致が何を確かめますか</legend>
          {choices.map((choice) => (
            <label key={choice.id}>
              <input
                type="radio"
                name="meaning"
                value={choice.id}
                checked={meaning === choice.id}
                onChange={() => setMeaning(choice.id)}
              />
              {choice.label}
            </label>
          ))}
        </fieldset>
      )}
      {error && <p role="alert">{error}</p>}
      {traceback && (
        <details>
          <summary>tracebackを確認する</summary>
          <pre>{traceback}</pre>
        </details>
      )}
      <button
        className="primary"
        disabled={!result || parity.some((x) => !x.matches) || !meaning}
        onClick={() => void complete()}
      >
        Python解析を完了して保存する
      </button>
      <button onClick={onBack}>操作による解析結果へ戻る</button>
      <p>次は結果を解釈します（S12で実装）。</p>
      {saved && (
        <details>
          <summary>保存済みPython結果をPyodideなしで確認する</summary>
          <pre>
            {JSON.stringify(
              {
                runtime: saved.runtime,
                snapshots: saved.snapshots,
                parityRows: saved.parityRows,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </article>
  );
}
