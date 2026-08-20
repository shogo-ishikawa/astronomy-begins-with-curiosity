export const REVIEW_RULE_SET_ID = "plan-review-rules-v1";
export const REVIEW_CONTENT_ID = "plan-review-ja-v1";

export const findingMessages: Record<string, string> = {
  "question-method-mismatch":
    "選んだ問いは時間変化を扱います。現在の一枚を丁寧に見る長所はありますが、それだけでは時刻間の変化を直接比較できません。複数時刻の密度画像、σδの時間変化、高密度領域の割合の時間変化のどれを使うかは、あなたがS05で選び直せます。",
  "question-method-strength":
    "研究課題、測定対象、主解析、主要図が同じ証拠を調べる流れでつながっています。仮説の正誤ではなく、検証できる計画になっている点を確認しました。",
  "prediction-figure-strength":
    "事前予想を、選んだ主要図で時刻間比較できる計画です。判断はデータを見た後にあなたが行います。",
  "density-comparison":
    "密度画像は形態変化を調べる主解析として成立します。将来は投影方向、範囲、格子、平滑化、色範囲を同じにして比較します。",
  "dense-fraction-dependency":
    "高密度領域の割合は比較に使えますが、しきい値、格子、平滑化に依存する量として解釈します。",
  "large-web-small-box":
    "大きな網目を優先し、L = 25 h⁻¹ Mpcを選びました。小箱は同じ粒子数なら細かく標本化しやすい長所がありますが、箱より大きな空間スケールを含められません。箱サイズか優先目的のどちらを見直すかはあなたが決めます。",
  "dense-detail-low-particles":
    "小さな高密度領域を優先し、Nside = 16を選びました。負荷を抑える長所はありますが、同じ箱の多粒子設定より標本化と相対的な質量分解能が粗くなります。平均粒子間隔は力の分解能そのものではありません。粒子数か優先目的をあなたが見直せます。",
  "wide-coarse":
    "L = 100 h⁻¹ Mpc、Nside = 16は広い体積を含められます。一方、基準設定より平均粒子間隔4倍、相対粒子質量64倍、粒子データ量1/8で、細かな構造を表しにくい設計です。設定のどちらを見直すかはあなたが決めます。",
  "snapshot-insufficient":
    "選んだスナップショットでは、比較に必要な時刻が不足しています。initialがなければ開始時、z = 0がなければ現在に対応する終点と比較できず、中間が2個未満または合計4個未満では変化がいつ進んだか判断しにくくなります。S05であなたが選び直します。",
  "snapshot-strength":
    "比較の始点、二つ以上の中間時刻、現在に対応する終点があり、変化の進み方を比べられます。",
  "resource-warning":
    "L = 100 h⁻¹ Mpc、Nside = 64は、基準設定と平均粒子間隔・相対粒子質量が同じで、体積、全粒子数、1スナップショット当たりの粒子データ量が8倍です。広い体積と細かな標本化を両立する一方、計算、メモリ、出力負荷が大きくなります。維持するか修正するかはあなたが決めます。",
  "resource-strength":
    "選んだ体積と粒子数の長所・負荷が、優先目的と矛盾しない範囲にあります。",
};

export const limitationChoices = [
  {
    id: "finite-volume",
    category: "finite",
    label: "有限の箱なので、箱より大きな空間スケールを含められない",
  },
  {
    id: "finite-particles",
    category: "finite",
    label: "有限の粒子数なので、小さな構造の表現には限界がある",
  },
  {
    id: "spacing-not-force",
    category: "analysis",
    label: "平均粒子間隔は力の分解能そのものではない",
  },
  {
    id: "single-realization",
    category: "seed",
    label:
      "一つの乱数シードは一つの宇宙の実現で、宇宙一般への一般化には限界がある",
  },
  {
    id: "dm-only",
    category: "physics",
    label:
      "暗黒物質のみの計算は、ガス冷却、星形成、フィードバック、放射、磁場を直接扱わない",
  },
  {
    id: "not-galaxy-formation",
    category: "physics",
    label:
      "高密度領域は銀河形成が進みやすい重力場になり得るが、銀河形成を直接確認したことにはならない",
  },
  {
    id: "discrete-snapshots",
    category: "analysis",
    label:
      "離散的なスナップショットだけでは、変化が起きた正確な時刻までは決められない",
  },
  {
    id: "projection-overlap",
    category: "analysis",
    label: "投影密度画像では、奥行き方向の異なる構造が重なる場合がある",
  },
  {
    id: "no-limit",
    category: "misconception",
    label: "この計画には限界がない",
  },
  {
    id: "particles-add-physics",
    category: "misconception",
    label: "粒子を増やせば、暗黒物質以外の物理も計算できる",
  },
  { id: "unsure", category: "unsure", label: "まだわからない" },
] as const;

export const warningReasons = [
  { id: "wide-volume", label: "負荷が増えても広い体積を優先したい" },
  {
    id: "matched-sampling",
    label: "基準と同じ粒子間隔を保って広い体積を比べたい",
  },
  {
    id: "tradeoff-study",
    label: "負荷と得られる情報のトレードオフを試し計算で確かめたい",
  },
] as const;

export const changeReasons = [
  { id: "address-review", label: "レビューの指摘を反映した" },
  { id: "change-priority", label: "研究で優先するものを変えた" },
  { id: "improve-comparison", label: "時刻間の比較方法を改善した" },
] as const;
