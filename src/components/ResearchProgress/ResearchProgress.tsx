import type { ProjectState } from "../../domain/project";
export function ResearchProgress({ project }: { project: ProjectState }) {
  return (
    <aside className="progress-panel" aria-labelledby="progress-title">
      <p className="eyebrow">研究サイクル</p>
      <h2 id="progress-title">進捗</h2>
      <ol>
        <li className="done">✓ 研究の準備</li>
        <li
          aria-current={
            project.currentStage === "invitation" ? "step" : undefined
          }
        >
          {project.motivation ? "✓ " : ""}研究への招待
        </li>
        <li
          aria-current={
            project.currentStage === "question" ? "step" : undefined
          }
        >
          {project.researchQuestion ? "✓ " : ""}研究課題
        </li>
        <li
          aria-current={
            project.currentStage === "hypothesis" ? "step" : undefined
          }
        >
          {project.prediction ? "✓ " : ""}仮説と予想
        </li>
        <li
          aria-current={project.currentStage === "method" ? "step" : undefined}
        >
          {project.methodUnderstanding.completedAt ? "✓ " : ""}方法の理解
        </li>
        <li aria-disabled="true">研究計画（次のPhase）</li>
      </ol>
      <p className="progress-summary">
        {project.methodUnderstanding.completedAt
          ? "方法の理解を完了"
          : project.currentStage === "method"
            ? "方法の強みと限界を確認中"
            : project.prediction
              ? "研究計画の芯を記録済み"
              : project.researchQuestion
                ? "研究課題を作成中"
                : project.motivation
                  ? "関心を記録済み"
                  : project.currentStage === "invitation"
                    ? "招待を探索中"
                    : "開始前"}
      </p>
    </aside>
  );
}
