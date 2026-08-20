import { methodContent } from "../../content/ja/method/content";
import type { ProjectState } from "../../domain/project";
export type MethodRecord = ProjectState["methodUnderstanding"];
export function isCorrect(questionId: string, choiceId: string) {
  return (
    methodContent.questions.find((q) => q.id === questionId)
      ?.correctChoiceId === choiceId
  );
}
export function understoodQuestionIds(record: MethodRecord) {
  return new Set(
    record.answers
      .filter((a) => isCorrect(a.questionId, a.choiceId))
      .map((a) => a.questionId),
  );
}
export function isMethodComplete(record: MethodRecord) {
  const understood = understoodQuestionIds(record);
  return methodContent.questions
    .filter((q) => q.required)
    .every((q) => understood.has(q.id));
}
export function answerMethod(
  record: MethodRecord,
  questionId: string,
  choiceId: string,
  answeredAt: string,
): MethodRecord {
  const answers = [
    ...record.answers.filter((a) => a.questionId !== questionId),
    { questionId, choiceId, answeredAt },
  ];
  const next = {
    ...record,
    contentId: methodContent.contentId,
    answers,
    completedAt: null,
  };
  return { ...next, completedAt: isMethodComplete(next) ? answeredAt : null };
}
