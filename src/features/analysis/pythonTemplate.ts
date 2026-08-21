import { PYTHON_TEMPLATE } from "./pythonConfig";

export const PYTHON_STEPS = [
  {
    id: "purpose",
    title: "GUIとPythonで同じ解析を行う理由",
    code: "# 同じ定義を独立に再現します",
  },
  {
    id: "mean",
    title: "データ配列と入力平均を確認する",
    code: "rho = np.asarray(rho_values, dtype=np.float64)\ninput_mean = np.mean(rho)",
  },
  {
    id: "normalize",
    title: "規格化密度 q を計算する",
    code: "q = rho / input_mean",
  },
  {
    id: "contrast",
    title: "密度コントラスト δ=q−1 を計算する",
    code: "delta = q - 1.0",
  },
  {
    id: "sigma",
    title: "母標準偏差 σδ を計算する",
    code: "sigma_delta = np.sqrt(np.mean(delta ** 2))",
  },
  {
    id: "dense",
    title: "高密度セルの数と割合を計算する",
    code: "dense_count = np.count_nonzero(q >= dense_threshold)\ndense_fraction = dense_count / delta.size",
  },
  {
    id: "histogram",
    title: "共通ビン境界でヒストグラムを作る",
    code: "hist_counts, _ = np.histogram(delta, bins=shared_histogram_edges)\nhist_fractions = hist_counts / delta.size",
  },
  {
    id: "plot",
    title: "スケール因子順にMatplotlibで図を作る",
    code: "# 描画は固定されたAgg wrapperが行います",
  },
  {
    id: "parity",
    title: "GUIとPythonの数値を照合する",
    code: "# TypeScript側で許容誤差を検査します",
  },
  {
    id: "meaning",
    title: "一致が確かめたことを判断する",
    code: "# 同じデータと定義で同じ数値を再現できたか考えます",
  },
] as const;

export const PYTHON_TEMPLATE_META = PYTHON_TEMPLATE;

export function validateEducationalPython(source: string): string[] {
  const errors: string[] = [];
  if (source.length > 30_000)
    errors.push("コードは30,000文字以内にしてください。");
  const forbidden = [
    [
      /\b(?:open|eval|exec|input)\s*\(/,
      "open、eval、exec、inputは使えません。",
    ],
    [/\b(?:for|while)\b/, "この教材では任意のループは使いません。"],
    [
      /\b(?:pip|micropip|requests|urllib|socket)\b/,
      "パッケージ導入やネットワーク操作は使えません。",
    ],
    [
      /\bimport\s+(?!numpy\b|matplotlib\b|io\b)/,
      "許可されていないimportです。",
    ],
    [/\b(?:from\s+js|import\s+js)\b/, "jsモジュールにはアクセスできません。"],
    [/\.__\w+__/, "dunder属性にはアクセスできません。"],
  ] as const;
  for (const [pattern, message] of forbidden)
    if (pattern.test(source)) errors.push(message);
  return errors;
}
