import { formatSnapshotTime, snapshotTimes } from "../../domain/snapshotTime";

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
export const snapshots = snapshotTimes.map((item) => ({
  id: item.id as "initial" | "z10" | "z5" | "z2" | "z1" | "z0",
  label: formatSnapshotTime(item),
}));

export const planningExplanations = {
  boxAndParticles:
    "[[comoving-distance|共動座標・共動距離]]は宇宙全体の膨張を取り除いて位置を表します。箱の一辺は宇宙論で使う距離の単位[[h-inverse-mpc|h⁻¹ Mpc]]で示します。現在のDEMOでは h を確定していないため、通常のMpcへ勝手に換算しません。",
  particleSide:
    "[[particle-side|一辺あたりの粒子数]] N_side は立方体の一辺方向に置く[[computational-particle|計算粒子]]の数で、全粒子数は N_p = N_side³ です。一辺を2倍にすると全粒子数は8倍になります。二次元画像の画素数や表示グリッドではなく、増やしてもガスや星形成の物理は追加されません。",
  snapshots:
    "[[snapshot|スナップショット]]は写真ではなく、シミュレーションのある時点の計算状態を保存したデータです。内部では多数の細かい時間刻みで計算し、その一部だけを保存します。[[redshift|赤方偏移]]は z = 0 が現在で、大きいほど過去です。[[scale-factor|スケール因子]]は現在を a = 1 とした宇宙膨張の尺度で、a = 1 / (1 + z) です。赤方偏移は経過年数そのものではなく、宇宙年齢への変換は宇宙論モデルに依存します。スケール因子は宇宙年齢の割合でも、個々の天体の大きさでもありません。",
  densityField:
    "[[density-field|密度場]]は空間の各場所に物質密度を割り当てたものです。計算粒子そのものとは別で、粒子を格子へ数え上げたり平滑化したりして作ります。三次元密度場と[[projected-density|二次元投影密度]]も区別します。[[density-ratio|ρ/ρ̄]]は平均密度との比で無次元、密度コントラストは δ = ρ/ρ̄ − 1 です。",
} as const;

export const planningGlossaryIds = [
  "comoving-distance",
  "h-inverse-mpc",
  "particle-side",
  "computational-particle",
  "snapshot",
  "redshift",
  "scale-factor",
  "density-field",
  "projected-density",
  "density-ratio",
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
