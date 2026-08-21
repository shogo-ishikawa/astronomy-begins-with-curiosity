import { useMemo, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { stableShuffle } from "../quality/logic";
import {
  createAnalysisDraft,
  finalizeAnalysisDesign,
  latestQuality,
  validateDraft,
  type AnalysisDesignDraft,
  type AnalysisModeId,
  type ComparisonStrategy,
  type PythonSupportLevel,
} from "./logic";

const scientificOptions = {
  purpose: [
    [
      "trace-density-change",
      "宇宙の時間とともに密度のむらがどう変化するかを確かめる",
    ],
    ["locate-galaxies", "星や銀河が形成された場所を直接確かめる"],
  ],
  measurement: [
    [
      "matches-question",
      "主測定量が、計画した空間分布または変化量を直接表すため",
    ],
    ["looks-familiar", "見慣れた図になりそうだから"],
  ],
  tradeoff: [
    [
      "preserve-intended-lose-other",
      "主図が保つ情報と、失う情報を区別して補助図で補う",
    ],
    ["shows-everything", "主図一枚ですべての情報が分かる"],
  ],
  support: [
    ["planned-trend-appears", "PlanVersionの予想と対応する傾向が現れる"],
  ],
  nonSupport: [
    [
      "planned-trend-absent",
      "予想した傾向が現れない場合は、仮説を支持しない証拠として扱う",
    ],
  ],
  inconclusive: [
    [
      "recheck-data-method",
      "主図と補助図が一致しなければ、データ、比較条件、測定量を再確認する",
    ],
  ],
  claim: [
    [
      "fixture-learning-only",
      "教育用fixtureで密度分布を比較し、解析手順を体験した範囲だけを主張する",
    ],
    ["real-universe-growth", "現実の宇宙の構造成長率を測定したと主張する"],
  ],
} as const;

export function AnalysisModeStage({
  project,
  onSave,
  onGlossary,
  onStartAnalysis,
}: {
  project: ProjectState;
  onSave: (project: ProjectState) => Promise<boolean>;
  onGlossary: (id: string) => void;
  onStartAnalysis: () => void;
}) {
  const [draft, setDraft] = useState<AnalysisDesignDraft | null>(
    project.analysisDesignDraft,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const quality = latestQuality(project);
  const plan = project.planVersions.find(
    (x) => x.planVersionId === project.activePlanVersionId,
  );
  const ordered = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(scientificOptions).map(([key, options]) => [
          key,
          stableShuffle(
            options as readonly (readonly [string, string])[],
            `${project.projectId}:${draft?.draftId}:${key}:${project.contentVersion}`,
            (x) => x[0],
          ),
        ]),
      ) as Record<string, readonly (readonly [string, string])[]>,
    [project.projectId, project.contentVersion, draft?.draftId],
  );
  async function begin() {
    try {
      const now = new Date().toISOString();
      const next = createAnalysisDraft(project, now, crypto.randomUUID());
      setDraft(next);
      if (
        !(await onSave({
          ...project,
          analysisDesignDraft: next,
          updatedAt: now,
        }))
      )
        setError("draftを保存できませんでした。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "開始できませんでした。");
    }
  }
  async function update(
    questionId: string,
    optionId: string,
    change: Partial<AnalysisDesignDraft>,
  ) {
    if (!draft) return;
    const now = new Date().toISOString();
    const next = {
      ...draft,
      ...change,
      updatedAt: now,
      responseHistory: [
        ...draft.responseHistory,
        {
          questionId,
          optionId,
          answeredAt: now,
          attempt:
            draft.responseHistory.filter((x) => x.questionId === questionId)
              .length + 1,
        },
      ],
    };
    setDraft(next);
    await onSave({ ...project, analysisDesignDraft: next, updatedAt: now });
  }
  async function finish() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const next = finalizeAnalysisDesign(
        project,
        draft,
        new Date().toISOString(),
        crypto.randomUUID(),
      );
      if (!(await onSave(next)))
        throw new Error("保存できませんでした。draftを残して再試行できます。");
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }
  const completeRecord = project.analysisRecipes.find(
    (x) => x.recipeId === project.activeAnalysisRecipeId,
  );
  return (
    <article aria-labelledby="stage-title">
      <h1 id="stage-title" tabIndex={-1}>
        S10 研究の問いを解析レシピへ変える
      </h1>
      <p className="lead">
        品質を確認したデータを、問いに答える証拠へ変える準備をします。結果を見る前に、何を測り、何と比べ、どの結果なら仮説を支持すると考えるかを決めましょう。
      </p>
      <div className="demo-banner">
        <strong>DEMO / synthetic fixture</strong>
        <p>
          CWSや観測データ、実際のN体計算ではなく、宇宙論的な物理精度を検証できません。暗黒物質のみを扱い、星や銀河の形成を直接示したとは結論できません。ABCs内で構造形成と解析手順を学ぶ範囲に限ります。
        </p>
      </div>
      <section>
        <h2>S09から引き継ぐ条件</h2>
        <p>
          warning:{" "}
          {quality?.machineResults
            .filter((x) => x.outcome === "warning")
            .map((x) => x.checkId)
            .join("、") || "なし"}
        </p>
        <ul>
          {quality?.carriedLimitationIds.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      {!draft && !completeRecord && (
        <button className="primary" onClick={() => void begin()}>
          解析設計を始める
        </button>
      )}
      {draft && (
        <>
          <nav aria-label="解析設計の進行">
            <ol className="analysis-stepper">
              <li aria-current="step">問い</li>
              <li>測定量</li>
              <li>snapshot</li>
              <li>図</li>
              <li>証拠</li>
              <li>主張</li>
              <li>mode</li>
            </ol>
          </nav>
          <aside className="analysis-flow" aria-label="解析設計summary">
            研究の問い ↓ 測定量 ↓ 比較するsnapshot ↓ 作成する図 ↓
            仮説を支持する証拠 ↓ 主張できる範囲
          </aside>
          <section>
            <h2>研究計画を確認する</h2>
            <p>研究課題: {project.researchQuestion?.choiceId}</p>
            <p>
              仮説: {project.hypothesis?.choiceId} ／ 予想:{" "}
              {project.prediction?.choiceId}
            </p>
            <p>
              主測定量: {plan?.subjectSnapshot.draft.primaryAnalysis} ／ 主図:{" "}
              {plan?.subjectSnapshot.draft.plannedFigure}（読み取り専用）
            </p>
            {(
              [
                "purpose",
                "measurement",
                "tradeoff",
                "support",
                "nonSupport",
                "inconclusive",
                "claim",
              ] as const
            ).map((key) => (
              <fieldset key={key}>
                <legend>
                  {
                    {
                      purpose: "何を確かめる解析か",
                      measurement: "測定量が問いにどう対応するか",
                      tradeoff: "主図が保持し、失う情報",
                      support: "仮説を支持する場合の傾向",
                      nonSupport: "支持しない場合の扱い",
                      inconclusive: "証拠が一致しない場合",
                      claim: "limitationの下で主張できる範囲",
                    }[key]
                  }
                </legend>
                {(ordered[key] as readonly (readonly [string, string])[]).map(
                  ([id, label]) => (
                    <label className="choice-row" key={id}>
                      <input
                        type="radio"
                        name={key}
                        checked={
                          {
                            purpose: draft.purposeId,
                            measurement: draft.measurementReasonId,
                            tradeoff: draft.primaryFigureTradeoffId,
                            support: draft.supportConditionId,
                            nonSupport: draft.nonSupportConditionId,
                            inconclusive: draft.inconclusiveConditionId,
                            claim: draft.claimScopeId,
                          }[key] === id
                        }
                        onChange={() =>
                          void update(key, id, {
                            [{
                              purpose: "purposeId",
                              measurement: "measurementReasonId",
                              tradeoff: "primaryFigureTradeoffId",
                              support: "supportConditionId",
                              nonSupport: "nonSupportConditionId",
                              inconclusive: "inconclusiveConditionId",
                              claim: "claimScopeId",
                            }[key]]: id,
                          })
                        }
                      />
                      {label}
                    </label>
                  ),
                )}
              </fieldset>
            ))}
          </section>
          <section>
            <h2>比較するsnapshot</h2>
            <fieldset>
              <legend>比較方法</legend>
              {(
                [
                  "all-planned",
                  "milestones",
                  "endpoints",
                ] as ComparisonStrategy[]
              ).map((id) => (
                <label className="choice-row" key={id}>
                  <input
                    type="radio"
                    name="comparison"
                    checked={draft.comparisonStrategy === id}
                    onChange={() => {
                      const ids = plan?.resolved.snapshotIds ?? [];
                      const selected =
                        id === "endpoints"
                          ? [ids[0], ids.at(-1)]
                          : id === "milestones"
                            ? [
                                ids[0],
                                ids[Math.floor(ids.length / 2)],
                                ids.at(-1),
                              ]
                            : ids;
                      void update("comparison", id, {
                        comparisonStrategy: id,
                        snapshotIds: selected.filter(Boolean) as never,
                      });
                    }}
                  />
                  {
                    {
                      "all-planned": "計画した全snapshot",
                      milestones: "代表的な三時代",
                      endpoints: "始点と終点",
                    }[id]
                  }
                </label>
              ))}
            </fieldset>
          </section>
          <section>
            <h2>補助図</h2>
            <fieldset>
              <legend>主図と組み合わせる図</legend>
              {["density-panels", "histogram", "sigma-growth"]
                .filter((x) => x !== plan?.subjectSnapshot.draft.plannedFigure)
                .map((id) => (
                  <label className="choice-row" key={id}>
                    <input
                      type="checkbox"
                      checked={draft.supportingFigureIds.includes(id)}
                      onChange={(e) =>
                        void update("supporting-figure", id, {
                          supportingFigureIds: e.target.checked
                            ? [...draft.supportingFigureIds, id]
                            : draft.supportingFigureIds.filter((x) => x !== id),
                        })
                      }
                    />
                    {id}
                  </label>
                ))}
            </fieldset>
            <p>
              密度mapは共通カラースケール、histogramは共通bin境界で比較します。
            </p>
          </section>
          <section>
            <h2>解析mode</h2>
            <p>
              どちらを選んでも、使うデータ、数式、科学的な問い、AnalysisRecipeは同じです。
            </p>
            <fieldset className="mode-grid">
              <legend>学習方法</legend>
              {(
                ["guided-operations", "python-with-mira"] as AnalysisModeId[]
              ).map((id) => (
                <label className="mode-card" key={id}>
                  <input
                    type="radio"
                    name="mode"
                    checked={draft.modeId === id}
                    onChange={() =>
                      void update("mode", id, {
                        modeId: id,
                        pythonSupportLevel:
                          id === "python-with-mira"
                            ? draft.pythonSupportLevel
                            : null,
                      })
                    }
                  />
                  <strong>
                    {id === "guided-operations"
                      ? "操作で解析"
                      : "Pythonと一緒に解析"}
                  </strong>
                  <span>
                    {id === "guided-operations"
                      ? "操作画面で数式、入力、計算内容、履歴を一つずつ確認します。"
                      : "同じレシピを使い、S11でMiraとコードを一行ずつ組み立てます。未経験でも選べます。"}
                  </span>
                </label>
              ))}
            </fieldset>
            {draft.modeId === "python-with-mira" && (
              <fieldset>
                <legend>Python支援水準（能力試験ではありません）</legend>
                {(
                  [
                    "first-time",
                    "basic-experience",
                    "think-and-write",
                  ] as PythonSupportLevel[]
                ).map((id) => (
                  <label className="choice-row" key={id}>
                    <input
                      type="radio"
                      name="python-support"
                      checked={draft.pythonSupportLevel === id}
                      onChange={() =>
                        void update("python-support", id, {
                          pythonSupportLevel: id,
                        })
                      }
                    />
                    {
                      {
                        "first-time": "Pythonは初めて",
                        "basic-experience": "基本文法を少し学んだ",
                        "think-and-write": "自分で考えながら書きたい",
                      }[id]
                    }
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset>
              <legend>modeを選ぶ理由</legend>
              {[
                ["stepwise", "処理を一つずつ確かめたい"],
                ["connect-code", "変数と科学的な意味を対応付けたい"],
              ].map(([id, label]) => (
                <label className="choice-row" key={id}>
                  <input
                    type="radio"
                    name="mode-reason"
                    checked={draft.modeReasonIds.includes(id)}
                    onChange={() =>
                      void update("mode-reason", id, { modeReasonIds: [id] })
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p>
              <strong>この段階ではPythonを実行しません。</strong>
              S11Aでは同じ科学定義の操作解析で基準結果を確認できます。Pythonコードの組み立てと実行は、独立したS11Bで扱います。
            </p>
          </section>
          <details>
            <summary>数式で確認する</summary>
            <p>
              qᵢ = ρᵢ / ρ̄、δᵢ = qᵢ − 1。σδ は二次元投影grid全体を母集団として N
              で割る標準偏差です。N−1は使いません。高密度割合の基準は qᵢ ≥
              2、すなわち δᵢ ≥ 1です。
            </p>
          </details>
          <p>
            未完了項目: {validateDraft(project, draft).join("、") || "なし"}
          </p>
          {error && (
            <p role="alert" className="validation-summary">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={saving || validateDraft(project, draft).length > 0}
            aria-busy={saving || undefined}
            onClick={() => void finish()}
          >
            解析レシピを保存する
          </button>
          {saving && <p role="status">保存しています…</p>}
        </>
      )}
      {completeRecord && !draft && (
        <section>
          <h2>解析レシピを保存しました</h2>
          <p>
            問い、測定量、比較、図が一本につながりました。次はこの設計に従って実際に計算します。教育用fixtureであるという制約は、結果の解釈にも引き継ぎます。
          </p>
          <p>
            次は、この解析レシピに従って実際にデータを計算し、図を作ります。
          </p>
          <h3>保存済みrecipe history</h3>
          <ol>
            {project.analysisRecipes.map((x) => (
              <li key={x.recipeId}>
                version {x.versionNumber} — {x.modeDecision.modeId}
              </li>
            ))}
          </ol>
          <button className="primary" onClick={onStartAnalysis}>
            解析と図の作成を始める
          </button>
        </section>
      )}
      <section>
        <h2>用語を確認する</h2>
        {[
          "measurement",
          "density",
          "density-contrast",
          "histogram",
          "standard-deviation",
          "population",
          "map",
          "color-scale",
          "bin",
          "hypothesis",
        ].map((id) => (
          <button
            className="link-button"
            key={id}
            onClick={() => onGlossary(id)}
          >
            {(
              {
                measurement: "測定量",
                "density-contrast": "密度コントラスト",
                histogram: "ヒストグラム",
                "standard-deviation": "標準偏差",
                population: "母集団",
                "color-scale": "カラースケール",
                bin: "ビン（階級）",
                hypothesis: "仮説",
                density: "密度",
                map: "密度画像",
              } as Record<string, string>
            )[id] ?? id}
          </button>
        ))}
      </section>
    </article>
  );
}
