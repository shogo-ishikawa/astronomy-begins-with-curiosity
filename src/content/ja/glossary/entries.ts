export interface GlossaryEntry {
  id: string;
  term: string;
  short: string;
  relevance: string;
  example: string;
  detail: string;
  courses: string[];
  related: string[];
}

export const glossaryEntries: GlossaryEntry[] = [
  ...[
    [
      "research-question",
      "研究課題",
      "データを比べて答えられる形にした問い",
      "関心を測定へつなぐ研究の出発点です。",
      "複数時刻でむらの強さを比べる問い",
      "何を比べ、何が変わるかを明確にすると、必要な証拠を選べます。",
      "科学的方法",
      "measurement",
    ],
    [
      "measurement",
      "測定量",
      "データから観察または計算して比べるもの",
      "問いに直接答える証拠を決めます。",
      "密度画像や標準偏差",
      "画像も測定対象になり、数値による要約と長所・限界が異なります。",
      "データサイエンス",
      "standard-deviation",
    ],
    [
      "hypothesis",
      "仮説",
      "変化がなぜ起こるかという暫定的な説明",
      "結果を見る前の考えを記録します。",
      "重力が物質を集める",
      "結果と一致しなくても失敗ではなく、説明を考え直す手掛かりです。",
      "物理学",
      "prediction",
    ],
    [
      "prediction",
      "予想",
      "仮説が正しければデータに見えるはずの変化",
      "仮説を測定結果と比べられる形にします。",
      "標準偏差が大きくなる",
      "仮説は理由、予想はデータの見え方であり、区別して記録します。",
      "科学的方法",
      "hypothesis",
    ],
    [
      "density-contrast",
      "密度コントラスト",
      "密度が平均からどれだけ相対的にずれるか",
      "場所のむらを同じ基準で比べます。",
      "平均より多い場所では正の値",
      "密度から平均を引き平均で割った無次元量です。",
      "数学・物理学",
      "standard-deviation",
    ],
    [
      "standard-deviation",
      "標準偏差",
      "値の散らばりの大きさを表す数",
      "密度のむらの強さを時刻間で比べられます。",
      "平均との差が大きい値が多いと大きくなる",
      "平均との差を二乗して平均し、その平方根を取ります。事前知識は不要です。",
      "確率・統計",
      "density-contrast",
    ],
    [
      "high-density",
      "高密度領域",
      "決めた基準より密度が高い場所",
      "物質が集まった領域の割合を測れます。",
      "平均密度の5倍以上の区画",
      "割合は閾値の選び方に依存するため、後の計画で閾値も記録します。",
      "データサイエンス",
      "density-contrast",
    ],
    [
      "spatial-scale",
      "空間スケール",
      "注目する構造の大きさ",
      "箱全体の網目と小領域では必要な見方が違います。",
      "大きなフィラメントと小さな節",
      "有限な箱と分解能により、同時に詳しく扱える尺度には制約があります。",
      "物理学・数値計算",
      "cosmic-web",
    ],
  ].map(([id, term, short, relevance, example, detail, course, related]) => ({
    id: id!,
    term: term!,
    short: short!,
    relevance: relevance!,
    example: example!,
    detail: detail!,
    courses: [course!],
    related: [related!],
  })),
  {
    id: "cosmic-web",
    term: "宇宙の網目",
    short: "物質がフィラメント、節、空洞をつくる大規模な分布です。",
    relevance: "左右の模式図で、時間とともに現れる形の違いを表す中心概念です。",
    example:
      "糸状のフィラメントが交差する節と、物質の少ない空洞を想像してください。",
    detail:
      "重力のもとで物質分布が変化して形成される大規模構造です。模式図は形の特徴だけを示し、計算結果ではありません。",
    courses: ["力学", "宇宙物理学"],
    related: ["density-fluctuation", "dark-matter"],
  },
  {
    id: "density-fluctuation",
    term: "密度のむら",
    short: "場所ごとの物質量が平均から少しずれていることです。",
    relevance:
      "初期宇宙はほぼ一様でも、構造の手がかりになる小さな差がありました。",
    example:
      "同じ面積の区画ごとに粒の数を数えると、平均より少し多い所と少ない所があります。",
    detail:
      "密度を平均値と比べることで、むらを量として表せます。初期宇宙を完全に一様とは扱いません。",
    courses: ["確率・統計", "物理学"],
    related: ["cosmic-web"],
  },
  {
    id: "dark-matter",
    term: "暗黒物質",
    short: "光では直接見えにくい一方、重力を及ぼす物質です。",
    relevance:
      "今回の後続研究で使うN体計算は、暗黒物質の重力による運動を扱います。",
    example:
      "計算粒子は多数の暗黒物質をまとめて表す要素で、素粒子一個ではありません。",
    detail:
      "暗黒物質のみの計算は、ガス冷却、星形成、フィードバックを直接計算しません。",
    courses: ["力学", "宇宙物理学"],
    related: ["n-body"],
  },
  {
    id: "n-body",
    term: "N体シミュレーション",
    short: "多数の計算要素が重力で動く様子を数値的に追う方法です。",
    relevance: "初期の分布から後の分布までを同じ規則で比較する方法になります。",
    example: "短い時間刻みごとに重力と運動を計算して、位置を更新します。",
    detail:
      "今回想定する暗黒物質のみの計算では、星や銀河の形成過程そのものは直接扱いません。",
    courses: ["力学・解析学", "数値計算"],
    related: ["dark-matter", "snapshot"],
  },
  {
    id: "snapshot",
    term: "snapshot",
    short: "シミュレーションのある時点を保存したデータです。",
    relevance: "複数時点を比べると、構造がいつ変化したかを調べられます。",
    example: "動画から時刻の異なる静止画を取り出して比べるようなものです。",
    detail:
      "各snapshotには時刻に相当する情報と計算条件、データの来歴が必要です。",
    courses: ["数値計算", "データサイエンス"],
    related: ["n-body"],
  },
];

export const glossaryById = new Map(
  glossaryEntries.map((entry) => [entry.id, entry]),
);
