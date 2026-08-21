export function StageActions({
  index,
  count,
  onPrevious,
  onNext,
}: {
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="stage-actions" aria-label="画面内の項目を移動">
      <button type="button" disabled={index === 0} onClick={onPrevious}>
        前の項目
      </button>
      <button
        type="button"
        className="primary"
        disabled={index === count - 1}
        onClick={onNext}
      >
        次の項目へ
      </button>
    </div>
  );
}
