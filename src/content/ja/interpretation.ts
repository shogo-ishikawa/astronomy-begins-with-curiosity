export type ClaimClass =
  | "directly-supported"
  | "reasonable-interpretation"
  | "unsupported"
  | "beyond-this-model"
  | "scope-too-broad"
  | "insufficient-evidence";
export type Claim = {
  id: string;
  text: string;
  classification: ClaimClass;
  requires: ("figure" | "numeric")[];
  provenance: ("demo-fixture" | "cws" | "observation")[];
  feedback: string;
  termIds: string[];
  revisionId: string | null;
  reason: string;
};
export const claims: Claim[] = [
  {
    id: "sigma-observed",
    text: "スケール因子 a が大きいスナップショットほど、密度コントラストのばらつき σδ が大きかった",
    classification: "directly-supported",
    requires: ["figure", "numeric"],
    provenance: ["demo-fixture", "cws", "observation"],
    feedback: "数値の向きと図を照合できました。原因はまだ含めていません。",
    termIds: ["result", "evidence"],
    revisionId: null,
    reason: "保存された各時刻の σδ を直接比較する記述だからです。",
  },
  {
    id: "mean-observed",
    text: "規格化密度 q の平均は各時刻でほぼ1だった",
    classification: "directly-supported",
    requires: ["numeric"],
    provenance: ["demo-fixture", "cws", "observation"],
    feedback:
      "平均は規格化の定義を確認する量です。物質総量の増加ではありません。",
    termIds: ["result"],
    revisionId: null,
    reason: "保存値を直接述べています。",
  },
  {
    id: "result-cause",
    text: "重力が原因で σδ が増加した",
    classification: "reasonable-interpretation",
    requires: ["numeric"],
    provenance: ["cws"],
    feedback: "原因を含むため、これは直接の結果欄には置けません。",
    termIds: ["interpretation", "causality"],
    revisionId: "sigma-observed",
    reason: "時間変化だけから因果関係は証明できません。",
  },
  {
    id: "contradicted",
    text: "σδ はすべての時刻で減少した",
    classification: "unsupported",
    requires: ["numeric"],
    provenance: ["demo-fixture"],
    feedback: "保存された数値の向きと照合してください。",
    termIds: ["evidence"],
    revisionId: "sigma-observed",
    reason: "候補は実データの向きに合わせて生成する必要があります。",
  },
  {
    id: "structure-consistent",
    text: "この変化は、教材が表現している構造形成の描像と定性的に整合する",
    classification: "reasonable-interpretation",
    requires: ["figure", "numeric"],
    provenance: ["demo-fixture"],
    feedback: "教育用合成データの範囲を保った解釈です。追加検証も必要です。",
    termIds: ["interpretation", "scope"],
    revisionId: null,
    reason: "背景理論と今回の証拠を分け、整合という限定表現を使っています。",
  },
  {
    id: "real-cws",
    text: "CWSの計算で実際の宇宙を再現した",
    classification: "beyond-this-model",
    requires: ["figure"],
    provenance: ["cws"],
    feedback: "現在のデータはCWS結果ではなく教育用合成データです。",
    termIds: ["numerical-model"],
    revisionId: "structure-consistent",
    reason: "provenanceを越えています。",
  },
  {
    id: "galaxy",
    text: "暗黒物質の高密度セルから銀河形成を確認した",
    classification: "beyond-this-model",
    requires: ["figure"],
    provenance: [],
    feedback: "暗黒物質密度だけでは星や銀河の形成を断定できません。",
    termIds: ["idealization"],
    revisionId: "structure-consistent",
    reason: "ガス冷却や星形成を扱っていないためです。",
  },
  {
    id: "causal",
    text: "時間変化だけで重力が原因だと証明した",
    classification: "unsupported",
    requires: ["numeric"],
    provenance: [],
    feedback: "相関や時間変化だけから因果関係を証明できません。",
    termIds: ["causality", "correlation"],
    revisionId: "structure-consistent",
    reason: "対照比較や代替説明の検討が不足しています。",
  },
  {
    id: "unsure",
    text: "まだ判断できない",
    classification: "insufficient-evidence",
    requires: [],
    provenance: ["demo-fixture", "cws", "observation"],
    feedback: "不利益はありません。図と数値を一つずつ照合しましょう。",
    termIds: ["uncertainty"],
    revisionId: null,
    reason: "追加証拠を確認してから判断できます。",
  },
];
export const limitations = [
  {
    id: "demo",
    category: "model",
    label: "教育用合成データで、実際のCWS計算ではない",
    impact: "実際の宇宙論的N体シミュレーションの結果へ一般化できない",
  },
  {
    id: "dm-only",
    category: "model",
    label: "暗黒物質のみで、ガスや星形成を含まない",
    impact: "星や銀河の形成を結論できない",
  },
  {
    id: "projection",
    category: "measurement",
    label: "2次元投影で3次元構造そのものではない",
    impact: "奥行き方向の形や投影効果を区別できない",
  },
  {
    id: "threshold",
    category: "measurement",
    label: "高密度閾値は解析上の定義である",
    impact: "銀河や銀河団の境界とは結論できない",
  },
  {
    id: "resolution",
    category: "measurement",
    label: "粒子数・グリッド解像度の収束確認をしていない",
    impact: "分解能より小さい構造や数値収束を結論できない",
  },
  {
    id: "one-seed",
    category: "generalization",
    label: "1つのboxと1つの乱数シードだけを使用した",
    impact: "宇宙分散を評価せず宇宙全体へ一般化できない",
  },
  {
    id: "no-observation",
    category: "generalization",
    label: "観測データとの比較がない",
    impact: "実際の宇宙との一致を結論できない",
  },
] as const;
export const reviewMessages: Record<string, { step: number; reason: string }> =
  {
    "missing-evidence": {
      step: 1,
      reason: "主図、数値、補助証拠を主張へ結び付けてください。",
    },
    "contradicted-by-data": {
      step: 1,
      reason: "主張の増減方向が保存値と矛盾します。",
    },
    "mixed-result-and-interpretation": {
      step: 1,
      reason: "直接観察した結果から原因の説明を分けてください。",
    },
    "demo-as-cws-or-real": {
      step: 2,
      reason: "DEMOをCWSや実宇宙の結果として扱えません。",
    },
    "galaxy-from-dm-only": {
      step: 2,
      reason: "暗黒物質だけから銀河形成を断定できません。",
    },
    "single-seed-generalization": {
      step: 3,
      reason: "1つの乱数シードから宇宙全体へ一般化できません。",
    },
    "below-resolution": {
      step: 2,
      reason: "解像度未満の構造は結論できません。",
    },
    "correlation-as-causation": {
      step: 2,
      reason: "時間変化や相関だけで因果関係は証明できません。",
    },
    "prediction-as-proof": {
      step: 3,
      reason: "予想との整合は予想の証明ではありません。",
    },
    "conclusion-does-not-answer-question": {
      step: 3,
      reason: "研究課題への回答と適用範囲を選んでください。",
    },
    "missing-model-limitation": {
      step: 4,
      reason: "模型・由来の限界と影響が必要です。",
    },
    "missing-measurement-limitation": {
      step: 4,
      reason: "数値・測定の限界と影響が必要です。",
    },
    "missing-generalization-limitation": {
      step: 4,
      reason: "一般化の限界と影響が必要です。",
    },
    "carried-guard-unaddressed": {
      step: 4,
      reason:
        "研究計画または品質確認から引き継いだ警告の影響を確認してください。",
    },
  };

export function validateClaims(items = claims) {
  const ids = new Set<string>();
  for (const x of items) {
    if (ids.has(x.id)) throw new Error(`duplicate claim: ${x.id}`);
    ids.add(x.id);
    if (!x.feedback || !x.reason) throw new Error(`feedback missing: ${x.id}`);
  }
}
