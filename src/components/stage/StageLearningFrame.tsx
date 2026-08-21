export interface StageLearningFrameContent {
  purpose: string;
  reason: string;
  outcome: string;
}

export function StageLearningFrame({
  content,
}: {
  content: StageLearningFrameContent;
}) {
  return (
    <aside
      className="stage-learning-frame"
      aria-labelledby="learning-frame-title"
    >
      <h2 id="learning-frame-title">この段階の目的</h2>
      <dl>
        <div>
          <dt>この段階で明らかにすること</dt>
          <dd>{content.purpose}</dd>
        </div>
        <div>
          <dt>なぜ必要なのか</dt>
          <dd>{content.reason}</dd>
        </div>
        <div>
          <dt>終えたときに説明できること</dt>
          <dd>{content.outcome}</dd>
        </div>
      </dl>
    </aside>
  );
}
