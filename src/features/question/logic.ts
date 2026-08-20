import type { ProjectState } from "../../domain/project";

export const questions = [
  {
    id: "fluctuation-growth",
    label: "物質密度のむらの強さは、宇宙の時間とともにどのように変わるか",
  },
  {
    id: "web-emergence",
    label: "網目状構造は、宇宙のどの時代から明瞭に見えるようになるか",
  },
  {
    id: "dense-fraction",
    label: "高密度領域の占める割合は、宇宙の時間とともにどのように変わるか",
  },
  {
    id: "gravity-scope",
    label: "暗黒物質と重力だけの計算で、宇宙の網目の成長をどこまで説明できるか",
  },
];
export const measurements = [
  { id: "images", label: "複数時刻の密度画像を並べ、網目模様の変化を比較する" },
  {
    id: "standard-deviation",
    label: "密度コントラストの標準偏差を計算し、むらの強さを数値で比べる",
  },
  {
    id: "dense-fraction",
    label: "一定以上の高密度領域が占める割合を時刻ごとに比べる",
  },
  { id: "combined", label: "密度画像と数値指標を組み合わせて調べる" },
];
export const timeFocus = [
  "初期から現在までの変化全体",
  "構造が見え始める時期",
  "現在に近づく間の成長",
  "まだ決められない",
].map((label, i) => ({
  id: ["whole", "emergence", "late", "uncertain"][i]!,
  label,
}));
export const spaceFocus = [
  "箱全体に広がる大きな網目",
  "小さな高密度領域",
  "大きな網目と小さな高密度領域の両方",
  "まだ決められない",
].map((label, i) => ({
  id: ["large-web", "small-dense", "both", "uncertain"][i]!,
  label,
}));
export const reviewReasons = [
  "探索的に複数の特徴を見たい",
  "直接の測定量だけでなく補助的な証拠も調べたい",
  "まだ対応を判断できないので、後の計画で見直したい",
].map((label, i) => ({ id: `reason-${i + 1}`, label }));
export function suggestedQuestions(motivationId: string) {
  return ({
    formation: ["web-emergence", "fluctuation-growth"],
    timing: ["web-emergence"],
    density: ["dense-fraction", "fluctuation-growth"],
    gravity: ["gravity-scope"],
    unsure: ["fluctuation-growth", "web-emergence"],
  }[motivationId] ?? ["fluctuation-growth"]) as string[];
}
export function questionMeasurementAligned(
  questionId: string,
  measurementId: string,
) {
  return (
    measurementId === "combined" ||
    (
      {
        "fluctuation-growth": "standard-deviation",
        "web-emergence": "images",
        "dense-fraction": "dense-fraction",
        "gravity-scope": "combined",
      } as Record<string, string>
    )[questionId] === measurementId
  );
}
const find = (items: { id: string; label: string }[], id: string) =>
  items.find((x) => x.id === id)?.label ?? "未選択";
export function questionSummary(
  q: NonNullable<ProjectState["researchQuestion"]>,
) {
  return `私は${find(questions, q.choiceId)}を明らかにするために、${find(measurements, q.measurementId)}を用いて、${find(timeFocus, q.timeFocusId)}における${find(spaceFocus, q.spaceFocusId)}の変化を調べる。`;
}
