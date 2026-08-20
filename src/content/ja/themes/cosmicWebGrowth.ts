import { themeSchema } from "../../schema";

export const cosmicWebGrowthTheme = themeSchema.parse({
  schemaVersion: 1,
  contentVersion: "0.1.0",
  id: "cosmic-web-growth",
  locale: "ja",
  title: "宇宙の網目はどう育つ？",
  question: "宇宙の時間とともに、物質密度のむらはどのように変化するか？",
  method: {
    kind: "precomputed-collisionless-dark-matter-simulation",
    summary: "宇宙論的N体シミュレーションの事前計算済み結果を用います。",
    scientificLimitations: [
      "暗黒物質のみを扱い、ガス冷却、星形成、フィードバックは直接計算しません。",
    ],
  },
  provenanceRequirements: [
    "units",
    "redshift",
    "cosmology",
    "code-version",
    "data-version",
    "source",
  ],
  accessibility: { language: "ja", media: [] },
  blocks: [],
});
