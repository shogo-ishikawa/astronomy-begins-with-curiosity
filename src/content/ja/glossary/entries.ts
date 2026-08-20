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
