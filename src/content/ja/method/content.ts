import { z } from "zod";

const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  feedback: z.string().min(1),
});
const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(choiceSchema).min(3),
  correctChoiceId: z.string().min(1),
  hint: z.string().min(1),
  glossaryTerms: z.array(z.string()),
  courses: z.array(z.string()),
  required: z.boolean(),
});
export const methodContentSchema = z.object({
  contentId: z.string().min(1),
  sections: z
    .array(
      z.object({
        id: z.string(),
        heading: z.string(),
        lead: z.string(),
        paragraphs: z.array(z.string()),
        glossaryTerms: z.array(z.string()),
      }),
    )
    .length(5),
  questions: z.array(questionSchema).min(3).max(5),
});

export const methodContent = methodContentSchema.parse({
  contentId: "method-understanding-v1",
  sections: [
    {
      id: "observation",
      heading: "観測とシミュレーション",
      lead: "違う強みを組み合わせて宇宙の歴史を調べます。",
      paragraphs: [
        "同じ宇宙領域の数十億年間の変化を、人間がそのまま待って観測することはできません。一方、観測では異なる赤方偏移の天体や物質分布を調べ、過去の宇宙を知ることができます。",
        "シミュレーションは観測の代わりではありません。物理法則と仮定から時間発展を調べ、その結果を観測と比較する相補的な方法です。",
      ],
      glossaryTerms: ["redshift", "simulation"],
    },
    {
      id: "nbody",
      heading: "N体シミュレーションと計算粒子",
      lead: "多数の計算粒子の位置と速度を、重力に基づいて時間発展させます。",
      paragraphs: [
        "一つの計算粒子は、暗黒物質の素粒子一個、星一個、銀河一個ではありません。今回は多数の暗黒物質を粗視化して表す計算上の要素です。",
        "力学の運動方程式を微分方程式として表し、数値計算では短い時間刻みごとに数値積分して位置と速度を更新します。",
      ],
      glossaryTerms: ["n-body", "computational-particle"],
    },
    {
      id: "initial",
      heading: "初期条件と乱数シード",
      lead: "出発点を決め、同じ物理条件の異なる実現を比べられます。",
      paragraphs: [
        "初期条件には初期の密度ゆらぎ、宇宙論モデル、計算開始時刻などが含まれます。乱数シードは物理法則や宇宙論パラメータではなく、密度ゆらぎの具体的な実現を変える値です。",
        "同じ物理条件でも乱数シードが違えば細かな配置が変わります。一つの乱数シードだけから宇宙一般へ結論を広げることには限界があります。",
      ],
      glossaryTerms: ["initial-condition", "random-seed"],
    },
    {
      id: "periodic",
      heading: "周期境界条件",
      lead: "人工的な端を避けるため、箱の向かい合う面をつなぎます。",
      paragraphs: [
        "計算領域の一方から出た粒子が反対側から入る扱いです。実在の宇宙が立方体だという意味ではありません。",
        "周期境界条件を使っても、有限の箱より大きな空間スケールの情報が回復するわけではありません。",
      ],
      glossaryTerms: ["periodic-boundary"],
    },
    {
      id: "scope",
      heading: "暗黒物質のみの計算で扱える範囲",
      lead: "含まれる物理と、含まれない物理を分けて解釈します。",
      paragraphs: [
        "扱えるのは、暗黒物質の重力的な構造形成、密度分布の時間変化、フィラメント、ノード（ノット）、ボイドの形成と成長です。",
        "ガスの圧力と流体運動、冷却や放射過程、星形成、超新星や活動銀河核のフィードバック、磁場、銀河の明るさや色は直接扱いません。高密度領域はガスが集まりやすい重力場となる可能性がありますが、銀河形成そのものはこの計算から直接確認できません。",
      ],
      glossaryTerms: ["dark-matter", "cosmic-web"],
    },
  ],
  questions: [
    {
      id: "observation-role",
      prompt: "観測とシミュレーションの関係として適切なのは？",
      correctChoiceId: "complementary",
      hint: "どちらか一方が、もう一方を置き換えるのでしょうか。",
      glossaryTerms: ["simulation", "redshift"],
      courses: ["天文学", "科学的方法"],
      required: true,
      choices: [
        {
          id: "complementary",
          label: "異なる強みを持ち、比較して使う相補的な方法",
          feedback:
            "その通りです。観測は異なる赤方偏移から過去を調べ、シミュレーションは仮定した物理から時間発展を調べます。",
        },
        {
          id: "observation-none",
          label: "観測では宇宙の進化を何も調べられない",
          feedback:
            "観測でも異なる赤方偏移を通じて過去の宇宙を調べられます。シミュレーションだけが方法ではありません。",
        },
        {
          id: "replacement",
          label: "シミュレーションは観測を完全に置き換える",
          feedback:
            "シミュレーションの仮定が現実に合うか確かめるには観測との比較が必要です。",
        },
        {
          id: "unsure",
          label: "まだわからない",
          feedback:
            "不利益はありません。観測とシミュレーションがそれぞれ得意な問いを本文で比べてみましょう。",
        },
      ],
    },
    {
      id: "particle-meaning",
      prompt: "今回の一つの計算粒子が表すものは？",
      correctChoiceId: "coarse-dark-matter",
      hint: "素粒子、星、銀河のどれか一個と対応するでしょうか。",
      glossaryTerms: ["computational-particle", "n-body"],
      courses: ["力学", "解析学", "数値計算"],
      required: true,
      choices: [
        {
          id: "coarse-dark-matter",
          label: "多数の暗黒物質を粗視化した計算上の要素",
          feedback:
            "その通りです。計算粒子の位置と速度を、重力に基づいて数値積分します。",
        },
        {
          id: "one-particle",
          label: "暗黒物質の素粒子一個",
          feedback:
            "計算粒子は現実の素粒子一個ではなく、多数の暗黒物質をまとめて表します。",
        },
        {
          id: "one-galaxy",
          label: "銀河一個",
          feedback:
            "暗黒物質のみの計算粒子は銀河一個を表すものではありません。",
        },
        {
          id: "unsure",
          label: "まだわからない",
          feedback:
            "不利益はありません。「粗視化」が何をまとめて表すかを確認しましょう。",
        },
      ],
    },
    {
      id: "seed-meaning",
      prompt: "乱数シードを変えると何が変わる？",
      correctChoiceId: "realization",
      hint: "重力法則そのものではなく、出発時の模様に注目してください。",
      glossaryTerms: ["random-seed", "initial-condition"],
      courses: ["確率・統計"],
      required: true,
      choices: [
        {
          id: "realization",
          label: "同じ物理条件のもとで密度ゆらぎの細かな配置",
          feedback:
            "その通りです。乱数シードは初期ゆらぎの異なる実現を指定します。",
        },
        {
          id: "gravity",
          label: "重力の物理法則",
          feedback:
            "乱数シードは物理法則ではありません。重力は同じでも細かな初期配置が変わります。",
        },
        {
          id: "cosmology",
          label: "宇宙論パラメータそのもの",
          feedback:
            "乱数シードと宇宙論パラメータは別です。一つの実現だけの一般化にも限界があります。",
        },
        {
          id: "unsure",
          label: "まだわからない",
          feedback:
            "不利益はありません。「条件」と「その条件での具体的な実現」を分けてみましょう。",
        },
      ],
    },
    {
      id: "periodic-meaning",
      prompt: "周期境界条件が意味するものは？",
      correctChoiceId: "wrap",
      hint: "箱の端に到達した粒子の次の位置を図で追ってください。",
      glossaryTerms: ["periodic-boundary"],
      courses: ["計算科学"],
      required: true,
      choices: [
        {
          id: "wrap",
          label: "一方から出た粒子が反対側から入る計算上の扱い",
          feedback:
            "その通りです。人工的な端を避けますが、箱より大きな情報を回復する方法ではありません。",
        },
        {
          id: "cube-universe",
          label: "実在の宇宙が立方体である証拠",
          feedback:
            "立方体は有限の計算領域です。宇宙の実際の形を主張していません。",
        },
        {
          id: "infinite-info",
          label: "箱より大きな構造の情報も回復できる",
          feedback:
            "境界をつないでも、有限の箱に含まれない大きな空間スケールは回復しません。",
        },
        {
          id: "unsure",
          label: "まだわからない",
          feedback:
            "不利益はありません。右端から出る粒子が左端へ戻る図を確認しましょう。",
        },
      ],
    },
    {
      id: "dm-scope",
      prompt: "暗黒物質のみの計算から直接確認できるのは？",
      correctChoiceId: "gravity-structure",
      hint: "ガスや星を計算に含めているかを確認してください。",
      glossaryTerms: ["dark-matter", "cosmic-web"],
      courses: ["力学", "計算科学"],
      required: true,
      choices: [
        {
          id: "gravity-structure",
          label: "暗黒物質の重力的な密度構造の形成と成長",
          feedback:
            "その通りです。フィラメントや高密度領域の重力的な成長は追えます。",
        },
        {
          id: "star-proof",
          label: "高密度領域で星が形成された証拠",
          feedback:
            "星形成は直接計算していません。高密度領域はガスが集まりやすい可能性を示しますが、銀河形成の証拠とは断定できません。",
        },
        {
          id: "galaxy-color",
          label: "銀河の明るさや色",
          feedback:
            "銀河の光にはガスや星の物理が必要で、暗黒物質のみの計算では直接扱いません。",
        },
        {
          id: "unsure",
          label: "まだわからない",
          feedback:
            "不利益はありません。比較表の「含む」と「直接含まない」を見直しましょう。",
        },
      ],
    },
  ],
});
export type MethodQuestion = (typeof methodContent.questions)[number];
