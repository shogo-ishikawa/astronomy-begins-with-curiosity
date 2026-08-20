# ABCs — Astronomy Begins with Curiosity

**Undergraduate Astronomy Research Lab**

ABCsは、天文学の知識を前提としない学部生が、実際の研究と同じ考え方や道筋を体験するための教育用Webアプリです。

ユーザは、宇宙への疑問から研究課題を組み立て、仮説と予想を立て、仮想観測や数値シミュレーション、データ解析、図の作成、結果の解釈、ミニ論文の作成までを経験します。

研究パートナーのMiraが、専門用語を丁寧に説明しながら、ユーザ自身が考えて研究を進められるように支援します。

## 現在の状態

🚧 **開発中のプロトタイプ — v0.1-alpha / Phase 1E**

最初の研究テーマ「宇宙の網目はどう育つ？」について、研究課題、仮説、方法の理解を引き継ぎ、箱サイズ、粒子数、スナップショット、解析、主要図と理由を選んだ研究計画案をMiraとレビューし、不変な計画版として保存できます。試し計算、データ取得、解析は今後のPhaseで実装します。

現在は開発中のため、表示内容やブラウザ内の保存形式が今後変更される可能性があります。

## 公開版

[ABCs v0.1-alpha](https://shogo-ishikawa.github.io/astronomy-begins-with-curiosity/) をGitHub Pagesで公開します。`main`への変更がマージされ、デプロイ前の品質確認に合格すると自動更新されます。

研究プロジェクトのデータは外部サーバへ送信せず、利用者のブラウザ内（IndexedDB）に保存されます。

## Documentation

実装仕様書は `docs/ABCs_v0.1_implementation_spec.md` です。

## 開発

Node.js 22とnpmを使用します。

```bash
npm ci
npm run dev
```

品質確認は `npm run format:check`、`npm run lint`、`npm run typecheck`、`npm test`、`npm run build` で実行できます。研究への招待のブラウザフローは、PlaywrightのChromiumを導入後に `npm run test:e2e` で確認できます。
