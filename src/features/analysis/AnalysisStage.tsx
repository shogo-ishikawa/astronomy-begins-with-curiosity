import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import {
  reloadResultPackage,
  type RuntimeResultPackage,
  type SnapshotId,
  type BoundResultPackageRef,
} from "../execution/logic";
import { canEnterAnalysis, latestQuality } from "./logic";
import {
  ANALYSIS_NUMERICAL_CONTRACT_V1,
  analyzeDensity,
  commonHistogramBoundaries,
  histogram,
  sortByScaleFactor,
  type SnapshotStatistics,
} from "./numerical";

type RuntimeAnalysis = {
  id: SnapshotId;
  redshift: number;
  scaleFactor: number;
  values: Float32Array;
  statistics: SnapshotStatistics;
  histogram: ReturnType<typeof histogram>;
};
type DisplayMode = "comparison" | "structure";
const STEPS = [
  "解析レシピと計算前の予想を確認",
  "データを読み込む",
  "平均を確かめる",
  "密度コントラストを作る",
  "ヒストグラムで分布を比べる",
  "標準偏差と高密度割合を計算する",
  "主図と補助図を確認して保存する",
];
const STEP_MIRA = [
  "私と、保存した予想と解析レシピを先に確認します。結果の傾向はまだ決めません。研究課題と証拠を対応させますが、この確認だけで仮説の正誤は決まりません。",
  "選択した密度グリッドだけを読み込みます。データサイエンスの入力検証に当たり、読み込みだけでは物理的な結論は出せません。",
  "有限な計算箱と二次元投影グリッドの平均を計算します。大学数学の総和を使いますが、宇宙全体の厳密な平均密度ではありません。",
  "平均で再規格化して δ=q−1 を作ります。相対的なずれを証拠にできますが、絶対密度や星形成は分かりません。",
  "30個の共通ビンで分布を比べます。確率・統計の度数分布につながりますが、形の原因までは結論できません。",
  "母集団の σδ と q≥2のセル割合を計算します。要約値は比較に役立ちますが、高密度セルは銀河やハローそのものではありません。",
  "主図と補助図の来歴を保存します。図が示す事実だけをキャプションにし、解釈と結論は次の段階で学生が考えます。",
];
const TERM_LABELS: Record<string, string> = {
  "mean-density": "平均密度",
  "normalized-density": "規格化密度",
  "density-contrast": "密度コントラスト",
  "grid-cell": "グリッドセル",
  histogram: "ヒストグラム",
  bin: "ビン（階級）",
  "standard-deviation": "標準偏差",
  population: "母集団",
  "dense-cell-fraction": "高密度セルの割合",
  threshold: "閾値",
  "sensitivity-analysis": "感度分析",
  "color-scale": "カラースケール",
  "comparison-mode": "比較モード",
  "structure-mode": "構造確認モード",
  "scale-factor": "スケール因子",
  redshift: "赤方偏移",
};

type AnalysisDraftRecord = {
  recordKind: "analysis-run-draft";
  recipeId: string;
  completedLearningStep: number;
};
function isAnalysisDraft(value: unknown): value is AnalysisDraftRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "recordKind" in value &&
    (value as { recordKind?: unknown }).recordKind === "analysis-run-draft" &&
    "recipeId" in value
  );
}

function activeRecipe(project: ProjectState) {
  return project.analysisRecipes.find(
    (record) => record.recipeId === project.activeAnalysisRecipeId,
  );
}

