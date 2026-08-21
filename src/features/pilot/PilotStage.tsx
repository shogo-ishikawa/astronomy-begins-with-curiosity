import { StageLearningFrame } from "../../components/stage/StageLearningFrame";
import { stageLearning } from "../../content/ja/stageLearning";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { orderChoices } from "../../domain/choiceOrder";
import {
  demoProvenance,
  fixtureSummary,
  generateDensity,
  transform,
  viridis,
} from "./fixture";
import {
  activeReviewedPlan,
  adjacentCandidates,
  boxCandidates,
  completePilotWithoutRevision,
  particleCandidates,
  particleSpacing,
  relativeParticleData,
  settingsFromPlan,
  validateComparison,
  type DisplayMode,
  type PilotAxis,
  type PilotRecord,
  type PilotSettings,
} from "./logic";
import { formatSnapshotId } from "../../domain/snapshotTime";

const warning =
  "操作と比較方法を体験するための合成データです。CWSの計算結果や観測データではありません。";
const predictions = {
  "particle-count": [
    {
      id: "more-detail",
      label:
        "大まかな構造は似たまま、粒子数が多い側で細かな濃淡を表しやすくなる",
    },
    { id: "small-difference", label: "選んだ条件では見た目の差が小さい" },
    {
      id: "less-more-accurate",
      label: "粒子数が少ない側の方が細かな構造を正確に表す",
    },
    {
      id: "load-changes",
      label: "粒子数とデータ量に基づく計算・出力負荷の目安が変わる",
    },
    { id: "unsure", label: "まだわからない" },
  ],
  "box-size": [
    { id: "wide-scale", label: "大きい箱は広い空間スケールを含められる" },
    {
      id: "coarser-spacing",
      label: "同じ粒子数なら、大きい箱ほど粒子間隔の目安が粗くなる",
    },
    {
      id: "small-detail",
      label: "小さい箱は細かなスケールを調べやすいが、大きな構造を含みにくい",
    },
    { id: "no-change", label: "箱サイズを変えても何も変わらない" },
    { id: "unsure", label: "まだわからない" },
  ],
};
const observations = [
  { id: "comparison-finer", label: "比較する設定で細かな濃淡が多く見える" },
  { id: "broad-similar", label: "大まかな分布が似ている" },
  { id: "image-unclear", label: "画像だけでは差を判断しにくい" },
  { id: "sigma-different", label: "σδ の数値が異なる" },
  { id: "spacing-changed", label: "粒子間隔の目安が変化した" },
  { id: "fixed-changed", label: "固定したはずのパラメータが変化した" },
  { id: "unsure", label: "まだわからない" },
];

function DensityFigure({
  title,
  settings,
  data,
  min,
  max,
}: {
  title: string;
  settings: PilotSettings;
  data: Float64Array;
  min: number;
  max: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    id = `density-${title === "現在の計画" ? "baseline" : "comparison"}`;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1,
      w = 320,
      h = 320;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = "100%";
    canvas.style.aspectRatio = "1";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(
      settings.displayGrid,
      settings.displayGrid,
    );
    for (let i = 0; i < data.length; i++) {
      const c = viridis(data[i]!, min, max);
      image.data.set([...c, 255], i * 4);
    }
    const tmp = document.createElement("canvas");
    tmp.width = settings.displayGrid;
    tmp.height = settings.displayGrid;
    tmp.getContext("2d")!.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [data, min, max, settings.displayGrid]);
  return (
    <figure className="density-figure" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      <p className="demo-label">DEMO / synthetic fixture</p>
      <canvas ref={ref} role="img" aria-labelledby={id} />
      <figcaption>
        L = {settings.boxSizeMpcOverH} h⁻¹ Mpc、N<sub>side</sub> ={" "}
        {settings.particleSide}（N<sub>p</sub> = {settings.particleSide ** 3}
        ）、{formatSnapshotId(settings.snapshotId)}。表示量
        ρ/ρ̄、log(1+ρ/ρ̄)、viridis相当、表示範囲 {min.toFixed(3)}–{max.toFixed(3)}
        。暗黒物質の密度場を模した合成二次元密度場です。投影
        xy、表示グリッド64×64（N<sub>side</sub>とは別）、
        {demoProvenance.generator} v{demoProvenance.generatorVersion}。
      </figcaption>
    </figure>
  );
}

