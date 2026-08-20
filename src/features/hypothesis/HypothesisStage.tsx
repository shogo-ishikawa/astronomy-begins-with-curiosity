import { ChoiceCards } from "../../components/ChoiceCards/ChoiceCards";
import { CourseConnection } from "../../components/CourseConnection/CourseConnection";
import type { ProjectState } from "../../domain/project";
import {
  logicChain,
  hypotheses,
  hypothesisPredictionAligned,
  predictionChoices,
  predictionReasons,
} from "./logic";
import {
  measurements,
  questions,
  spaceFocus,
  timeFocus,
} from "../question/logic";
import { motivationChoices } from "../invitation/content";
export function HypothesisStage({
  project,
  update,
  back,
  next,
  onGlossary,
}: {
  project: ProjectState;
  update: (field: string, value: string) => void;
  back: () => void;
  next: () => void;
  onGlossary: (id: string) => void;
}) {
  const q = project.researchQuestion!;
  const predictions = predictionChoices(q.measurementId, q.choiceId);
  const p = project.prediction;
  const aligned =
    project.hypothesis && p
      ? hypothesisPredictionAligned(project.hypothesis.choiceId, p.direction)
      : true;
  const complete = Boolean(
    project.hypothesis && p?.reasonId && (aligned || p.alignment.acknowledged),
  );
  const predLabel =
    predictions.find((x) => x.id === p?.choiceId)?.label ?? "未選択";
  return (
    <article className="stage">
      <p className="eyebrow">S03 仮説と予想</p>
      <h1 id="stage-title" tabIndex={-1}>
        結果を見る前の考えを記録する
      </h1>
      <p>
        <button
          className="glossary-link"
          onClick={() => onGlossary("hypothesis")}
        >
          仮説
        </button>
        は変化がなぜ起こるかという暫定的な説明、
        <button
          className="glossary-link"
          onClick={() => onGlossary("prediction")}
        >
          予想
        </button>
        は仮説が正しければデータに何が見えるかです。正解当てではなく、一致しない結果から考え直すことも研究です。後で修正しても、最初の記録は残ります。
      </p>
      <section>
        <h2>仮説</h2>
        <ChoiceCards
          label="仮説"
          choices={[...hypotheses]}
          value={project.hypothesis?.choiceId}
          onChange={(id) => update("hypothesis", id)}
          orderContext={{
            seed: project.choiceOrderSeed,
            themeId: project.themeId,
            groupId: "s03-hypothesis",
          }}
          pinToEnd={["uncertain"]}
        />
      </section>
      {project.hypothesis && (
        <section>
          <h2>測定対象に現れる予想</h2>
          <p>
            「{measurements.find((x) => x.id === q.measurementId)?.label}
            」に合わせた表現です。
          </p>
          <ChoiceCards
            label="予想"
            choices={predictions}
            value={p?.choiceId}
            onChange={(id) => update("prediction", id)}
            orderContext={{
              seed: project.choiceOrderSeed,
              themeId: project.themeId,
              groupId: "s03-prediction",
            }}
            pinToEnd={predictions
              .filter((x) => x.direction === "uncertain")
              .map((x) => x.id)}
          />
        </section>
      )}
      {p && (
        <section>
          <h2>そう予想した理由</h2>
          <ChoiceCards
            label="予想した理由"
            choices={predictionReasons}
            value={p.reasonId || undefined}
            onChange={(id) => update("predictionReason", id)}
            orderContext={{
              seed: project.choiceOrderSeed,
              themeId: project.themeId,
              groupId: "s03-prediction-reason",
            }}
          />
          <label>
            任意メモ
            <textarea
              value={p.note}
              onChange={(e) => update("predictionNote", e.target.value)}
              rows={3}
            />
          </label>
        </section>
      )}
      {project.hypothesis && p && !aligned && (
        <section className="review">
          <h2>仮説と予想の方向を確認しましょう</h2>
          <p>
            現在の仮説では「
            {
              hypotheses.find((x) => x.id === project.hypothesis!.choiceId)
                ?.direction
            }
            」の方向を考えていますが、予想では「{p.direction}
            」を選んでいます。両者は異なる方向を示しています。
          </p>
          <div className="actions">
            <button
              onClick={() =>
                document
                  .querySelector<HTMLElement>(
                    '[aria-label="仮説"] [role=radio]',
                  )
                  ?.focus()
              }
            >
              仮説を選び直す
            </button>
            <button
              onClick={() =>
                document
                  .querySelector<HTMLElement>(
                    '[aria-label="予想"] [role=radio]',
                  )
                  ?.focus()
              }
            >
              予想を選び直す
            </button>
            <button onClick={() => update("predictionReview", "intentional")}>
              異なる組合せを意図的に維持する
            </button>
          </div>
          {p.alignment.acknowledged && (
            <p>意図的に比較する判断を記録しました。</p>
          )}
        </section>
      )}
      {complete && p && (
        <section className="logic-chain">
          <h2>研究の論理チェーン</h2>
          <dl>
            <dt>最初に気になったこと</dt>
            <dd>
              {
                motivationChoices.find(
                  (x) => x.id === project.motivation!.choiceId,
                )?.label
              }
            </dd>
            <dt>主研究課題</dt>
            <dd>{questions.find((x) => x.id === q.choiceId)?.label}</dd>
            <dt>測定対象</dt>
            <dd>{measurements.find((x) => x.id === q.measurementId)?.label}</dd>
            <dt>時間と空間</dt>
            <dd>
              {timeFocus.find((x) => x.id === q.timeFocusId)?.label}／
              {spaceFocus.find((x) => x.id === q.spaceFocusId)?.label}
            </dd>
            <dt>仮説</dt>
            <dd>
              {
                hypotheses.find((x) => x.id === project.hypothesis!.choiceId)
                  ?.label
              }
            </dd>
            <dt>予想</dt>
            <dd>{predLabel}</dd>
            <dt>予想した理由</dt>
            <dd>{predictionReasons.find((x) => x.id === p.reasonId)?.label}</dd>
            <dt>Miraの確認</dt>
            <dd>
              {q.alignment.status}／{p.alignment.status}
            </dd>
          </dl>
          <p className="summary">
            {logicChain(
              motivationChoices.find(
                (x) => x.id === project.motivation!.choiceId,
              )?.label ?? "関心",
              q,
              project.hypothesis!.choiceId,
              predLabel,
            )}
          </p>
          <div className="completion-notice">
            <strong>研究計画の芯ができました。</strong>
            <p>
              次は、この問いを調べるために、なぜN体シミュレーションを使うのかを確認し、箱サイズ、粒子数、保存する時刻を決めます。
            </p>
          </div>
        </section>
      )}
      <CourseConnection context="hypothesis" />
      <button onClick={back}>研究課題へ戻る</button>
      {complete && (
        <button className="primary" onClick={next}>
          方法の理解へ進む
        </button>
      )}
    </article>
  );
}
