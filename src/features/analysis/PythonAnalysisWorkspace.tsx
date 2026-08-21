import { useEffect, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { orderChoices } from "../../domain/choiceOrder";
import { PYTHON_PROTOCOL_VERSION } from "./pythonConfig";
import { PythonResponseSchema } from "./pythonProtocol";
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
const HINTS = [
  "考え方のヒント",
  "次に必要な処理",
  "関係する行や変数",
  "エラーの平易な説明",
  "修正候補",
  "動く完成例",
];

export function PythonAnalysisWorkspace({
  project,
  guiResult,
  onSave,
  onBack,
  workerFactory = defaultFactory,
}: {
  project: ProjectState;
  guiResult: { runId: string; recipeId: string };
  onSave: (project: ProjectState) => Promise<boolean>;
  onBack: () => void;
  workerFactory?: PythonWorkerFactory;
}) {
  const existing = [...project.analysisOutputs]
    .reverse()
    .find(
      (x) =>
        typeof x === "object" &&
        x !== null &&
        (x as { recordKind?: string }).recordKind === "python-analysis-draft",
    ) as
    | {
        currentStep?: number;
        codeByStep?: Record<string, string>;
        hintLevelByStep?: Record<string, number>;
        supportLevel?: string;
      }
    | undefined;
  const [step, setStep] = useState(existing?.currentStep ?? 0);
  const [code, setCode] = useState<Record<string, string>>(
    existing?.codeByStep ??
      Object.fromEntries(PYTHON_STEPS.map((x) => [x.id, x.code])),
  );
  const [hints, setHints] = useState<Record<string, number>>(
    existing?.hintLevelByStep ?? {},
  );
  const [support, setSupport] = useState(
    existing?.supportLevel ?? "初めて学ぶ",
  );
  const [phase, setPhase] = useState("未準備");
  const [error, setError] = useState("");
  const worker = useRef<WorkerLike | undefined>(undefined);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = PYTHON_STEPS[step]!;
  useEffect(() => () => worker.current?.terminate(), []);
  async function persist(next = step) {
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
      contextFingerprint: `${guiResult.runId}:${PYTHON_TEMPLATE_META.version}`,
      numericalContract: {
        id: "abcs-analysis-numerical-contract",
        version: "1.0.0",
      },
      template: PYTHON_TEMPLATE_META,
      updatedAt: new Date().toISOString(),
    };
    const outputs = project.analysisOutputs.filter(
      (x) =>
        !(
          typeof x === "object" &&
          x !== null &&
          (x as { recordKind?: string }).recordKind === "python-analysis-draft"
        ),
    );
    return onSave({
      ...project,
      analysisOutputs: [...outputs, draft],
      updatedAt: draft.updatedAt,
    });
  }
  function prepare() {
    worker.current?.terminate();
    generation.current += 1;
    const instance = workerFactory();
    worker.current = instance;
    const requestId = crypto.randomUUID();
    instance.onmessage = (event) => {
      const parsed = PythonResponseSchema.safeParse(event.data);
      if (
        !parsed.success ||
        parsed.data.workerGeneration !== generation.current ||
        parsed.data.requestId !== requestId
      )
        return;
      if (parsed.data.type === "status") setPhase(parsed.data.payload.message);
      if (parsed.data.type === "error") {
        setPhase("エラー");
        setError(parsed.data.payload.message);
      }
    };
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
    generation.current += 1;
    setPhase("停止済み");
  }
  const choices = orderChoices(
    [
      { id: "reproduction", label: "同じデータと定義で同じ数値を再現できた" },
      { id: "hypothesis", label: "仮説が正しいと証明できた" },
      { id: "interpretation", label: "密度むらが成長したと結論できた" },
    ],
    { kind: "stable-shuffle", orderVersion: 1 },
    {
      choiceOrderSeed: project.choiceOrderSeed,
      themeId: project.themeId,
      groupId: current.id,
    },
  );
  return (
    <article className="python-analysis-workspace">
      <p className="eyebrow">S11 / 任意の発展</p>
      <h2 ref={heading} tabIndex={-1}>
        Pythonで同じ解析を確かめる（発展）
      </h2>
      <p>
        NumPy・Matplotlibを使う20～30分の段階式体験です。Pythonが利用できなくても操作による解析結果は保持され、研究を続けられます。
      </p>
      <p>
        <strong>教材用コード範囲:</strong>{" "}
        完全なセキュリティsandboxではありません。秘密情報や出所不明のコードを貼り付けないでください。
      </p>
      <label>
        {" "}
        Miraの支援水準{" "}
        <select value={support} onChange={(e) => setSupport(e.target.value)}>
          <option>初めて学ぶ</option>
          <option>基礎経験あり</option>
          <option>自分で考えて書きたい</option>
        </select>
      </label>
      <p role="status" aria-live="polite">
        状態: {phase}
      </p>
      {phase === "未準備" || phase === "停止済み" || phase === "エラー" ? (
        <button className="primary" onClick={prepare}>
          Python環境を準備する
        </button>
      ) : null}
      {worker.current ? <button onClick={stop}>停止</button> : null}
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
          私と、今明らかにする量、その処理が必要な理由、数式と変数の対応を順に確認します。ここでは結果の解釈を先取りしません。
        </p>
      </aside>
      <h3>{current.title}</h3>
      <label htmlFor={`python-${current.id}`}>学生が編集する短いコード</label>
      <textarea
        id={`python-${current.id}`}
        spellCheck={false}
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
          ヒント {hints[current.id]}/6: {HINTS[(hints[current.id] ?? 1) - 1]}
        </p>
      )}
      {step === 9 && (
        <fieldset>
          <legend>二つの実装の一致が何を確かめますか</legend>
          {choices.map((choice) => (
            <label key={choice.id}>
              <input type="radio" name="meaning" value={choice.id} />
              {choice.label}
            </label>
          ))}
        </fieldset>
      )}
      {error && <p role="alert">{error}</p>}
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
                window.scrollTo({ top: 0 });
                requestAnimationFrame(() => heading.current?.focus());
              }
            })()
          }
        >
          次の段階へ
        </button>
      )}
      <button onClick={onBack}>操作による解析結果へ戻る</button>
      <p>次は結果を解釈します（S12で実装）。</p>
    </article>
  );
}
