import {
  RESEARCH_STAGES,
  type ProjectState,
  type ResearchStage,
} from "../../domain/project";
import { supportFor } from "../../content/ja/support/stageSupport";

/* eslint-disable react-refresh/only-export-components -- cycle metadata is intentionally exported for invariant tests. */

export const researchCycle = [
  {
    label: "問いと計画",
    stages: [
      "home",
      "invitation",
      "question",
      "hypothesis",
      "method",
      "planning",
      "plan-review",
      "pilot",
    ],
  },
  { label: "データを得る", stages: ["execution"] },
  { label: "整えて確かめる", stages: ["quality"] },
  { label: "解析する", stages: ["analysis-mode", "analysis"] },
  { label: "図を作って解釈する", stages: ["interpretation"] },
  { label: "論文にまとめる", stages: ["paper"] },
  { label: "次の問い", stages: ["constellation"] },
] as const satisfies readonly {
  label: string;
  stages: readonly ResearchStage[];
}[];

function completedStages(project: ProjectState): Set<ResearchStage> {
  const done = new Set<ResearchStage>();
  if (project.currentStage !== "home") done.add("home");
  if (project.motivation) done.add("invitation");
  if (project.researchQuestion) done.add("question");
  if (project.prediction) done.add("hypothesis");
  if (project.methodUnderstanding.completedAt) done.add("method");
  if (project.researchPlanDraft.completedAt) done.add("planning");
  if (project.planReviewCompletedAt && project.activePlanVersionId)
    done.add("plan-review");
  if (
    project.pilot?.status === "complete" &&
    project.pilot.resultingPlanVersionId === project.activePlanVersionId
  )
    done.add("pilot");
  return done;
}

export function ResearchCycleBar({ project }: { project: ProjectState }) {
  const done = completedStages(project);
  return (
    <nav className="research-cycle" aria-label="研究サイクル">
      <div className="cycle-heading">
        <p className="eyebrow">研究サイクル</p>
        <p>
          <strong>現在：</strong>
          {supportFor(project).currentLabel}
        </p>
      </div>
      <ol>
        {researchCycle.map((phase) => {
          const current = phase.stages.includes(project.currentStage as never);
          const complete = phase.stages.every((stage) => done.has(stage));
          const state = current ? "現在" : complete ? "完了" : "未着手";
          return (
            <li
              key={phase.label}
              className={`cycle-${state}`}
              aria-current={current ? "step" : undefined}
            >
              <span aria-hidden="true">
                {state === "完了" ? "✓" : state === "現在" ? "●" : "○"}
              </span>
              <span>{phase.label}</span>
              <small>{state}</small>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function assignedResearchStages() {
  return researchCycle.flatMap((phase) => phase.stages);
}
export { RESEARCH_STAGES };
