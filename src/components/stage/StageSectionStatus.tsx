export type StageSectionState = "未着手" | "検討中" | "選択済み" | "確認が必要";

export function StageSectionStatus({ state }: { state: StageSectionState }) {
  return (
    <span className="stage-section-status" data-state={state}>
      <span aria-hidden="true">
        {state === "選択済み" ? "✓" : state === "確認が必要" ? "!" : "○"}
      </span>{" "}
      {state}
    </span>
  );
}
