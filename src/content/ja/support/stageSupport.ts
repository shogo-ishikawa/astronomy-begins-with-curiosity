import type { ResearchStage } from "../../../domain/project";

export type FigureGuide = {
  kind: "模式図" | "DEMO／合成二次元密度場";
  whatItIs: string;
  readingSteps: string[];
  limitations: string[];
};

export type StageSupportContent = {
  currentLabel: string;
  mira: { focus: string; nextQuestion: string };
  keyTermIds: string[];
  figureGuide?: FigureGuide;
};

const common = (
  currentLabel: string,
  focus: string,
  nextQuestion: string,
  keyTermIds: string[],
): StageSupportContent => ({
  currentLabel,
  mira: { focus, nextQuestion },
  keyTermIds,
});

export const stageSupport: Record<ResearchStage, StageSupportContent> = {
  home: common(
    "研究開始前",
    "天文学の知識は前提にしません。私と、まず好奇心から研究を始めましょう。",
    "宇宙について、最初にどんな違いを見つけたいですか？",
    ["cosmic-web", "density-fluctuation"],
  ),
  invitation: {
    ...common(
      "研究への招待（1/7）",
      "初期と現在を同じ範囲・同じ縮尺で見て、違いを一つ観察してみましょう。まだ原因を決める必要はありません。",
      "形や粒の集まり方で、どこが変わって見えますか？",
      ["cosmic-web", "density-fluctuation", "dark-matter"],
    ),
    figureGuide: {
      kind: "模式図",
      whatItIs:
        "初期と現在の形態を同じ範囲・同じ縮尺で比べる模式図です。シミュレーション結果や観測データではありません。",
      readingSteps: [
        "左右が同じ範囲か確かめる",
        "フィラメント、ノード、ノット、ボイドを探す",
        "見えた違いを原因の説明と分けて記録する",
      ],
      limitations: [
        "密度の数値や変化の正確な時刻は判断できません。",
        "銀河形成を判断できません。",
      ],
    },
  },
  question: common(
    "研究課題（2/7）",
    "興味を、データから測定できる証拠へ結び付けます。私と、問いに直接答える量を確かめましょう。",
    "その測定量が変わったら、問いに何と答えられますか？",
    ["research-question", "measurement", "spatial-scale"],
  ),
  hypothesis: common(
    "仮説と予想（3/7）",
    "仮説は理由の説明、予想はデータに現れる変化です。正誤を先に決めず、二つのつながりを確かめましょう。",
    "選んだ仮説から、測定量にはどんな変化を予想しますか？",
    ["hypothesis", "prediction", "density-contrast"],
  ),
  method: {
    ...common(
      "方法の理解（4/7）",
      "暗黒物質のみのN体計算に含まれる物理と、含まれない物理を区別しましょう。私も境界を一緒に確認します。",
      "この方法で直接調べられない現象は何でしょう？",
      ["n-body", "computational-particle", "periodic-boundary"],
    ),
    figureGuide: {
      kind: "模式図",
      whatItIs:
        "周期境界条件など、計算上の取り扱いを読む模式図です。宇宙が実際に立方体であることを表しません。",
      readingSteps: [
        "粒子が境界を越えた後の位置を追う",
        "計算に含まれる重力と仮定を確認する",
        "含まれない物理を確認する",
      ],
      limitations: [
        "暗黒物質のみのN体シミュレーションは、ガスの物理や星形成を直接計算しません。",
        "箱より大きな情報を回復する図ではありません。",
      ],
    },
  },
  planning: common(
    "研究計画（5/7）",
    "箱サイズ、粒子数、スナップショットにはトレードオフがあります。一つの値だけでなく、問いに必要な証拠との対応を見ましょう。",
    "優先した条件によって、何が調べやすく、何が難しくなりますか？",
    ["box-size", "particle-side", "snapshot"],
  ),
  "plan-review": common(
    "研究計画レビュー（6/7）",
    "ここでは仮説の正誤ではなく、問い、方法、証拠がつながっているかを確認します。指摘を、計画を強くする材料として読みましょう。",
    "この計画のままでは答えにくい部分は残っていますか？",
    ["box-size", "particle-side", "snapshot"],
  ),
  pilot: common(
    "試し計算（7/7）",
    "一つの変数だけを変え、共通の尺度で比べます。観察したことと、その意味の解釈を分けて記録しましょう。",
    "比較で直接観察した違いは何ですか？",
    ["mean-particle-spacing", "standard-deviation", "snapshot"],
  ),
  execution: common(
    "結果パッケージの取得（S08）",
    "データを選ぶ段階にも研究上の判断があります。計画した箱の大きさ、粒子数、宇宙の時代が一致するか、私と一緒に確かめましょう。",
    "計画とcatalogの条件は、単位も含めて一致していますか？",
    ["result-package", "catalog", "manifest"],
  ),
  quality: common(
    "データ品質確認（S09）",
    "ここでは科学的な結論を考えず、期待値と観測値、単位、情報源を一つずつ照合しましょう。",
    "今の判断を直接支える証拠はどれですか？",
    ["data-quality", "evidence", "limitation"],
  ),
  "analysis-mode": common(
    "解析方法の選択",
    "問いに合う解析方法を選びます。",
    "どの量が問いへの証拠になりますか？",
    ["measurement"],
  ),
  analysis: {
    ...common(
      "GUI解析と図（S11）",
      "私と、平均、密度コントラスト、分布、要約値を順に計算します。傾向の原因はまだ決めません。",
      "共通の軸、ビン境界、カラースケールになっていますか？",
      ["density-contrast", "histogram", "standard-deviation"],
    ),
    figureGuide: {
      kind: "DEMO／合成二次元密度場",
      whatItIs: "品質確認済みの暗黒物質のみの教育用fixtureから作る数値図です。",
      readingSteps: [
        "軸と表示量を確認する",
        "aとzを確認する",
        "図と数値表を照合する",
      ],
      limitations: [
        "宇宙年齢やGyrへ変換しません。",
        "高密度セルは銀河やハローそのものではありません。",
      ],
    },
  },
  interpretation: common(
    "証拠に基づく解釈（S12）",
    "私と、図から直接読める結果、物理的解釈、結論、限界を分けます。",
    "この証拠はどの範囲の主張まで支えますか？",
    ["evidence", "interpretation", "limitation"],
  ),
  paper: common(
    "ミニ論文",
    "証拠、結論、限界を対応させます。",
    "結論を支える図はどれですか？",
    ["research-question"],
  ),
  constellation: common(
    "次の問い",
    "研究で残った疑問を次の問いへつなげます。",
    "次に一つだけ確かめるなら何ですか？",
    ["research-question"],
  ),
};

export function supportFor(project: {
  currentStage: ResearchStage;
  pilot: { status: string } | null;
}): StageSupportContent {
  const support = stageSupport[project.currentStage];
  if (
    project.currentStage !== "pilot" ||
    !["revealed", "awaiting-rereview", "complete"].includes(
      project.pilot?.status ?? "",
    )
  )
    return support;
  return {
    ...support,
    figureGuide: {
      kind: "DEMO／合成二次元密度場",
      whatItIs:
        "CWSの計算結果でも観測データでもない、試し計算用の合成データです。",
      readingSteps: [
        "同じスナップショットか確かめる",
        "一つのパラメータだけが変わったか確かめる",
        "共通カラースケールを確認し、大まかな構造、細かな濃淡、数値表の順に見る",
        "観察と解釈を分ける",
      ],
      limitations: [
        "平均粒子間隔や標準偏差は、大きいほど常に優れている量ではありません。",
        "この比較だけで計画の維持・修正を自動的に決めることはできません。",
      ],
    },
  };
}
