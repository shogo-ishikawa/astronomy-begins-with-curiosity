import type {
  QualityCheckId,
  StudentAssessment,
} from "../../features/quality/logic";

export const qualityChecks: Record<
  QualityCheckId,
  {
    title: string;
    why: string;
    prompt: string;
    reasons: { id: string; label: string }[];
    feedback: string;
  }
> = {
  "plan-configuration-match": {
    title: "研究計画とデータの条件は一致しているか",
    why: "別の条件のデータでは、計画した問いに対応する解析にならないためです。",
    prompt: "二つの値が同じかだけでなく、単位も含めて比べてみましょう。",
    reasons: [
      {
        id: "config-all-match",
        label:
          "PlanVersion、boxサイズ、粒子数、スナップショット、単位が対応している",
      },
      { id: "config-unit-unclear", label: "数値は近いが単位を比較できない" },
      { id: "config-different", label: "計画とパッケージに異なる条件がある" },
    ],
    feedback:
      "boxサイズ、粒子数、スナップショット、単位を証拠から照合できます。",
  },
  "required-snapshots-present": {
    title: "必要なスナップショットは揃っているか",
    why: "時代を比較するために、計画した各スナップショットが必要だからです。",
    prompt: "要求、manifest、実際の読込という三つの一覧を比べましょう。",
    reasons: [
      {
        id: "snapshots-complete",
        label: "要求したIDが重複なくすべて読み込まれた",
      },
      { id: "snapshots-missing", label: "要求したIDに欠落または重複がある" },
      { id: "snapshots-source-missing", label: "一覧の情報源を確認できない" },
    ],
    feedback:
      "計画外のスナップショットを読み込まないことは欠損ではありません。",
  },
  "payload-complete": {
    title: "各データ製品の中身は最後まで揃っているか",
    why: "途中までの配列では要約値や解析結果が変わるためです。",
    prompt: "幅×高さの期待要素数と実際の要素数を比較しましょう。",
    reasons: [
      { id: "payload-partial", label: "期待要素数と実際の要素数が異なる" },
      {
        id: "payload-complete",
        label: "教育用fixtureの配列が規定要素数まで再現された",
      },
      { id: "payload-unknown", label: "配列長を取得できず比較できない" },
    ],
    feedback:
      "これはfixtureの完全性であり、N体計算が完走したという意味ではありません。",
  },
  "values-valid": {
    title: "欠損値や計算不能な値は含まれていないか",
    why: "非有限値や負の密度比は平均や後の図を正しく計算できなくするためです。",
    prompt: "有限値数、NaN、正負の無限大、負の値を確認しましょう。",
    reasons: [
      { id: "values-invalid", label: "非有限値、欠損、負の密度比がある" },
      { id: "values-unavailable", label: "値の個数を確認できない" },
      { id: "values-valid", label: "全要素が有限かつ非負で欠損がない" },
    ],
    feedback:
      "値の意味ではなく、まず計算可能な値として揃っているかを確認しました。",
  },
  "diagnostics-clear": {
    title: "診断値とデータ要約は整合しているか",
    why: "rho_over_meanは平均1に正規化される技術的な不変条件を持つためです。",
    prompt: "平均1との差と、版管理された許容誤差を比べましょう。",
    reasons: [
      {
        id: "diagnostic-warning",
        label: "平均の差が注意範囲にあり条件を引き継ぐ",
      },
      { id: "diagnostic-pass", label: "各平均と1との差がpass許容誤差内である" },
      { id: "diagnostic-fail", label: "平均の差がfail閾値を超える" },
    ],
    feedback:
      "平均1付近は正規化の確認だけであり、宇宙構造についての結論ではありません。",
  },
  "reproducibility-metadata": {
    title: "単位・版・来歴・利用範囲を確認できるか",
    why: "別の人が同じ条件と手順を確かめるには、単位、seed、版、来歴が必要だからです。",
    prompt: "値だけでなく、生成元とnot-modeledを含む利用範囲を確認しましょう。",
    reasons: [
      {
        id: "metadata-missing",
        label: "必須の単位、版、seed、来歴のいずれかがない",
      },
      {
        id: "metadata-complete",
        label: "単位、版、seed、来歴、モデル範囲が明記されている",
      },
      {
        id: "metadata-unsupported",
        label: "対応していない単位または不整合がある",
      },
    ],
    feedback: "not-modeledの明記は欠損ではなく、このfixtureのlimitationです。",
  },
};
export const assessmentLabels: Record<StudentAssessment, string> = {
  "requirement-met": "問題なし",
  "requirement-met-with-caution": "条件付きで進める",
  "action-required": "進めない",
  "insufficient-evidence": "判断できない",
};
export const limitationChoices = [
  ["not-cws-or-observation", "CWSの結果や観測データではない"],
  [
    "educational-fixture-not-nbody",
    "実際のN体計算ではなく、版管理された教育用fixtureである",
  ],
  ["not-for-cosmological-precision", "宇宙論的な物理精度の検証には使えない"],
  ["dark-matter-only", "暗黒物質のみを対象とする"],
  [
    "no-direct-star-galaxy-formation",
    "星や銀河の形成を直接示したとは結論できない",
  ],
  ["abcs-learning-scope", "ABCs内の解析手順と定性的な構造形成の学習に限る"],
] as const;