export function PilotStage({
  project,
  save,
  revise,
  next,
  onGlossary,
}: {
  project: ProjectState;
  save: (pilot: PilotRecord) => Promise<void>;
  revise: (pilot: PilotRecord) => Promise<void>;
  next: () => void;
  onGlossary: (id: string) => void;
}) {
  const plan = activeReviewedPlan(project);
  const [axis, setAxis] = useState<PilotAxis | null>(
    project.pilot?.axis ?? null,
  );
  const [other, setOther] = useState<number | undefined>(
    project.pilot?.comparison
      ? project.pilot.axis === "box-size"
        ? project.pilot.comparison.boxSizeMpcOverH
        : project.pilot.comparison.particleSide
      : undefined,
  );
  const [snapshot, setSnapshot] = useState(
    project.pilot?.baseline.snapshotId ?? plan?.resolved.snapshotIds[0] ?? "z0",
  );
  const [selected, setSelected] = useState<string[]>(
    project.pilot?.predictionIds ?? [],
  );
  const [note, setNote] = useState(project.pilot?.predictionNote ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const pilot = project.pilot;
  const revealed = Boolean(pilot?.revealedAt && pilot.comparison);
  const data = useMemo(
    () =>
      revealed && pilot?.comparison
        ? ([
            generateDensity(pilot.baseline),
            generateDensity(pilot.comparison),
          ] as const)
        : null,
    [revealed, pilot],
  );
  if (!plan)
    return (
      <article>
        <h1 id="stage-title">必須の試し計算</h1>
        <StageLearningFrame content={stageLearning.pilot} />
        <p>現在の研究内容に対応した承認済み計画がありません。S06へ戻ります。</p>
      </article>
    );
  const planId = plan.planVersionId;
  const base = settingsFromPlan(plan, snapshot);
  const candidates = axis
    ? adjacentCandidates(
        axis === "box-size" ? base.boxSizeMpcOverH : base.particleSide,
        axis === "box-size" ? boxCandidates : particleCandidates,
      )
    : [];
  const comparison =
    axis && other
      ? {
          ...base,
          [axis === "box-size" ? "boxSizeMpcOverH" : "particleSide"]: other,
        }
      : null;
  const summaries = data
    ? [fixtureSummary(data[0]), fixtureSummary(data[1])]
    : null;
  const transformed = data ? [transform(data[0]), transform(data[1])] : null;
  const ranges = transformed
    ? transformed.map((x) => [Math.min(...x), Math.max(...x)] as const)
    : null;
  const displayMode: DisplayMode = pilot?.displayMode ?? "shared";
  const shared = ranges
    ? ([
        Math.min(ranges[0][0], ranges[1][0]),
        Math.max(ranges[0][1], ranges[1][1]),
      ] as const)
    : null;
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  async function lock() {
    try {
      if (!axis || !comparison || !selected.length)
        return fail(
          "比較軸、隣接する比較設定、スナップショット、予想を選んでください。",
        );
      validateComparison(base, comparison, axis);
      const now = new Date().toISOString();
      await save({
        pilotId: pilot?.pilotId ?? crypto.randomUUID(),
        status: "prediction-locked",
        baselinePlanVersionId: planId,
        baseline: base,
        axis,
        comparison,
        fixedFields: Object.keys(base).filter(
          (k) =>
            k !== (axis === "box-size" ? "boxSizeMpcOverH" : "particleSide"),
        ),
        predictionIds: selected,
        predictionNote: note,
        predictionLockedAt: now,
        fixtureRef: null,
        revealedAt: null,
        displayMode: "shared",
        colorScale: null,
        observationIds: [],
        predictionAssessment: null,
        decisions: [],
        revisionDraftRef: null,
        resultingPlanVersionId: null,
        completedAt: null,
        contentVersion: "pilot-content-v1",
        dataVersion: "demo-pilot-1",
        formulaVersion: "pilot-formulas-v1",
      });
    } catch (e) {
      fail(e instanceof Error ? e.message : "保存できませんでした。");
    }
  }
  async function reveal() {
    if (!pilot || pilot.status !== "prediction-locked") return;
    const now = new Date().toISOString();
    const a = transform(generateDensity(pilot.baseline)),
      b = transform(generateDensity(pilot.comparison!));
    await save({
      ...pilot,
      status: "revealed",
      fixtureRef: {
        fixtureId: `demo:${pilot.pilotId}`,
        generatorVersion: "1.0.0",
        dataVersion: "demo-pilot-1",
        seed: 1701,
      },
      revealedAt: now,
      colorScale: {
        transform: "log1p",
        sharedMin: Math.min(...a, ...b),
        sharedMax: Math.max(...a, ...b),
      },
    });
  }
  async function decide(decision: "maintain" | "revise" | "unsure") {
    if (!pilot || !summaries) return;
    if (
      !pilot.observationIds.some((id) =>
        [
          "comparison-finer",
          "broad-similar",
          "image-unclear",
          "sigma-different",
          "spacing-changed",
        ].includes(id),
      )
    )
      return fail(
        "図または数値という証拠に対応した観察を少なくとも一つ選んでください。固定条件が変わったという選択は設定表と矛盾します。",
      );
    if (!pilot.predictionAssessment)
      return fail("予想と観察の比較を選んでください。");
    if (decision !== "unsure" && !reason.trim())
      return fail("判断理由を記録してください。");
    const now = new Date().toISOString(),
      next = {
        ...pilot,
        decisions: [...pilot.decisions, { decision, reason, at: now }],
      };
    if (decision === "maintain") {
      try {
        await save(
          completePilotWithoutRevision(next, project.activePlanVersionId, now),
        );
      } catch (error) {
        fail(
          error instanceof Error
            ? error.message
            : "試し計算を完了できませんでした。",
        );
      }
    } else if (decision === "revise")
      await revise({
        ...next,
        status: "awaiting-rereview",
        revisionDraftRef: `draft:${pilot.pilotId}`,
      });
    else await save(next);
  }
  if (pilot?.status === "complete")
    return (
      <article className="stage">
        <p className="eyebrow">S07 / 必須の試し計算</p>
        <h1 id="stage-title">試し計算を完了しました</h1>
        <StageLearningFrame content={stageLearning.pilot} />
        <p className="demo-label">DEMO / synthetic fixture</p>
        <p>{warning}</p>
        <p>
          承認済み計画 v{plan.versionNumber}{" "}
          を維持し、観察と理由をPilotRecordへ保存しました。
        </p>
        <p>
          <strong>次は事前計算済み結果を取得します。</strong>
        </p>
        <button className="primary" onClick={next}>
          研究計画に合うデータを取得する
        </button>
      </article>
    );
  return (
    <article className="stage pilot">
      <p className="eyebrow">S07 / 必須の試し計算</p>
      <h1 id="stage-title">一つだけ変えて、予想と結果を比べる</h1>
      <StageLearningFrame content={stageLearning.pilot} />
      <div className="demo-banner">
        <strong>DEMO / synthetic fixture</strong>
        <p>{warning}</p>
        <p>
          固定フーリエモードから作る多重スケール密度場です。N体計算の収束性を再現しません。
        </p>
      </div>
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="validation-summary"
        >
          {error}
        </div>
      )}
      {!pilot && (
        <>
          <section>
            <h2>1. 比較するパラメータ</h2>
            <label>
              <input
                type="radio"
                name="axis"
                onChange={() => {
                  setAxis("particle-count");
                  setOther(undefined);
                }}
              />
              箱サイズ L を固定して粒子数を変える
            </label>
            <label>
              <input
                type="radio"
                name="axis"
                onChange={() => {
                  setAxis("box-size");
                  setOther(undefined);
                }}
              />
              粒子数を固定して箱サイズ L を変える
            </label>
            <button
              onClick={() =>
                setError(
                  "私と整理しましょう。粒子数比較は同じ体積の標本化、箱サイズ比較は含む空間スケールと粒子間隔を比べます。同じ乱数シードでも同じ物理領域ではありません。",
                )
              }
            >
              まだわからない
            </button>
            {axis && (
              <fieldset>
                <legend>隣接する比較設定</legend>
                {candidates.map((v) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="other"
                      onChange={() => setOther(v)}
                    />
                    {axis === "box-size" ? (
                      `L = ${v} h⁻¹ Mpc`
                    ) : (
                      <>
                        N<sub>side</sub> = {v}（N<sub>p</sub> = {v ** 3}）
                      </>
                    )}
                  </label>
                ))}
              </fieldset>
            )}
            <label>
              比較するスナップショット
              <select
                value={snapshot}
                onChange={(e) => setSnapshot(e.target.value)}
              >
                {plan.resolved.snapshotIds.map((id) => (
                  <option key={id} value={id}>
                    {formatSnapshotId(id)}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {axis && other && (
            <section>
              <h2>2. 結果を見る前の予想</h2>
              <p>
                私は正解を先に示しません。何を優先する研究かを考えて選んでください。
              </p>
              {orderChoices(
                predictions[axis],
                {
                  kind: "stable-shuffle",
                  orderVersion: 1,
                  pinToEnd: ["unsure"],
                },
                {
                  choiceOrderSeed: project.choiceOrderSeed,
                  themeId: project.themeId,
                  groupId: `pilot-prediction-${axis}`,
                },
              ).map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.id]
                          : selected.filter((x) => x !== c.id),
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
              <label>
                任意の一文メモ
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button className="primary" onClick={() => void lock()}>
                予想を保存して固定する
              </button>
            </section>
          )}
        </>
      )}
      {pilot?.status === "prediction-locked" && (
        <section>
          <h2>予想を保存しました</h2>
          <p>結果を開示すると、この試行の予想は変更できません。</p>
          <button className="primary" onClick={() => void reveal()}>
            比較結果を開示する
          </button>
        </section>
      )}
      {revealed && data && transformed && ranges && shared && summaries && (
        <>
          <section>
            <h2>3. 図と数値から直接観察する</h2>
            <label>
              カラースケール
              <select
                value={displayMode}
                onChange={(e) =>
                  void save({
                    ...pilot!,
                    displayMode: e.target.value as DisplayMode,
                  })
                }
              >
                <option value="shared">共通範囲（比較向け・標準）</option>
                <option value="individual">個別範囲（構造確認向け）</option>
              </select>
            </label>
            {displayMode === "individual" && (
              <p className="notice">
                構造は見やすくなりますが、二枚の明るさや色をそのまま比較できません。
              </p>
            )}
            <div className="density-comparison">
              <DensityFigure
                title="現在の計画"
                settings={pilot!.baseline}
                data={transformed[0]}
                min={displayMode === "shared" ? shared[0] : ranges[0][0]}
                max={displayMode === "shared" ? shared[1] : ranges[0][1]}
              />
              <DensityFigure
                title="比較する設定"
                settings={pilot!.comparison!}
                data={transformed[1]}
                min={displayMode === "shared" ? shared[0] : ranges[1][0]}
                max={displayMode === "shared" ? shared[1] : ranges[1][1]}
              />
            </div>
            <table className="scope-table">
              <caption>
                DEMO / synthetic fixture 数値比較（色変換前の値）
              </caption>
              <thead>
                <tr>
                  <th>量</th>
                  <th>現在の計画</th>
                  <th>比較する設定</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>
                    粒子間隔の目安 d<sub>p</sub>
                  </th>
                  <td>
                    {particleSpacing(
                      pilot!.baseline.boxSizeMpcOverH,
                      pilot!.baseline.particleSide,
                    ).toFixed(3)}{" "}
                    h⁻¹ Mpc
                  </td>
                  <td>
                    {particleSpacing(
                      pilot!.comparison!.boxSizeMpcOverH,
                      pilot!.comparison!.particleSide,
                    ).toFixed(3)}{" "}
                    h⁻¹ Mpc
                  </td>
                </tr>
                <tr>
                  <th>
                    粒子数・データ量の目安 R<sub>N</sub>
                  </th>
                  <td>{relativeParticleData(pilot!.baseline.particleSide)}</td>
                  <td>
                    {relativeParticleData(pilot!.comparison!.particleSide)}
                  </td>
                </tr>
                <tr>
                  <th>
                    <button
                      className="term"
                      onClick={() => onGlossary("standard-deviation")}
                    >
                      密度コントラストの標準偏差 σ<sub>δ</sub>
                    </button>
                  </th>
                  <td>{summaries[0].sigmaDelta.toFixed(4)}</td>
                  <td>{summaries[1].sigmaDelta.toFixed(4)}</td>
                </tr>
                <tr>
                  <th>変更／固定</th>
                  <td colSpan={2}>
                    {pilot!.axis === "box-size"
                      ? "変更: L／固定: N_side、スナップショット、投影、密度推定、平滑化、グリッド"
                      : "変更: N_side／固定: L、スナップショット、投影、密度推定、平滑化、グリッド"}
                  </td>
                </tr>
                <tr>
                  <th>provenance</th>
                  <td colSpan={2}>
                    {demoProvenance.generator} v
                    {demoProvenance.generatorVersion}、seed{" "}
                    {demoProvenance.seed}、data {demoProvenance.dataVersion}
                  </td>
                </tr>
              </tbody>
            </table>
            {pilot!.axis === "box-size" && (
              <p>
                箱サイズが異なると一セルの物理サイズも異なります。同じ乱数シードでも同じ物理領域・構造ではなく、画素対応や
                σδ の単純な優劣を主張できません。
              </p>
            )}
          </section>
          <section>
            <h2>4. 観察と予想を比べる</h2>
            {orderChoices(
              observations,
              { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
              {
                choiceOrderSeed: project.choiceOrderSeed,
                themeId: project.themeId,
                groupId: "pilot-observations",
              },
            ).map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={pilot!.observationIds.includes(c.id)}
                  onChange={(e) =>
                    void save({
                      ...pilot!,
                      observationIds: e.target.checked
                        ? [...pilot!.observationIds, c.id]
                        : pilot!.observationIds.filter((x) => x !== c.id),
                    })
                  }
                />
                {c.label}
              </label>
            ))}
            <fieldset>
              <legend>予想との比較（採点ではなく研究記録）</legend>
              {[
                ["supported", "予想は観察に支持された"],
                ["partly", "一部は支持された"],
                ["different", "予想と異なった"],
                ["uncertain", "まだ判断できない"],
              ].map(([id, label]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="assessment"
                    checked={pilot!.predictionAssessment === id}
                    onChange={() =>
                      void save({
                        ...pilot!,
                        predictionAssessment:
                          id as PilotRecord["predictionAssessment"],
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </section>
          <section>
            <h2>5. 設定を維持・修正する</h2>
            <label>
              判断理由
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="actions">
              <button onClick={() => void decide("maintain")}>維持する</button>
              <button onClick={() => void decide("revise")}>
                比較設定を採用して修正する
              </button>
              <button onClick={() => void decide("unsure")}>
                まだ判断できない
              </button>
            </div>
            {pilot!.decisions.at(-1)?.decision === "unsure" && (
              <div className="mira-review-intro">
                <strong>★ Mira（研究パートナー）</strong>
                <p>
                  私と、共通・個別カラースケール、粒子間隔、σδを一つずつ確認しましょう。判断を保留しても不利益はなく、予想と観察は保持されます。
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </article>
  );
}
