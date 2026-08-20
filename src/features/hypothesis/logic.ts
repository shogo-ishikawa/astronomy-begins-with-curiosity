import { measurements, questions } from "../question/logic";
export const hypotheses = [
  {
    id: "gravity-growth",
    label: "重力によって密度のむらは成長する",
    direction: "increase",
  },
  {
    id: "expansion-uniform",
    label: "宇宙膨張によって分布はより一様になる",
    direction: "decrease",
  },
  {
    id: "stable",
    label: "むらの強さはほとんど変わらない",
    direction: "unchanged",
  },
  { id: "uncertain", label: "まだわからない", direction: "uncertain" },
] as const;
export const predictionReasons = [
  "重力は物質を集める方向に働くと考えた",
  "宇宙膨張は物質同士の距離を広げると考えた",
  "初期の小さな違いは、その後も大きく変わらないと考えた",
  "データを見る前には判断できないと考えた",
  "仮説とは異なる可能性も比較したい",
].map((label, i) => ({ id: `prediction-reason-${i + 1}`, label }));
const sets: Record<string, string[]> = {
  images: [
    "現在に近づくほどフィラメントやノード（ノット）が明瞭になる",
    "現在に近づくほど分布が一様に見える",
    "時刻が変わっても見え方はほとんど変わらない",
    "まだ予想できない",
  ],
  "standard-deviation": [
    "現在に近づくほど標準偏差が大きくなる",
    "現在に近づくほど標準偏差が小さくなる",
    "標準偏差はほとんど変わらない",
    "まだ予想できない",
  ],
  "dense-fraction": [
    "現在に近づくほど高密度領域の割合が増える",
    "現在に近づくほど高密度領域の割合が減る",
    "高密度領域の割合はほとんど変わらない",
    "まだ予想できない",
  ],
};
export function predictionChoices(measurementId: string, questionId: string) {
  let key = measurementId;
  if (key === "combined")
    key =
      questionId === "web-emergence"
        ? "images"
        : questionId === "dense-fraction"
          ? "dense-fraction"
          : "standard-deviation";
  return (sets[key] ?? sets.images!).map((label, i) => ({
    id: `${key}-${i}`,
    label,
    direction: (["increase", "decrease", "unchanged", "uncertain"] as const)[
      i
    ]!,
  }));
}
export function hypothesisPredictionAligned(
  hypothesisId: string,
  direction: string,
) {
  const expected = hypotheses.find((x) => x.id === hypothesisId)?.direction;
  return expected === "uncertain" || expected === direction;
}
export function logicChain(
  motivation: string,
  q: { choiceId: string; measurementId: string },
  hypothesisId: string,
  predictionLabel: string,
) {
  const question = questions.find((x) => x.id === q.choiceId)?.label ?? "問い";
  const measurement =
    measurements.find((x) => x.id === q.measurementId)?.label ?? "測定対象";
  const hypothesis =
    hypotheses.find((x) => x.id === hypothesisId)?.label ?? "仮説";
  return `私は${motivation}を調べるために${measurement}を比較する。もし${hypothesis}なら、${predictionLabel}と考える。（主研究課題：${question}）`;
}
