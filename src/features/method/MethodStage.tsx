import { StageLearningFrame } from "../../components/stage/StageLearningFrame";
import { stageLearning } from "../../content/ja/stageLearning";
import { useState } from "react";
import { methodContent } from "../../content/ja/method/content";
import type { ProjectState } from "../../domain/project";
import { isCorrect, understoodQuestionIds } from "./logic";
import { PeriodicBoundaryDiagram } from "./PeriodicBoundaryDiagram";
import { orderChoices } from "../../domain/choiceOrder";
import { StageSectionNav } from "../../components/stage/StageSectionNav";
import { StageSection } from "../../components/stage/StageSection";
import { StageActions } from "../../components/stage/StageActions";
import { StageDecisionSummary } from "../../components/stage/StageDecisionSummary";
interface Props {
  project: ProjectState;
  onAnswer: (questionId: string, choiceId: string) => void;
  back: () => void;
  next?: () => void;
  onGlossary: (id: string) => void;
}
export function MethodStage({
  project,
  onAnswer,
  back,
  next,
  onGlossary,
}: Props) {
  const [section, setSection] = useState(0);
  const [attempted, setAttempted] = useState<Record<string, string>>({});
  const understood = understoodQuestionIds(project.methodUnderstanding);
  const contentSection = methodContent.sections[section];
  const navigateSection = (id: string, focus = true) => {
    const index = methodContent.sections.findIndex((item) => item.id === id);
    if (index < 0) return;
    setSection(index);
    if (focus)
      requestAnimationFrame(() =>
        document
          .getElementById(`method-${id}-title`)
          ?.focus({ preventScroll: true }),
      );
  };
  const answer = (questionId: string, choiceId: string) => {
    setAttempted((old) => ({ ...old, [questionId]: choiceId }));
    onAnswer(questionId, choiceId);
  };
  return (
    <article className="stage method-stage">
      <p className="eyebrow">S04 · 方法の理解</p>
      <h1 id="stage-title" tabIndex={-1}>
        この方法で、何がわかる？
      </h1>
      <StageLearningFrame content={stageLearning.method} />
      <p className="lead">
        研究計画を立てる前に、方法の強みと限界を五つの段階で確かめます。仮説の正誤はここでは判定しません。
      </p>
      <StageSectionNav
        activeId={`method-${contentSection.id}`}
        onNavigate={(id) => navigateSection(id.replace("method-", ""))}
        items={methodContent.sections.map((item, index) => ({
          id: `method-${item.id}`,
          label: item.heading,
          state:
            index < section
              ? "選択済み"
              : index === section
                ? "検討中"
                : "未着手",
        }))}
      />
      <StageSection
        id={`method-${contentSection.id}`}
        title={contentSection.heading}
        description="研究方法の強みと限界を考える項目です。"
        state="検討中"
        open
        onToggle={() => undefined}
      >
        <p className="eyebrow">まず観察・考える</p>
        <p className="lead">{contentSection.lead}</p>
        {contentSection.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {contentSection.id === "periodic" && <PeriodicBoundaryDiagram />}
        {contentSection.id === "scope" && (
          <table className="scope-table">
            <caption>暗黒物質のみの計算に含まれる物理の比較</caption>
            <thead>
              <tr>
                <th scope="col">区分</th>
                <th scope="col">内容</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">✓ 含む</th>
                <td>
                  暗黒物質の重力、運動、密度分布の時間変化、宇宙の大規模構造
                </td>
              </tr>
              <tr>
                <th scope="row">— 直接含まない</th>
                <td>
                  ガスの圧力・冷却・放射、星形成、フィードバック、磁場、銀河の光
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <div className="term-actions" aria-label="この節の関連用語">
          {contentSection.glossaryTerms.map((id) => (
            <button key={id} onClick={() => onGlossary(id)}>
              用語を確認：
              {id === "n-body"
                ? "N体シミュレーション"
                : id === "random-seed"
                  ? "乱数シード"
                  : id === "periodic-boundary"
                    ? "周期境界条件"
                    : id === "dark-matter"
                      ? "暗黒物質"
                      : id === "cosmic-web"
                        ? "宇宙の大規模構造"
                        : id === "redshift"
                          ? "赤方偏移"
                          : id === "computational-particle"
                            ? "計算粒子"
                            : id === "initial-condition"
                              ? "初期条件"
                              : "シミュレーション"}
            </button>
          ))}
        </div>
        <StageActions
          index={section}
          count={methodContent.sections.length}
          onPrevious={() =>
            navigateSection(methodContent.sections[section - 1].id)
          }
          onNext={() => navigateSection(methodContent.sections[section + 1].id)}
        />
      </StageSection>
      <section aria-labelledby="check-title">
        <p className="eyebrow">理解確認</p>
        <h2 id="check-title">理由まで説明できるか確かめる</h2>
        <p>
          得点やランキングはありません。誤答しても説明を読んで再挑戦できます。
        </p>
        {methodContent.questions.map((q, index) => {
          const saved = project.methodUnderstanding.answers.find(
            (a) => a.questionId === q.id,
          );
          const shown = attempted[q.id];
          const selected = shown ?? saved?.choiceId;
          const correct = understood.has(q.id);
          const choice = q.choices.find((c) => c.id === selected);
          return (
            <fieldset
              className={`knowledge-check ${correct ? "understood" : ""}`}
              key={q.id}
            >
              <legend>
                {index + 1}. {q.prompt}
              </legend>
              <p className="question-status">
                {correct ? "✓ 理解済み" : "○ 確認中"}
              </p>
              {orderChoices(
                q.choices,
                {
                  kind: "stable-shuffle",
                  orderVersion: 1,
                  pinToEnd: ["unsure"],
                },
                {
                  choiceOrderSeed: project.choiceOrderSeed,
                  themeId: project.themeId,
                  groupId: `s04-${q.id}`,
                },
              ).map((c) => (
                <label key={c.id}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={selected === c.id}
                    onChange={() => answer(q.id, c.id)}
                  />
                  {c.label}
                </label>
              ))}
              {shown && choice && (
                <div
                  className={`feedback ${isCorrect(q.id, shown) ? "correct" : "retry"}`}
                  role="status"
                >
                  <strong>
                    {isCorrect(q.id, shown)
                      ? "✓ 正しく理解できています"
                      : shown === "unsure"
                        ? "ヒント"
                        : "△ もう一度考えてみましょう"}
                  </strong>
                  <p>{choice.feedback}</p>
                  {shown === "unsure" && <p>{q.hint}</p>}
                  {!isCorrect(q.id, shown) && shown !== "unsure" && (
                    <button
                      onClick={() =>
                        setAttempted((old) => ({ ...old, [q.id]: "" }))
                      }
                    >
                      説明を踏まえて再挑戦
                    </button>
                  )}
                </div>
              )}
              <p className="course-note">
                授業とのつながり：{q.courses.join("・")}
              </p>
            </fieldset>
          );
        })}
      </section>
      {project.methodUnderstanding.completedAt ? (
        <div className="completion-notice">
          <strong>✓ S04 方法の理解を完了しました</strong>
          <p>
            観測との関係、計算粒子、乱数シード、周期境界、暗黒物質のみの計算の限界を確認しました。次は研究計画です（Phase
            研究計画案では、値と理由を自分で選びます。
          </p>
          <button className="primary" onClick={next ?? (() => undefined)}>
            研究計画案を作る
          </button>
        </div>
      ) : (
        <div className="notice" role="status">
          <strong>まだS04は完了していません</strong>
          <p>
            全5問を理解済みにすると完了します。理解済みの回答は保持されます（
            {understood.size} / 5）。
          </p>
        </div>
      )}
      <StageDecisionSummary
        data={{
          purpose:
            "宇宙論的N体シミュレーションで研究課題に答えられる範囲を明らかにすること",
          choices: `${understood.size}項目の理解を確認`,
          evidence:
            "教材の説明、周期境界条件の模式図、暗黒物質のみの計算に含まれる物理の比較",
          limitation: "理由はまだ記録されていません",
          unknown: "ガス、星形成、銀河の光はこの計算から直接は分かりません",
          nextQuestion: "どの計算条件とスナップショットを研究計画に選ぶか",
        }}
      />
      <button onClick={back}>← 仮説と予想へ戻る</button>
    </article>
  );
}
