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
}: {
  project: ProjectState;
  onGlossary: (id: string) => void;
  onChoice: (id: string) => void;
  note: string;
  onNote: (value: string) => void;
}) {
  const paragraph = (text: string) => (
    <RichText text={text} onGlossary={onGlossary} />
  );
  return (
    <article className="invitation" aria-labelledby="invitation-title">
      <p className="eyebrow">S01 研究への招待</p>
      <h1 id="invitation-title">{invitationContent.question}</h1>
      <p className="lead">
        まず図を眺めてください。答えを覚えるのではなく、左右で何が違うように見えるかを自分の言葉で考えてみましょう。
      </p>
      <CosmicWebDiagram />
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
              次は、この関心を測定できる研究課題へ変えていきます。Phase
              1Aではここまでです。
            </p>
          </div>
        )}
      </section>
    </article>
  );
}
