import { useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import {
  analyses,
  figures,
  patterns,
  priorities,
  reasons,
  snapshots,
} from "../../content/ja/planning";
import {
  calculatePlanMetrics,
  planCompletionMissing,
  reasonLabels,
  REASON_KEYS,
  snapshotRecommendation,
  type ReasonKey,
  type ResearchPlanDraft,
} from "./logic";

const choiceLabel = (
  items: readonly { id: string; label: string }[],
  id: string | null,
) => items.find((x) => x.id === id)?.label ?? "未選択";
const fmt = (value: number) =>
  new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 5 }).format(value);

export function PlanningStage({
  project,
  update,
  complete,
  back,
  onGlossary,
}: {
  project: ProjectState;
  update: (
    change: Partial<ResearchPlanDraft>,
    reason: ReasonKey | null,
  ) => void;
  complete: () => void;
  back: () => void;
  onGlossary: (id: string) => void;
}) {
  const draft = project.researchPlanDraft;
  const [errors, setErrors] = useState<string[]>([]);
  const firstRefs = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const metrics =
    draft.boxSizeMpcOverH && draft.particleSide
      ? calculatePlanMetrics(draft.boxSizeMpcOverH, draft.particleSide)
      : null;
  const recommendation = snapshotRecommendation(draft.snapshotIds);
  function finish() {
    const missing = planCompletionMissing(draft);
    if (missing.length) {
      setErrors(missing.map((x) => x.label));
      firstRefs.current[missing[0].key]?.focus();
    } else {
      setErrors([]);
      complete();
    }
  }
  const radio = (
    name: string,
    items: readonly {
      id: string;
      label: string;
      text?: string;
      strength?: string;
      limit?: string;
    }[],
    value: string | null,
    onChange: (id: string) => void,
  ) => (
    <div className="choice-grid">
      {items.map((item) => (
        <label className="plan-choice" key={item.id}>
          <input
            type="radio"
            name={name}
            checked={value === item.id}
            onChange={() => onChange(item.id)}
          />
          <strong>{item.label}</strong>
          {item.strength && <span>調べやすいこと: {item.strength}</span>}
          {item.limit && <span>難しくなること: {item.limit}</span>}
          {item.text && <span>{item.text}</span>}
        </label>
      ))}
    </div>
  );
  return (
    <article className="stage planning">
      <p className="eyebrow">S05 / 研究計画</p>
      <h1>自分の研究計画案を組み立てる</h1>
      <p className="lead">
        値に唯一の正解はありません。何を明らかにしたいかと、各判断の長所・限界をつなげます。
      </p>
      <section className="summary">
        <h2>これまでに考えたこと</h2>
        <dl>
          <dt>研究課題</dt>
          <dd>{project.researchQuestion?.choiceId}</dd>
          <dt>仮説</dt>
          <dd>{project.hypothesis?.choiceId}</dd>
          <dt>S03の事前予想</dt>
          <dd>{project.prediction?.choiceId}</dd>
        </dl>
      </section>
      <section>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.priorityGoal = x;
          }}
        >
          <legend>1. 研究で優先すること</legend>
          {radio("priority", priorities, draft.priorityGoal, (id) =>
            update(
              {
                priorityGoal: id as NonNullable<
                  ResearchPlanDraft["priorityGoal"]
                >,
              },
              "priorityGoal",
            ),
          )}
        </fieldset>
      </section>
      <section>
        <h2>2. 箱サイズと粒子数</h2>
        <p>
          同じ粒子数なら、小さい箱ほど細かく標本化しやすい一方、大きな構造を含みにくくなります。大きい箱は多様な領域を含みやすい一方、粒子間隔が広がります。
        </p>
        <p>
          <button className="term-link" onClick={() => onGlossary("box-size")}>
            箱サイズ
          </button>
          と
          <button
            className="term-link"
            onClick={() => onGlossary("mean-particle-spacing")}
          >
            平均粒子間隔
          </button>
          を確認できます。
        </p>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.boxSizeMpcOverH = x;
          }}
        >
          <legend>箱サイズ L</legend>
          <div className="choice-grid compact">
            {([25, 50, 75, 100] as const).map((x) => (
              <label className="plan-choice" key={x}>
                <input
                  type="radio"
                  name="box"
                  checked={draft.boxSizeMpcOverH === x}
                  onChange={() => update({ boxSizeMpcOverH: x }, "boxSize")}
                />
                <strong>{x} h⁻¹ Mpc</strong>
                {x === 50 && (
                  <span>CWSの基準設定（唯一の正解ではありません）</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.particleSide = x;
          }}
        >
          <legend>一辺の粒子数 Nside</legend>
          <div className="choice-grid compact">
            {([16, 32, 64] as const).map((x) => (
              <label className="plan-choice" key={x}>
                <input
                  type="radio"
                  name="particles"
                  checked={draft.particleSide === x}
                  onChange={() => update({ particleSide: x }, "particleSide")}
                />
                <strong>
                  {x}（全粒子数 {x ** 3}）
                </strong>
                {x === 32 && <span>CWSの基準設定</span>}
              </label>
            ))}
          </div>
        </fieldset>
        <p>
          粒子が多いほど細かく標本化できますが、計算、メモリ、保存データの負荷が増えます。箱と粒子数は同時に大きくできますが、同じ細かさで一辺を2倍にすると粒子は約8倍必要です。
        </p>
        <div className="metrics" aria-live="polite">
          {metrics ? (
            <>
              <h3>設定トレードオフ（総合点ではありません）</h3>
              <dl>
                <dt>大きな構造を含められる体積</dt>
                <dd>L = {draft.boxSizeMpcOverH} h⁻¹ Mpc の箱</dd>
                <dt>平均粒子間隔の目安</dt>
                <dd>{fmt(metrics.meanParticleSpacing)} h⁻¹ Mpc</dd>
                <dt>相対粒子質量</dt>
                <dd>{fmt(metrics.relativeParticleMass)} 倍</dd>
                <dt>おおよその計算負荷</dt>
                <dd>
                  粒子数 {metrics.totalParticles.toLocaleString("ja-JP")}{" "}
                  個。実行時間はアルゴリズム、時間刻み、実行環境にも依存
                </dd>
                <dt>1スナップショット当たりの粒子データ量比</dt>
                <dd>{fmt(metrics.relativeParticleData)} 倍</dd>
                <dt>選択したスナップショット数</dt>
                <dd>{draft.snapshotIds.length} 個</dd>
              </dl>
              <p>
                粒子質量比は同じ宇宙論と平均物質密度を仮定した相対値です。平均粒子間隔は力の分解能そのものではなく、実際には計算法、メッシュ、重力ソフトニングも関係します。
              </p>
            </>
          ) : (
            <p>箱サイズと粒子数を選ぶと派生量を表示します。</p>
          )}
        </div>
      </section>
      <section>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.snapshotIds = x;
          }}
        >
          <legend>3. スナップショット</legend>
          <p>
            初期宇宙から現在へ並んでいます。スケール因子は a = 1 / (1 + z)
            です。計算開始時は宇宙の晴れ上がりを意味しません。
          </p>
          <div className="choice-grid">
            {snapshots.map((s) => (
              <label className="plan-choice" key={s.id}>
                <input
                  type="checkbox"
                  checked={draft.snapshotIds.includes(s.id)}
                  onChange={(e) =>
                    update(
                      {
                        snapshotIds: e.target.checked
                          ? [...draft.snapshotIds, s.id]
                          : draft.snapshotIds.filter((x) => x !== s.id),
                      },
                      "snapshots",
                    )
                  }
                />
                <strong>{s.label}</strong>
              </label>
            ))}
          </div>
        </fieldset>
        {!recommendation.recommended && (
          <div className="notice">
            <h3>Miraから、答えにくくなること</h3>
            {recommendation.missing.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <p>
              それでも研究計画案として完成できます。次のレビューで一緒に検討しましょう。
            </p>
          </div>
        )}
      </section>
      <section>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.primaryAnalysis = x;
          }}
        >
          <legend>4. 主な解析方法</legend>
          {radio("analysis", analyses, draft.primaryAnalysis, (id) =>
            update(
              {
                primaryAnalysis: id as NonNullable<
                  ResearchPlanDraft["primaryAnalysis"]
                >,
              },
              "primaryAnalysis",
            ),
          )}
        </fieldset>
      </section>
      <section>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.plannedFigure = x;
          }}
        >
          <legend>5. 主要図</legend>
          {radio("figure", figures, draft.plannedFigure, (id) =>
            update(
              {
                plannedFigure: id as NonNullable<
                  ResearchPlanDraft["plannedFigure"]
                >,
              },
              "figurePrediction",
            ),
          )}
        </fieldset>
        <fieldset
          tabIndex={-1}
          ref={(x) => {
            firstRefs.current.expectedPattern = x;
          }}
        >
          <legend>図に現れると予想する変化</legend>
          {radio(
            "pattern",
            patterns.map(([id, label]) => ({ id, label })),
            draft.expectedPattern,
            (id) =>
              update(
                {
                  expectedPattern: id as NonNullable<
                    ResearchPlanDraft["expectedPattern"]
                  >,
                },
                "figurePrediction",
              ),
          )}
        </fieldset>
        {draft.expectedPattern === "unsure" && (
          <p className="notice">
            比較のヒント:
            S03の仮説から、横軸の時間が進むと測定量や模様がどうなるかを言葉にしてみましょう。
          </p>
        )}
      </section>
      <section>
        <h2>6. 各判断の理由</h2>
        {REASON_KEYS.map((key) => (
          <fieldset
            key={key}
            tabIndex={-1}
            ref={(x) => {
              firstRefs.current[`reason-${key}`] = x;
            }}
          >
            <legend>{reasonLabels[key]}を選んだ理由</legend>
            {radio(
              `reason-${key}`,
              reasons.map(([id, label]) => ({ id, label })),
              draft.reasonIds[key],
              (id) =>
                update({ reasonIds: { ...draft.reasonIds, [key]: id } }, null),
            )}
          </fieldset>
        ))}
        <label>
          任意の一文メモ
          <textarea
            value={draft.note}
            maxLength={300}
            onChange={(e) => update({ note: e.target.value }, null)}
          />
        </label>
      </section>
      <section className="plan-summary">
        <h2>研究計画案</h2>
        <dl>
          <dt>研究課題</dt>
          <dd>{project.researchQuestion?.choiceId}</dd>
          <dt>仮説</dt>
          <dd>{project.hypothesis?.choiceId}</dd>
          <dt>S03の事前予想</dt>
          <dd>{project.prediction?.choiceId}</dd>
          <dt>優先すること</dt>
          <dd>{choiceLabel(priorities, draft.priorityGoal)}</dd>
          <dt>箱サイズ</dt>
          <dd>
            {draft.boxSizeMpcOverH
              ? `${draft.boxSizeMpcOverH} h⁻¹ Mpc`
              : "未選択"}
          </dd>
          <dt>粒子数</dt>
          <dd>
            {draft.particleSide
              ? `一辺 ${draft.particleSide}、全粒子数 ${draft.particleSide ** 3}`
              : "未選択"}
          </dd>
          {metrics && (
            <>
              <dt>平均粒子間隔</dt>
              <dd>{fmt(metrics.meanParticleSpacing)} h⁻¹ Mpc</dd>
              <dt>相対粒子質量 / データ量</dt>
              <dd>
                {fmt(metrics.relativeParticleMass)} 倍 /{" "}
                {fmt(metrics.relativeParticleData)} 倍
              </dd>
            </>
          )}
          <dt>スナップショット</dt>
          <dd>
            {draft.snapshotIds
              .map((id) => snapshots.find((x) => x.id === id)?.label)
              .join("、") || "未選択"}
          </dd>
          <dt>主解析</dt>
          <dd>{choiceLabel(analyses, draft.primaryAnalysis)}</dd>
          <dt>主要図</dt>
          <dd>{choiceLabel(figures, draft.plannedFigure)}</dd>
          <dt>今回の事前予想</dt>
          <dd>
            {patterns.find((x) => x[0] === draft.expectedPattern)?.[1] ??
              "未選択"}
          </dd>
        </dl>
        {recommendation.missing.map((x) => (
          <p key={x}>{x}</p>
        ))}
      </section>
      {errors.length > 0 && (
        <div className="validation-summary" role="alert">
          <h2>入力を確認してください</h2>
          <ul>
            {errors.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {draft.completedAt && (
        <div className="notice">
          <strong>研究計画案を完成しました。</strong>
          <p>次はMiraと研究計画をレビューします（Phase 1Eで実装予定）。</p>
        </div>
      )}
      <div className="actions">
        <button onClick={back}>方法の理解へ戻る</button>
        <button className="primary" onClick={finish}>
          研究計画案をまとめる
        </button>
      </div>
    </article>
  );
}