function DensityCanvas({
  item,
  range,
  mode,
}: {
  item: RuntimeAnalysis;
  range: [number, number];
  mode: DisplayMode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = context.createImageData(128, 128);
    const local =
      mode === "structure"
        ? ([
            Math.min(...item.statistics.normalized),
            Math.max(...item.statistics.normalized),
          ] as [number, number])
        : range;
    item.statistics.normalized.forEach((value, index) => {
      const t = Math.max(
        0,
        Math.min(1, (value - local[0]) / (local[1] - local[0] || 1)),
      );
      image.data[index * 4] = 35 + 218 * t;
      image.data[index * 4 + 1] = 45 + 185 * Math.sqrt(t);
      image.data[index * 4 + 2] = 100 - 65 * t;
      image.data[index * 4 + 3] = 255;
    });
    context.putImageData(image, 0, 0);
  }, [item, mode, range]);
  return (
    <figure className="density-figure">
      <canvas
        ref={ref}
        width="128"
        height="128"
        role="img"
        aria-label={`${item.id}の再規格化密度画像`}
        aria-describedby={`density-desc-${item.id}`}
      />
      <figcaption id={`density-desc-${item.id}`}>
        {item.id}、a={item.scaleFactor.toFixed(4)}、z={item.redshift}。表示量
        q。
        {mode === "comparison"
          ? "全時刻共通"
          : "時刻ごと（色の時刻間比較不可）"}
        のカラースケール {range[0].toFixed(3)}–{range[1].toFixed(3)}。
      </figcaption>
    </figure>
  );
}

function LineChart({
  items,
  kind,
  threshold,
}: {
  items: RuntimeAnalysis[];
  kind: "sigma" | "dense";
  threshold: number;
}) {
  const values = items.map((item) =>
    kind === "sigma"
      ? item.statistics.sigmaDelta
      : item.statistics.denseFractions.find((x) => x.threshold === threshold)!
          .fraction,
  );
  const max = Math.max(...values, Number.EPSILON);
  const points = values
    .map(
      (value, index) =>
        `${55 + index * (430 / Math.max(1, values.length - 1))},${190 - (value / max) * 145}`,
    )
    .join(" ");
  return (
    <svg className="analysis-chart" viewBox="0 0 520 235" role="img">
      <title>
        {kind === "sigma"
          ? "スケール因子と密度コントラストの標準偏差"
          : "スケール因子と高密度セルの割合"}
      </title>
      <desc>
        左からスケール因子の昇順。各点の値は直後の表でも確認できます。
      </desc>
      <path d="M55 25V190H495 M55 190H495" className="chart-axis" />
      <polyline points={points} className="chart-line" fill="none" />
      {points.split(" ").map((point, index) => {
        const [x, y] = point.split(",");
        return (
          <g key={items[index]!.id}>
            <circle cx={x} cy={y} r="5" />
            <text x={x} y={Number(y) - 9} textAnchor="middle">
              {index + 1}
            </text>
          </g>
        );
      })}
      <text x="275" y="225" textAnchor="middle">
        スケール因子 a（左から現在へ）
      </text>
    </svg>
  );
}

function HistogramChart({
  items,
  threshold,
}: {
  items: RuntimeAnalysis[];
  threshold: number;
}) {
  const maximum = Math.max(
    ...items.flatMap((item) => item.histogram.fractions),
  );
  const boundaries = items[0]!.histogram.boundaries;
  const x = (value: number) =>
    55 +
    ((value - boundaries[0]!) / (boundaries.at(-1)! - boundaries[0]!)) * 430;
  return (
    <svg className="analysis-chart" viewBox="0 0 520 235" role="img">
      <title>密度コントラストの共通ビンヒストグラム</title>
      <desc>
        30個の共通境界によるセル割合。線種、番号、表でも系列を識別できます。
      </desc>
      <path d="M55 25V190H495 M55 190H495" className="chart-axis" />
      {items.map((item, series) => {
        const points = item.histogram.fractions
          .map(
            (value, index) =>
              `${55 + ((index + 0.5) * 430) / 30},${190 - (value / maximum) * 150}`,
          )
          .join(" ");
        return (
          <g key={item.id}>
            <polyline
              points={points}
              fill="none"
              className={`chart-line series-${series % 3}`}
            />
            <text x="470" y={35 + series * 16}>
              {series + 1}: {item.id}
            </text>
          </g>
        );
      })}
      <line
        x1={x(threshold - 1)}
        x2={x(threshold - 1)}
        y1="25"
        y2="190"
        className="threshold-line"
      />
      <text x="275" y="225" textAnchor="middle">
        密度コントラスト δ
      </text>
      <text transform="translate(14 130) rotate(-90)">セルの割合</text>
    </svg>
  );
}

