export interface StageDecisionSummaryData {
  purpose: string;
  choices: string;
  evidence: string;
  limitation: string;
  unknown: string;
  nextQuestion: string;
}

export function StageDecisionSummary({
  data,
}: {
  data: StageDecisionSummaryData;
}) {
  return (
    <section
      className="stage-decision-summary"
      aria-labelledby="decision-summary-title"
    >
      <p className="eyebrow">ここまでの研究ノート</p>
      <h2 id="decision-summary-title">画面で選択した内容から自動整理</h2>
      <dl>
        <dt>明らかにしたいこと</dt>
        <dd>{data.purpose}</dd>
        <dt>今回選んだこと</dt>
        <dd>{data.choices}</dd>
        <dt>画面で確認した証拠</dt>
        <dd>{data.evidence}</dd>
        <dt>受け入れる限界</dt>
        <dd>{data.limitation}</dd>
        <dt>この段階ではまだ言えないこと</dt>
        <dd>{data.unknown}</dd>
        <dt>次へ持ち越す問い</dt>
        <dd>{data.nextQuestion}</dd>
      </dl>
      <div className="self-check">
        <h3>自分の言葉で説明してみましょう</h3>
        <p>
          私は［明らかにしたいこと］を調べるために［方法・設定］を選びました。
          <br />
          ［証拠］を比べると［分かること］を確認できます。
          <br />
          ただし、［この方法の限界］までは明らかにできません。
        </p>
      </div>
    </section>
  );
}
