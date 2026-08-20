export const priorities = [
  {
    id: "large-web",
    label: "大きな宇宙の網目を捉える",
    strength: "広い範囲のフィラメントや多様な領域を比べやすくなります。",
    limit: "同じ粒子数では小さな高密度領域を細かく捉えにくくなります。",
  },
  {
    id: "dense-detail",
    label: "小さな高密度領域を詳しく捉える",
    strength: "物質が集まる場所を細かく標本化しやすくなります。",
    limit: "大きな構造を十分に含められない場合があります。",
  },
  {
    id: "balance",
    label: "大きさと細かさのバランスを取る",
    strength: "体積と粒子間隔の両方を比較できます。",
    limit: "どちらか一方を最大限に優先する計画ではありません。",
  },
] as const;
export const snapshots = [
  { id: "initial", label: "計算開始時（開始赤方偏移は実行時に確定）" },
  {
    id: "z10",
    label: "z = 10（初期の銀河が存在し始める時代に対応する暗黒物質分布）",
  },
  { id: "z5", label: "z = 5" },
  { id: "z2", label: "z = 2" },
  { id: "z1", label: "z = 1" },
  { id: "z0", label: "z = 0（現在）" },
] as const;
export const analyses = [
  {
    id: "density-image",
    label: "密度画像",
    text: "物質がどこに集まり、フィラメント、ノード、ノット、ボイドがどう見えるかを調べます。比較時は投影方向、範囲、格子、平滑化、色の範囲を揃えます。",
  },
  {
    id: "sigma-delta",
    label: "密度コントラストの標準偏差 σδ",
    text: "δ = (ρ − ρ̄) / ρ̄ のばらつきです。統計学の分散・標準偏差で、分布がどの程度むらの大きな状態になったかを比べます。",
  },
  {
    id: "dense-fraction",
    label: "高密度領域の割合",
    text: "決めた密度のしきい値を超える領域の割合です。しきい値、格子、平滑化に依存し、銀河や銀河団そのものの個数ではありません。",
  },
] as const;
export const figures = [
  { id: "density-panels", label: "複数時刻の密度画像を同じ条件で並べる" },
  { id: "sigma-growth", label: "σδ を赤方偏移またはスケール因子に対して描く" },
  {
    id: "dense-growth",
    label: "高密度領域の割合を赤方偏移またはスケール因子に対して描く",
  },
] as const;
export const patterns = [
  ["increase", "増えると思う"],
  ["decrease", "減ると思う"],
  ["stable", "あまり変化しないと思う"],
  ["complex", "単純な変化にはならないと思う"],
  ["unsure", "まだわからない"],
] as const;
export const reasons = [
  ["evidence", "問いに必要な証拠とつながるから"],
  ["tradeoff", "長所と限界を比べたから"],
  ["baseline", "CWSの基準設定と比較しやすいから"],
  ["familiar", "見慣れた値や図だから"],
  ["unsure", "まだわからない"],
] as const;
