import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { hypotheses, predictionChoices } from "../hypothesis/logic";
import {
  reloadResultPackage,
  type RuntimeResultPackage,
  type SnapshotId,
  type BoundResultPackageRef,
} from "../execution/logic";
import { canEnterAnalysis, latestQuality } from "./logic";
import {
  analysisContextFingerprint,
  artifactRelation,
  isAnalysisDraft,
  isGuidedResult,
  type AnalysisRunDraft,
  type ScientificFigure,
} from "./records";
import {
  ANALYSIS_NUMERICAL_CONTRACT_V1,
  analyzeDensity,
  commonHistogramBoundaries,
  histogram,
  sortByScaleFactor,
  scaleFactorX,
  type SnapshotStatistics,
} from "./numerical";
import { PythonAnalysisWorkspace } from "./PythonAnalysisWorkspace";

export type RuntimeAnalysis = {
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

function activeRecipe(project: ProjectState) {
  return project.analysisRecipes.find(
    (record) => record.recipeId === project.activeAnalysisRecipeId,
  );
}

export function DensityCanvas({
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
  const displayedRange: [number, number] =
    mode === "structure"
      ? [
          Math.min(...item.statistics.normalized),
          Math.max(...item.statistics.normalized),
        ]
      : range;
  return (
    <figure className="density-figure">
      <canvas
        ref={ref}
        width="128"
        height="128"
        role="img"
        aria-label={`a=${item.scaleFactor.toFixed(4)}、z=${item.redshift}の再規格化密度画像`}
        aria-describedby={`density-desc-${item.id}`}
      />
      <figcaption id={`density-desc-${item.id}`}>
        スナップショット（a={item.scaleFactor.toFixed(4)}、z={item.redshift}
        ）。表示量 q。
        {mode === "comparison"
          ? "全時刻共通"
          : "時刻ごと（色の時刻間比較不可）"}
        のカラースケール {displayedRange[0].toFixed(3)}–
        {displayedRange[1].toFixed(3)}。
      </figcaption>
    </figure>
  );
}

export function LineChart({
  items,
  kind,
  sensitivity = [],
}: {
  items: RuntimeAnalysis[];
  kind: "sigma" | "dense";
  sensitivity?: number[];
}) {
  const factors = items.map((item) => item.scaleFactor);
  const thresholds =
    kind === "dense" ? [2, ...sensitivity.filter((x) => x !== 2)] : [2];
  const series = thresholds.map((threshold) =>
    items.map((item) =>
      kind === "sigma"
        ? item.statistics.sigmaDelta
        : item.statistics.denseFractions.find((x) => x.threshold === threshold)!
            .fraction,
    ),
  );
  const maximum = Math.max(...series.flat(), Number.EPSILON);
  const xTicks = [...new Set(factors)];
  return (
    <svg
      className={`analysis-chart ${kind === "dense" ? "dense-growth-chart" : "sigma-growth-chart"}`}
      viewBox="0 0 520 235"
      role="img"
    >
      <title>
        {kind === "sigma"
          ? "スケール因子と密度コントラストの標準偏差"
          : "基準高密度セル割合と感度比較"}
      </title>
      <desc>
        実際のスケール因子を共通範囲へ線形変換しています。点番号と直後の表でも値を確認できます。
      </desc>
      <path d="M55 25V190H495 M55 190H495" className="chart-axis" />
      {series.map((values, seriesIndex) => {
        const points = values
          .map(
            (value, index) =>
              `${scaleFactorX(items[index]!.scaleFactor, factors)},${190 - (value / maximum) * 145}`,
          )
          .join(" ");
        return (
          <g key={thresholds[seriesIndex]}>
            <polyline
              points={points}
              className={`chart-line series-${seriesIndex % 6}`}
              fill="none"
            />
            {values.map((value, index) => (
              <g key={items[index]!.id}>
                <circle
                  cx={scaleFactorX(items[index]!.scaleFactor, factors)}
                  cy={190 - (value / maximum) * 145}
                  r={4 + (seriesIndex % 2)}
                />
                {seriesIndex === 0 && (
                  <text
                    x={scaleFactorX(items[index]!.scaleFactor, factors)}
                    y={180 - (value / maximum) * 145}
                    textAnchor="middle"
                  >
                    {index + 1}
                  </text>
                )}
              </g>
            ))}
            {kind === "dense" && (
              <text x="360" y={35 + seriesIndex * 16}>
                {seriesIndex === 0 ? "基準" : "感度"} q ≥{" "}
                {thresholds[seriesIndex]}
              </text>
            )}
          </g>
        );
      })}
      {xTicks.map((factor) => (
        <g key={factor}>
          <line
            x1={scaleFactorX(factor, factors)}
            x2={scaleFactorX(factor, factors)}
            y1="190"
            y2="196"
            className="chart-axis"
          />
          <text x={scaleFactorX(factor, factors)} y="208" textAnchor="middle">
            {factor.toFixed(3)}
          </text>
        </g>
      ))}
      <text x="275" y="232" textAnchor="middle">
        スケール因子 a
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
    Number.EPSILON,
  );
  const boundaries = items[0]!.histogram.boundaries;
  const minimum = boundaries[0]!;
  const upper = boundaries.at(-1)!;
  const x = (value: number) =>
    55 + ((value - minimum) / (upper - minimum)) * 430;
  const xTicks = Array.from(
    { length: 5 },
    (_, i) => minimum + ((upper - minimum) * i) / 4,
  );
  const yTicks = Array.from({ length: 5 }, (_, i) => (maximum * i) / 4);
  return (
    <svg className="analysis-chart" viewBox="0 0 520 235" role="img">
      <title>密度コントラストの30共通ビンヒストグラム</title>
      <desc>
        横軸は密度コントラスト、縦軸はセル割合です。全系列は同じ境界を使い、線種、終点記号、系列番号、直後の数値表で識別できます。
      </desc>
      <path d="M55 25V190H495 M55 190H495" className="chart-axis" />
      {xTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1="190"
            y2="196"
            className="chart-axis"
          />
          <text x={x(tick)} y="208" textAnchor="middle">
            {tick.toFixed(2)}
          </text>
        </g>
      ))}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1="49"
            x2="55"
            y1={190 - (tick / maximum) * 150}
            y2={190 - (tick / maximum) * 150}
            className="chart-axis"
          />
          <text x="46" y={194 - (tick / maximum) * 150} textAnchor="end">
            {tick.toFixed(3)}
          </text>
        </g>
      ))}
      {items.map((item, series) => {
        const points = item.histogram.fractions
          .map(
            (value, index) =>
              `${55 + ((index + 0.5) * 430) / 30},${190 - (value / maximum) * 150}`,
          )
          .join(" ");
        const last = item.histogram.fractions.at(-1)!;
        return (
          <g key={item.id}>
            <polyline
              points={points}
              fill="none"
              className={`chart-line series-${series % 6}`}
            />
            <circle
              cx={55 + (29.5 * 430) / 30}
              cy={190 - (last / maximum) * 150}
              r={3 + (series % 3)}
              className={`series-marker marker-${series % 6}`}
            />
            <text x="420" y={35 + series * 16}>
              {series + 1}: a={item.scaleFactor.toFixed(3)}, z={item.redshift}
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
      <text x="275" y="232" textAnchor="middle">
        密度コントラスト δ
      </text>
      <text transform="translate(12 145) rotate(-90)">セルの割合</text>
    </svg>
  );
}

export function AnalysisStage({
  project,
  onSave,
  onBack,
  onReacquire,
  onGlossary,
  onInterpret,
}: {
  project: ProjectState;
  onSave: (project: ProjectState) => Promise<boolean>;
  onBack: () => void;
  onReacquire: () => void;
  onGlossary: (id: string) => void;
  onInterpret: () => void;
}) {
  const recipe = activeRecipe(project);
  const guard = canEnterAnalysis(project);
  const projectRef = useRef(project);
  projectRef.current = project;
  const contextFingerprint = recipe
    ? analysisContextFingerprint(project, recipe)
    : undefined;
  const currentDraft = [...project.analysisOutputs]
    .reverse()
    .find(
      (x): x is AnalysisRunDraft =>
        isAnalysisDraft(x) &&
        x.recipeId === recipe?.recipeId &&
        x.contextFingerprint === contextFingerprint,
    );
  const currentResult = recipe
    ? [...project.analysisOutputs]
        .reverse()
        .find(
          (x): x is import("./records").GuidedAnalysisResult =>
            isGuidedResult(x) &&
            artifactRelation(project, recipe, x) === "current",
        )
    : undefined;
  const [reanalyzing, setReanalyzing] = useState(false);
  const [pythonOpen, setPythonOpen] = useState(false);
  const resumeTarget = useRef(currentDraft?.completedLearningStep ?? 0);
  const [step, setStep] = useState(() =>
    resumeTarget.current > 1 ? 1 : resumeTarget.current,
  );
  const [runtime, setRuntime] = useState<RuntimeResultPackage>();
  const [items, setItems] = useState<RuntimeAnalysis[]>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<DisplayMode>("comparison");
  const [sensitivity, setSensitivity] = useState<number[]>([]);
  const controller = useRef<AbortController | undefined>(undefined);
  const requestEpoch = useRef(0);
  const draftRunId = useRef(crypto.randomUUID());
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
  async function saveDraft(nextStep: number): Promise<boolean> {
    const latest = projectRef.current;
    const latestRecipe = activeRecipe(latest);
    if (!latestRecipe) return false;
    const latestContext = analysisContextFingerprint(latest, latestRecipe);
    if (!latestContext || latestContext !== contextFingerprint) {
      setError("解析中にcontextが変わりました。S10で確認してください。");
      return false;
    }
    const now = new Date().toISOString();
    const retained = latest.analysisOutputs.filter(
      (x) =>
        !(
          isAnalysisDraft(x) &&
          x.recipeId === latestRecipe.recipeId &&
          x.contextFingerprint === latestContext
        ),
    );
    const draft: AnalysisRunDraft = {
      recordKind: "analysis-run-draft",
      schemaVersion: 1,
      runId: draftRunId.current,
      recipeId: latestRecipe.recipeId,
      completedLearningStep: nextStep,
      contextFingerprint: latestContext,
      numericalContractId: ANALYSIS_NUMERICAL_CONTRACT_V1.id,
      numericalContractVersion: ANALYSIS_NUMERICAL_CONTRACT_V1.version,
      updatedAt: now,
    };
    const saved = await onSave({
      ...latest,
      analysisOutputs: [...retained, draft],
      updatedAt: now,
    });
    if (!saved) {
      setError("進捗を保存できなかったため、段階を進めませんでした。");
      return false;
    }
    setError("");
    return true;
  }
  async function load(resumeStep = Math.max(2, resumeTarget.current)) {
    controller.current?.abort();
    const epoch = ++requestEpoch.current;
    const startedContext = contextFingerprint;
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
      if (
        epoch !== requestEpoch.current ||
        startedContext !==
          analysisContextFingerprint(
            projectRef.current,
            activeRecipe(projectRef.current)!,
          )
      )
        return;
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
      if (await saveDraft(resumeStep)) {
        setStep(resumeStep);
        setStatus("選択したデータを再検証して読み込みました。");
      } else setStatus("");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
        setStatus("");
      }
    }
  }
  async function advance() {
    const next = Math.min(6, step + 1);
    if (await saveDraft(next)) setStep(next);
  }
  const caption =
    items && runtime
      ? `DEMO / synthetic fixture（教育用合成データ）。暗黒物質のみの教育用データ。${items.map((x, index) => `スナップショット${index + 1} (a=${x.scaleFactor.toFixed(4)}, z=${x.redshift})`).join("、")}。表示量は再規格化密度 q、密度コントラスト δ。ヒストグラムは30ビンの共通境界 [${items[0]!.histogram.boundaries[0]!.toFixed(4)}, ${items[0]!.histogram.boundaries.at(-1)!.toFixed(4)}]。カラースケールは${mode === "comparison" ? "全時刻共通の比較モード" : "時刻別の構造確認モード（色の時刻間比較不可）"}。高密度セルの基準は q >= 2.0（δ >= 1.0）、感度比較は ${sensitivity.length ? sensitivity.map((x) => `q >= ${x}`).join("、") : "なし"}。データ版 ${runtime.manifest.dataVersion}、fixture版 ${runtime.manifest.payload.fixtureVersion}、解析レシピ版 ${recipe.versionNumber}。`
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
      contextFingerprint: contextFingerprint!,
      caption,
      recipeVersion: recipe!.versionNumber,
      planSubjectHash: recipe!.context.planSubjectHash,
      requestFingerprint:
        project.resultPackage!.refKind === "bound"
          ? project.resultPackage!.requestFingerprint
          : "",
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
        // Keep every contract threshold for an independent Python parity check;
        // `sensitivityThresholds` still records which series the student displayed.
        sensitivityDenseFractions: x.statistics.denseFractions.filter(
          (d) => d.threshold !== 2,
        ),
      })),
      commonHistogramBoundaries: items[0]!.histogram.boundaries,
      sensitivityThresholds: sensitivity,
      completedLearningSteps: STEPS,
    };
    const figureIds = [
      ...new Set([
        recipe!.recipe.figures.primaryFigureId,
        ...recipe!.recipe.figures.supportingFigureIds,
      ]),
    ].filter(
      (
        kind,
      ): kind is
        | "density-panels"
        | "histogram"
        | "sigma-growth"
        | "dense-growth" =>
        [
          "density-panels",
          "histogram",
          "sigma-growth",
          "dense-growth",
        ].includes(kind),
    );
    const provenance = {
      demo: true,
      physics: "collisionless-dark-matter-only",
      dataVersion: runtime.manifest.dataVersion,
      fixtureVersion: runtime.manifest.payload.fixtureVersion,
    };
    const commonBase = (kind: string, index: number) => ({
      recordKind: "scientific-figure" as const,
      schemaVersion: 1 as const,
      figureId: crypto.randomUUID(),
      runId,
      recipeId: recipe!.recipeId,
      role: (index === 0 ? "primary" : "supporting") as
        | "primary"
        | "supporting",
      title:
        kind === "density-panels"
          ? "再規格化密度"
          : kind === "sigma-growth"
            ? "密度コントラストの標準偏差"
            : kind === "dense-growth"
              ? "基準高密度セル割合と感度比較"
              : "密度コントラストのヒストグラム",
      snapshotIds: items.map((x) => x.id),
      createdAt: now,
      caption,
      provenance,
    });
    const figures: ScientificFigure[] = figureIds.map((kind, index) => {
      const base = commonBase(kind, index);
      if (kind === "density-panels")
        return {
          ...base,
          figureKind: "density-panels",
          displayMode: mode,
          axes: { x: "grid-x", y: "grid-y", color: "normalized-density-q" },
          colorMap: "cividis-like",
          displayRanges: items.map((item) => {
            const values = item.statistics.normalized;
            return {
              snapshotId: item.id,
              minimum: mode === "comparison" ? range[0] : Math.min(...values),
              maximum: mode === "comparison" ? range[1] : Math.max(...values),
            };
          }),
        };
      if (kind === "histogram")
        return {
          ...base,
          figureKind: "histogram",
          axes: { x: "density-contrast-delta", y: "cell-fraction" },
          binCount: 30,
          boundaries: items[0]!.histogram.boundaries,
          baselineThreshold: { operator: ">=", q: 2, delta: 1 },
        };
      if (kind === "dense-growth")
        return {
          ...base,
          figureKind: "dense-growth",
          axes: { x: "scale-factor-a", y: "dense-cell-fraction" },
          baselineThreshold: { operator: ">=", q: 2, delta: 1 },
          sensitivityThresholds: sensitivity,
          displayedSeries: [2, ...sensitivity],
        };
      return {
        ...base,
        figureKind: "sigma-growth",
        axes: { x: "scale-factor-a", y: "sigma-delta" },
      };
    });
    const latestProject = projectRef.current;
    if (
      contextFingerprint !==
      analysisContextFingerprint(latestProject, activeRecipe(latestProject)!)
    ) {
      setError("保存前にcontextが変わりました。古い計算結果は保存しません。");
      return;
    }
    const retained = latestProject.analysisOutputs.filter(
      (x) =>
        !(
          isAnalysisDraft(x) &&
          x.recipeId === recipe!.recipeId &&
          x.contextFingerprint === contextFingerprint
        ),
    );
    const saved = await onSave({
      ...latestProject,
      analysisOutputs: [...retained, output],
      figures: [...latestProject.figures, ...figures],
      updatedAt: now,
    });
    if (saved) {
      setError("");
      setStatus(
        "解析と図を保存しました。次は、図から直接読み取れる結果と、その解釈を分けて考えます",
      );
    } else setError("解析結果と図を保存できませんでした。");
  }
  if (currentResult && !reanalyzing) {
    if (pythonOpen)
      return (
        <PythonAnalysisWorkspace
          project={project}
          guiResult={currentResult}
          onSave={onSave}
          onBack={() => setPythonOpen(false)}
        />
      );
    const savedFigures = project.figures.filter(
      (value): value is { runId: string; title?: unknown } =>
        typeof value === "object" &&
        value !== null &&
        "runId" in value &&
        (value as { runId?: unknown }).runId === currentResult.runId,
    );
    return (
      <article className="analysis-workspace">
        <p className="eyebrow">S11 / GUI解析と図</p>
        <h2 id="stage-title" tabIndex={-1}>
          S11 データを解析し、図を作る
        </h2>
        <h3>解析と図は保存済みです</h3>
        <p role="status">
          解析と図を保存しました。次は、図から直接読み取れる結果と、その解釈を分けて考えます
        </p>
        <p>{currentResult.caption}</p>
        <details>
          <summary>保存済みの数値を確認する</summary>
          <pre>{JSON.stringify(currentResult.snapshots, null, 2)}</pre>
        </details>
        <h4>保存済み図</h4>
        <ul>
          {savedFigures.map((value, index) => (
            <li key={index}>
              {"title" in value ? String(value.title) : "保存図"}
            </li>
          ))}
        </ul>
        <button className="primary" onClick={onInterpret}>
          結果を解釈する
        </button>
        <button
          className="primary"
          onClick={() => {
            setReanalyzing(true);
            setStep(0);
            resumeTarget.current = 0;
          }}
        >
          もう一度解析する
        </button>
        <button
          className={
            recipe.modeDecision.modeId === "python-with-mira"
              ? "primary"
              : undefined
          }
          onClick={() => setPythonOpen(true)}
        >
          Pythonで同じ解析を確かめる（発展）
        </button>
        <button onClick={onBack}>S10へ戻る</button>
      </article>
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
              保存した仮説:{" "}
              {hypotheses.find((x) => x.id === project.hypothesis?.choiceId)
                ?.label ?? "まだ記録されていません"}{" "}
              ／ 計算前の予想:{" "}
              {predictionChoices(
                project.researchQuestion?.measurementId ?? "",
                project.researchQuestion?.choiceId ?? "",
              ).find((x) => x.id === project.prediction?.choiceId)?.label ??
                "まだ記録されていません"}
            </p>
            <p>
              解析レシピ version {recipe.versionNumber}、対象:{" "}
              {recipe.recipe.input.snapshotIds
                .map((id) => {
                  const time =
                    project.resultPackage?.refKind === "bound"
                      ? project.resultPackage.snapshotInventory.find(
                          (x) => x.id === id,
                        )
                      : undefined;
                  return time
                    ? `a=${time.scaleFactor.toFixed(4)}、z=${time.redshift}`
                    : "選択済みスナップショット";
                })
                .join("／")}
            </p>
            {recipe.modeDecision.modeId === "python-with-mira" && (
              <p>
                希望した学習モードはPython支援です。今回は同じ科学定義を使う操作解析で基準結果を確認できます。Pythonは実行せず、設定も上書きしません。
              </p>
            )}
            <button
              className="primary"
              onClick={() =>
                void (async () => {
                  if (await saveDraft(1)) setStep(1);
                })()
              }
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
              読み込んだスナップショット:{" "}
              {items
                .map((x) => `a=${x.scaleFactor.toFixed(4)}、z=${x.redshift}`)
                .join("／")}
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
                      <th>
                        a={x.scaleFactor.toFixed(4)}、z={x.redshift}
                      </th>
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
          <HistogramChart items={items} threshold={2} />
          <details>
            <summary>30ビンの数値表を確認する</summary>
            <div
              className="table-scroll"
              tabIndex={0}
              aria-label="ヒストグラム数値表（横スクロール可能）"
            >
              <table>
                <caption>共通境界、セル数、セル割合</caption>
                <thead>
                  <tr>
                    <th>ビン</th>
                    <th>左端</th>
                    <th>右端</th>
                    {items.flatMap((item, index) => (
                      <Fragment key={item.id}>
                        <th>系列{index + 1} セル数</th>
                        <th>系列{index + 1} 割合</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items[0]!.histogram.counts.map((_, bin) => (
                    <tr key={bin}>
                      <th>{bin + 1}</th>
                      <td>{items[0]!.histogram.boundaries[bin]!.toFixed(6)}</td>
                      <td>
                        {items[0]!.histogram.boundaries[bin + 1]!.toFixed(6)}
                        {bin === 29 ? "（含む）" : "（含まない）"}
                      </td>
                      {items.flatMap((item) => (
                        <Fragment key={item.id}>
                          <td>{item.histogram.counts[bin]}</td>
                          <td>{item.histogram.fractions[bin]!.toFixed(6)}</td>
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
      {step >= 5 && items && (
        <section>
          <h3>標準偏差と高密度セル割合</h3>
          <div
            className={
              recipe.recipe.figures.primaryFigureId === "sigma-growth"
                ? "main-analysis-figure"
                : "diagnostic-figure"
            }
          >
            <LineChart items={items} kind="sigma" />
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="時間順の数値表（横スクロール可能）"
          >
            <table>
              <caption>時間順の数値</caption>
              <thead>
                <tr>
                  <th>番号</th>
                  <th>スナップショット</th>
                  <th>a</th>
                  <th>z</th>
                  <th>σδ</th>
                  <th>基準 q ≥ 2.0</th>
                  <th>セル数</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x, i) => {
                  const d = x.statistics.denseFractions.find(
                    (d) => d.threshold === 2,
                  )!;
                  return (
                    <tr key={x.id}>
                      <td>{i + 1}</td>
                      <th>スナップショット {i + 1}</th>
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
          </div>
          <p>
            閾値は銀河やハローの普遍的な形成境界ではなく、グリッド分解能、平滑化、データ範囲に依存します。
          </p>
          <fieldset>
            <legend>基準 q ≥ 2.0 に追加する感度比較系列</legend>
            <p>基準曲線 q ≥ 2.0（δ ≥ 1.0）は常に表示します。</p>
            {[1.5, 3].map((value) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={sensitivity.includes(value)}
                  onChange={() =>
                    setSensitivity((old) =>
                      old.includes(value)
                        ? old.filter((x) => x !== value)
                        : [...old, value].sort(),
                    )
                  }
                />
                感度比較 q ≥ {value}
              </label>
            ))}
          </fieldset>
          <p>
            表示中の感度比較:{" "}
            {sensitivity.length
              ? sensitivity.join("、")
              : "なし（主解析でなければ任意）"}
          </p>
          <div
            className={
              recipe.recipe.figures.primaryFigureId === "dense-growth"
                ? "main-analysis-figure"
                : "diagnostic-figure"
            }
          >
            <LineChart items={items} kind="dense" sensitivity={sensitivity} />
          </div>
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
                  <th>
                    a={x.scaleFactor.toFixed(4)}、z={x.redshift}
                  </th>
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