export function AnalysisStage({
  project,
  onSave,
  onBack,
  onReacquire,
  onGlossary,
}: {
  project: ProjectState;
  onSave: (project: ProjectState) => Promise<boolean>;
  onBack: () => void;
  onReacquire: () => void;
  onGlossary: (id: string) => void;
}) {
  const recipe = activeRecipe(project);
  const guard = canEnterAnalysis(project);
  const [step, setStep] = useState(() => {
    const draft = [...project.analysisOutputs]
      .reverse()
      .find(
        (x): x is AnalysisDraftRecord =>
          isAnalysisDraft(x) && x.recipeId === recipe?.recipeId,
      );
    return (draft?.completedLearningStep ?? 0) > 1
      ? 1
      : (draft?.completedLearningStep ?? 0);
  });
  const [runtime, setRuntime] = useState<RuntimeResultPackage>();
  const [items, setItems] = useState<RuntimeAnalysis[]>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<DisplayMode>("comparison");
  const [threshold, setThreshold] = useState(2);
  const [sensitivity, setSensitivity] = useState<number[]>([]);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  const range = useMemo<[number, number]>(
    () =>
      items
        ? [
            Math.min(...items.flatMap((x) => x.statistics.normalized)),
            Math.max(...items.flatMap((x) => x.statistics.normalized)),
          ]
        : [0, 1],
    [items],
  );
  if (!guard.canEnter || !recipe || project.resultPackage?.refKind !== "bound")
    return (
      <article>
        <h2 id="stage-title" tabIndex={-1}>
          S11 データを解析し、図を作る
        </h2>
        <p role="alert">
          {guard.reason ?? "現行の結果パッケージを確認できません。"}
        </p>
        <button onClick={onBack}>S10 解析レシピへ戻る</button>
        <button onClick={onReacquire}>S08 データ取得へ戻る</button>
      </article>
    );
  async function saveDraft(nextStep: number) {
    const now = new Date().toISOString();
    const retained = project.analysisOutputs.filter(
      (x) => !(isAnalysisDraft(x) && x.recipeId === recipe!.recipeId),
    );
    await onSave({
      ...project,
      analysisOutputs: [
        ...retained,
        {
          recordKind: "analysis-run-draft",
          schemaVersion: 1,
          runId: `draft-${recipe!.recipeId}`,
          recipeId: recipe!.recipeId,
          completedLearningStep: nextStep,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    });
  }
  async function load() {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setStatus("データを読み込んでいます…");
    try {
      const loaded = await reloadResultPackage(
        project.resultPackage as BoundResultPackageRef,
        import.meta.env.BASE_URL,
        fetch,
        abort.signal,
      );
      const wanted = new Set(recipe!.recipe.input.snapshotIds);
      const selected = loaded.snapshots.filter((x) => wanted.has(x.id));
      if (selected.length !== wanted.size)
        throw new Error(
          "解析レシピの全スナップショットを読み込めませんでした。",
        );
      const preliminary = selected.map((snapshot) => ({
        ...snapshot,
        statistics: analyzeDensity(
          snapshot.values,
          loaded.manifest.grid.width * loaded.manifest.grid.height,
        ),
      }));
      const boundaries = commonHistogramBoundaries(
        preliminary.map((x) => x.statistics.contrast),
      );
      const inventory = new Map(
        loaded.manifest.snapshots.map((x) => [x.id, x]),
      );
      setItems(
        sortByScaleFactor(
          preliminary.map((x) => ({
            ...x,
            ...inventory.get(x.id)!,
            histogram: histogram(x.statistics.contrast, boundaries),
          })),
        ),
      );
      setRuntime(loaded);
      setStep(2);
      await saveDraft(2);
      setStatus("選択したデータを再検証して読み込みました。");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
        setStatus("");
      }
    }
  }
  async function advance() {
    const next = Math.min(6, step + 1);
    setStep(next);
    await saveDraft(next);
  }
  const caption =
    items && runtime
      ? `DEMO / synthetic fixture。暗黒物質のみの教育用データ。${items.map((x) => `${x.id} (a=${x.scaleFactor.toFixed(4)}, z=${x.redshift})`).join("、")}。表示量は再規格化密度 q、密度コントラスト δ。ヒストグラムは30ビンの共通境界 [${items[0]!.histogram.boundaries[0]!.toFixed(4)}, ${items[0]!.histogram.boundaries.at(-1)!.toFixed(4)}]。カラースケールは${mode === "comparison" ? "全時刻共通の比較モード" : "時刻別の構造確認モード（色の時刻間比較不可）"}。高密度セルは q >= ${threshold}。データ版 ${runtime.manifest.dataVersion}、fixture版 ${runtime.manifest.payload.fixtureVersion}、解析レシピ版 ${recipe.versionNumber}。`
      : "";
  async function complete() {
    if (!items || !runtime) return;
    const requiresSensitivity =
      recipe!.recipe.measurements.primaryMeasurementId === "dense-fraction" ||
      recipe!.recipe.figures.primaryFigureId === "dense-growth";
    if (requiresSensitivity && !sensitivity.some((x) => x !== 2)) {
      setError(
        "高密度割合が主解析のため、1.5または3.0の感度比較を一つ以上選んでください。",
      );
      return;
    }
    if (
      recipe!.recipe.figures.primaryFigureId === "density-panels" &&
      recipe!.recipe.figures.sharedColorRange &&
      mode !== "comparison"
    ) {
      setError(
        "解析レシピが共通カラースケールを要求するため、主図は比較モードで保存してください。",
      );
      return;
    }
    const now = new Date().toISOString();
    const runId = crypto.randomUUID();
    const quality = latestQuality(project)!;
    const output = {
      recordKind: "guided-analysis-result",
      schemaVersion: 1,
      runId,
      createdAt: now,
      completedAt: now,
      recipeId: recipe!.recipeId,
      recipeVersion: recipe!.versionNumber,
      scientificDefinitionFingerprint: recipe!.scientificDefinitionFingerprint,
      setupFingerprint: recipe!.setupFingerprint,
      planVersionId: recipe!.context.planVersionId,
      packageId: recipe!.context.packageId,
      acquisitionFingerprint: recipe!.context.acquisitionFingerprint,
      qualityRecordId: quality.recordId,
      qualityFingerprint: quality.contextFingerprint,
      dataVersion: runtime.manifest.dataVersion,
      fixtureVersion: runtime.manifest.payload.fixtureVersion,
      requestedModeId: recipe!.modeDecision.modeId,
      executedEngine: "typescript",
      engineVersion: "ecmascript-number-v1",
      numericalContract: ANALYSIS_NUMERICAL_CONTRACT_V1,
      snapshots: items.map((x) => ({
        id: x.id,
        redshift: x.redshift,
        scaleFactor: x.scaleFactor,
        inputMean: x.statistics.inputMean,
        normalizedMean: x.statistics.normalizedMean,
        contrastMean: x.statistics.contrastMean,
        sigmaDelta: x.statistics.sigmaDelta,
        histogram: x.histogram,
        baselineDenseFraction: x.statistics.denseFractions[1],
        sensitivityDenseFractions: x.statistics.denseFractions.filter((d) =>
          sensitivity.includes(d.threshold),
        ),
      })),
      commonHistogramBoundaries: items[0]!.histogram.boundaries,
      sensitivityThresholds: sensitivity,
      completedLearningSteps: STEPS,
    };
    const figureIds = [
      recipe!.recipe.figures.primaryFigureId,
      ...recipe!.recipe.figures.supportingFigureIds,
    ];
    const figures = figureIds.map((kind, index) => ({
      recordKind: "scientific-figure",
      schemaVersion: 1,
      figureId: crypto.randomUUID(),
      runId,
      recipeId: recipe!.recipeId,
      figureKind: kind,
      title:
        kind === "density-panels"
          ? "再規格化密度"
          : kind === "sigma-growth"
            ? "密度コントラストの標準偏差"
            : kind === "dense-growth"
              ? "高密度セルの割合"
              : "密度コントラストのヒストグラム",
      role: index === 0 ? "primary" : "supporting",
      snapshotIds: items.map((x) => x.id),
      displayMode: mode,
      axes:
        kind === "histogram"
          ? { x: "density contrast delta", y: "cell fraction" }
          : {
              x: "scale factor a",
              y:
                kind === "dense-growth" ? "dense cell fraction" : "sigma delta",
            },
      colorMap: kind === "density-panels" ? "cividis-like" : null,
      displayRange: kind === "density-panels" ? range : null,
      denseThreshold: { operator: ">=", q: threshold, delta: threshold - 1 },
      createdAt: now,
      caption,
      provenance: {
        demo: true,
        physics: "collisionless-dark-matter-only",
        dataVersion: runtime.manifest.dataVersion,
        fixtureVersion: runtime.manifest.payload.fixtureVersion,
      },
    }));
    const retained = project.analysisOutputs.filter(
      (x) => !(isAnalysisDraft(x) && x.recipeId === recipe!.recipeId),
    );
    if (
      await onSave({
        ...project,
        analysisOutputs: [...retained, output],
        figures: [...project.figures, ...figures],
        updatedAt: now,
      })
    )
      setStatus(
        "解析と図を保存しました。次は、図から直接読み取れる結果と、その解釈を分けて考えます",
      );
  }
  return (
    <article className="analysis-workspace">
      <p className="eyebrow">S11 / GUI解析と図</p>
      <h2 id="stage-title" tabIndex={-1}>
        S11 データを解析し、図を作る
      </h2>
      <nav aria-label="解析手順">
        <ol className="analysis-step-list">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </nav>
      <aside className="mira-analysis">
        <strong>Mira（研究パートナー）</strong>
        <p>{STEP_MIRA[step]}</p>
      </aside>
      <section>
        <h3>{STEPS[step]}</h3>
        {step === 0 && (
          <>
            <p>
              保存した仮説: {project.hypothesis?.choiceId} ／ 計算前の予想:{" "}
              {project.prediction?.choiceId}
            </p>
            <p>
              解析レシピ version {recipe.versionNumber}、対象:{" "}
              {recipe.recipe.input.snapshotIds.join("、")}
            </p>
            {recipe.modeDecision.modeId === "python-with-mira" && (
              <p>
                希望した学習モードはPython支援です。今回は同じ科学定義を使う操作解析で基準結果を確認できます。Pythonは実行せず、設定も上書きしません。
              </p>
            )}
            <button
              className="primary"
              onClick={() => {
                setStep(1);
                void saveDraft(1);
              }}
            >
              レシピを確認して読込へ
            </button>
          </>
        )}
        {step === 1 && (
          <button className="primary" onClick={() => void load()}>
            密度グリッドを読み込む
          </button>
        )}
        {step >= 2 && items && (
          <>
            <p>
              読み込んだスナップショット: {items.map((x) => x.id).join("、")}
            </p>
            {step >= 2 && (
              <table>
                <caption>平均の診断値</caption>
                <thead>
                  <tr>
                    <th>スナップショット</th>
                    <th>入力平均 μr</th>
                    <th>q の平均</th>
                    <th>δ の平均</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => (
                    <tr key={x.id}>
                      <th>{x.id}</th>
                      <td>{x.statistics.inputMean.toPrecision(8)}</td>
                      <td>{x.statistics.normalizedMean.toPrecision(8)}</td>
                      <td>{x.statistics.contrastMean.toExponential(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {step < 6 && (
              <button className="primary" onClick={() => void advance()}>
                {STEPS[step + 1]}へ
              </button>
            )}
          </>
        )}
      </section>
      {step >= 4 && items && (
        <section>
          <h3>密度コントラストのヒストグラム</h3>
          <HistogramChart items={items} threshold={threshold} />
        </section>
      )}
      {step >= 5 && items && (
        <section>
          <h3>標準偏差と高密度セル割合</h3>
          <LineChart items={items} kind="sigma" threshold={threshold} />
          <table>
            <caption>時間順の数値</caption>
            <thead>
              <tr>
                <th>番号</th>
                <th>スナップショット</th>
                <th>a</th>
                <th>z</th>
                <th>σδ</th>
                <th>q ≥ {threshold}</th>
                <th>セル数</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x, i) => {
                const d = x.statistics.denseFractions.find(
                  (d) => d.threshold === threshold,
                )!;
                return (
                  <tr key={x.id}>
                    <td>{i + 1}</td>
                    <th>{x.id}</th>
                    <td>{x.scaleFactor.toFixed(4)}</td>
                    <td>{x.redshift}</td>
                    <td>{x.statistics.sigmaDelta.toFixed(6)}</td>
                    <td>{d.percent}</td>
                    <td>
                      {d.matchingCellCount}/{d.totalCellCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            閾値は銀河やハローの普遍的な形成境界ではなく、グリッド分解能、平滑化、データ範囲に依存します。
          </p>
          <fieldset>
            <legend>基準解析後の感度比較（表示する閾値）</legend>
            {[1.5, 2, 3].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="dense-threshold"
                  checked={threshold === value}
                  onChange={() => {
                    setThreshold(value);
                    if (value !== 2)
                      setSensitivity((old) =>
                        old.includes(value) ? old : [...old, value].sort(),
                      );
                  }}
                />{" "}
                q ≥ {value}
              </label>
            ))}
          </fieldset>
          <p>
            比較済みの感度閾値:{" "}
            {sensitivity.length
              ? sensitivity.join("、")
              : "なし（主解析でなければ任意）"}
          </p>
        </section>
      )}
      {step >= 6 && items && (
        <section>
          <h3>研究用の図</h3>
          <fieldset>
            <legend>密度画像の表示モード</legend>
            <label>
              <input
                type="radio"
                checked={mode === "comparison"}
                onChange={() => setMode("comparison")}
              />
              比較モード（共通範囲）
            </label>
            <label>
              <input
                type="radio"
                checked={mode === "structure"}
                onChange={() => setMode("structure")}
              />
              構造確認モード（色の時刻間比較不可）
            </label>
          </fieldset>
          <div className="density-grid">
            {items.map((item) => (
              <DensityCanvas
                key={item.id}
                item={item}
                range={range}
                mode={mode}
              />
            ))}
          </div>
          <h4>密度画像の数値表による代替</h4>
          <table>
            <thead>
              <tr>
                <th>スナップショット</th>
                <th>q最小</th>
                <th>q最大</th>
                <th>セル数</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <th>{x.id}</th>
                  <td>{Math.min(...x.statistics.normalized).toFixed(4)}</td>
                  <td>{Math.max(...x.statistics.normalized).toFixed(4)}</td>
                  <td>{x.values.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>事実だけのキャプション候補</h4>
          <p className="caption-preview">{caption}</p>
          <button className="primary" onClick={() => void complete()}>
            主図と補助図を保存する
          </button>
        </section>
      )}
      <section>
        <h3>用語解説</h3>
        {[
          "mean-density",
          "normalized-density",
          "density-contrast",
          "grid-cell",
          "histogram",
          "bin",
          "standard-deviation",
          "population",
          "dense-cell-fraction",
          "threshold",
          "sensitivity-analysis",
          "color-scale",
          "comparison-mode",
          "structure-mode",
          "scale-factor",
          "redshift",
        ].map((id) => (
          <button
            className="link-button"
            key={id}
            onClick={() => onGlossary(id)}
          >
            {TERM_LABELS[id]}
          </button>
        ))}
      </section>
      {status && <p role="status">{status}</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => void load()}>再試行</button>
          <button onClick={onReacquire}>S08で再取得</button>
        </div>
      )}
      <button onClick={onBack}>S10へ戻る</button>
    </article>
  );
}
