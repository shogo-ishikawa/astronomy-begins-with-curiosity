import type { ProjectState } from "../../domain/project";
export function ResearchProgress({ project }: { project: ProjectState }) {
  return (
    <aside className="progress-panel" aria-labelledby="progress-title">
      <p className="eyebrow">研究サイクル</p>
      <h2 id="progress-title">進捗</h2>
      <ol>
        <li className="done">✓ 研究の準備</li>
        <li aria-current="step">
          {project.motivation ? "✓ " : ""}研究への招待
        </li>
        <li aria-disabled="true">研究課題（次のPhase）</li>
      </ol>
      <p className="progress-summary">
        {project.motivation
          ? "関心を記録済み"
          : project.currentStage === "invitation"
            ? "招待を探索中"
            : "開始前"}
      </p>
    </aside>
  );
}
