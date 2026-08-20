import { ChoiceCards } from "../../components/ChoiceCards/ChoiceCards";
import { CourseConnection } from "../../components/CourseConnection/CourseConnection";
import { RichText } from "../../components/RichText";
import type { ProjectState } from "../../domain/project";
import { invitationContent, motivationChoices } from "./content";
import { CosmicWebDiagram } from "./CosmicWebDiagram";

export function Invitation({
  project,
  onGlossary,
  onChoice,
  note,
  onNote,
  onNext,
}: {
  project: ProjectState;
  onGlossary: (id: string) => void;
  onChoice: (id: string) => void;
  note: string;
  onNote: (value: string) => void;
  onNext: () => void;
}) {
  const paragraph = (text: string) => (
    <RichText text={text} onGlossary={onGlossary} />
  );
  return (
    <article className="invitation" aria-labelledby="stage-title">
      <p className="eyebrow">S01 研究への招待</p>
      <h1 id="stage-title" tabIndex={-1}>
        {invitationContent.question}
      </h1>
      <p className="lead">
        まず図を眺めてください。答えを覚えるのではなく、左右で何が違うように見えるかを自分の言葉で考えてみましょう。
      </p>
      <CosmicWebDiagram onGlossary={onGlossary} />
      <section>
        <h2>何が不思議なのでしょう</h2>
        <p>{paragraph(invitationContent.mystery)}</p>
      </section>
      <section>
        <h2>分かると何につながるのでしょう</h2>
        <p>{paragraph(invitationContent.connection)}</p>
      </section>
      <section>
        <h2>どの方法で調べるのでしょう</h2>
        <p>{paragraph(invitationContent.method)}</p>
      </section>
      <section>
        <h2>あなたが今回行う研究</h2>
        <p>{paragraph(invitationContent.student)}</p>
      </section>
      <CourseConnection />
      <section className="motivation-section">
        <p className="eyebrow">あなたの最初の研究判断</p>
        <h2>どこが特に気になりましたか？</h2>
        <p>一つ選んでください。正誤はなく、あとから考え直せます。</p>
        <ChoiceCards
          choices={motivationChoices}
          value={project.motivation?.choiceId}
          onChange={onChoice}
          orderContext={{
            seed: project.choiceOrderSeed,
            themeId: project.themeId,
            groupId: "s01-motivation",
          }}
          pinToEnd={["unsure"]}
        />
        <label htmlFor="motivation-note">
          任意メモ（書かなくても進められます）
        </label>
        <textarea
          id="motivation-note"
          value={note}
          onChange={(event) => onNote(event.target.value)}
          rows={3}
          placeholder="図を見て考えたことを、自分の言葉で残せます。"
        />
        {project.motivation && (
          <div className="completion-notice" role="status">
            <strong>研究への招待を完了しました。</strong>
            <p>
              Miraは選んだ関心を受け止めました。関心を、データで調べられる問いへ変えてみましょう。
            </p>
            <button className="primary" onClick={onNext}>
              研究課題を考える
            </button>
          </div>
        )}
      </section>
    </article>
  );
}
