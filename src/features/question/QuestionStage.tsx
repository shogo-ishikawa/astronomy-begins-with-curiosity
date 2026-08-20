import { ChoiceCards } from "../../components/ChoiceCards/ChoiceCards";
import { CourseConnection } from "../../components/CourseConnection/CourseConnection";
import type { ProjectState } from "../../domain/project";
import {
  measurements,
  questionMeasurementAligned,
  questions,
  questionSummary,
  reviewReasons,
  spaceFocus,
  suggestedQuestions,
  timeFocus,
} from "./logic";

export function QuestionStage({
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
  const q = project.researchQuestion;
  const aligned = q
    ? questionMeasurementAligned(q.choiceId, q.measurementId)
    : true;
  const complete = Boolean(
    q?.choiceId &&
      q.measurementId &&
      q.timeFocusId &&
      q.spaceFocusId &&
      (aligned || q.alignment.acknowledged),
  );
  const suggestions = suggestedQuestions(project.motivation!.choiceId);
  return (
    <article className="stage">
      <p className="eyebrow">S02 研究課題</p>
      <h1>関心を、データで調べられる問いへ</h1>
      <p>
        「宇宙の網目が気になる」は研究の出発点です。研究では、何を比べ、何が変わるかを含む形まで具体化します。最初から完璧な文章を書く必要はありません。一度に一つ、選択肢を組み合わせましょう。
      </p>
      <section>
        <h2>
          <button
            className="glossary-link"
            onClick={() => onGlossary("research-question")}
          >
            研究課題
          </button>
          を選ぶ
        </h2>
        <p>
          ★ Miraの候補:{" "}
          {suggestions
            .map((id) => questions.find((x) => x.id === id)?.label)
            .join("／")}
          。候補以外も自由に選べます。
        </p>
        <ChoiceCards
          label="主研究課題"
          choices={questions}
          value={q?.choiceId}
          onChange={(id) => update("choiceId", id)}
        />
      </section>
      {q?.choiceId && (
        <section>
          <h2>何をデータから調べますか</h2>
          <p>
            見た目を比べる方法と、分布を一つの数に要約する方法があります。
            <button
              className="glossary-link"
              onClick={() => onGlossary("measurement")}
            >
              測定量
            </button>
            は、問いに答える証拠です。
          </p>
          <ChoiceCards
            label="測定対象"
            choices={measurements}
            value={q.measurementId}
            onChange={(id) => update("measurementId", id)}
          />
        </section>
      )}
      {q?.measurementId && (
        <>
          <section>
            <h2>時間の焦点</h2>
            <ChoiceCards
              label="時間の焦点"
              choices={timeFocus}
              value={q.timeFocusId}
              onChange={(id) => update("timeFocusId", id)}
            />
          </section>
          <section>
            <h2>空間の焦点</h2>
            <ChoiceCards
              label="空間の焦点"
              choices={spaceFocus}
              value={q.spaceFocusId}
              onChange={(id) => update("spaceFocusId", id)}
            />
            {(q.timeFocusId === "uncertain" ||
              q.spaceFocusId === "uncertain") && (
              <p className="notice">
                「まだ決められない」も有効です。後の研究計画で再検討しましょう。
              </p>
            )}
          </section>
        </>
      )}
      {q && !aligned && (
        <section className="review" aria-labelledby="alignment-title">
          <h2 id="alignment-title">問いと測定量の対応を確認しましょう</h2>
          <p>
            現在の問い「{questions.find((x) => x.id === q.choiceId)?.label}
            」に対し、「
            {measurements.find((x) => x.id === q.measurementId)?.label}
            」だけでは直接対応しにくい組合せです。画像と数値の組合せ、または問いに直接対応する測定量なら答えやすくなります。不正解ではありません。
          </p>
          <div className="actions">
            <button
              onClick={() =>
                document
                  .querySelector<HTMLElement>(
                    '[aria-label="測定対象"] [role=radio]',
                  )
                  ?.focus()
              }
            >
              測定量を選び直す
            </button>
            <button
              onClick={() =>
                document
                  .querySelector<HTMLElement>(
                    '[aria-label="主研究課題"] [role=radio]',
                  )
                  ?.focus()
              }
            >
              問いを選び直す
            </button>
          </div>
          <h3>理解したうえで維持する理由</h3>
          <ChoiceCards
            label="組合せを維持する理由"
            choices={reviewReasons}
            value={q.alignment.reasonId ?? undefined}
            onChange={(id) => update("questionReview", id)}
          />
        </section>
      )}
      {q?.timeFocusId && q.spaceFocusId && (
        <section className="summary">
          <h2>研究課題の要約</h2>
          <p>{questionSummary(q)}</p>
          <label>
            任意メモ
            <textarea
              value={q.note}
              onChange={(e) => update("note", e.target.value)}
              rows={3}
            />
          </label>
        </section>
      )}
      <CourseConnection context="question" />
      <div className="actions">
        <button onClick={back}>研究への招待へ戻る</button>
        <button className="primary" disabled={!complete} onClick={next}>
          仮説と予想へ進む
        </button>
      </div>
    </article>
  );
}
