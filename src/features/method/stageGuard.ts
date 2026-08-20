import type { ProjectState } from "../../domain/project";
import { isMethodComplete } from "./logic";
const order = [
  "home",
  "invitation",
  "question",
  "hypothesis",
  "method",
] as const;
export type ImplementedStage = (typeof order)[number];
export function firstAvailableStage(project: ProjectState): ImplementedStage {
  if (!project.motivation)
    return project.currentStage === "home" ? "home" : "invitation";
  if (!project.researchQuestion?.choiceId) return "question";
  if (!project.hypothesis?.choiceId || !project.prediction?.choiceId)
    return "hypothesis";
  return "method";
}
export function guardStage(
  project: ProjectState,
  requested: ImplementedStage,
): ImplementedStage {
  const available = firstAvailableStage(project);
  return order.indexOf(requested) > order.indexOf(available)
    ? available
    : requested;
}
export function canEnterPlanning(project: ProjectState) {
  return isMethodComplete(project.methodUnderstanding);
}
export function guardReason(stage: ImplementedStage) {
  const labels = {
    home: "研究の準備",
    invitation: "関心の選択",
    question: "研究課題の選択",
    hypothesis: "仮説と予想の選択",
    method: "方法の理解",
  };
  return `先へ進む前に、${labels[stage]}を完了しましょう。既存の回答は残っています。`;
}
