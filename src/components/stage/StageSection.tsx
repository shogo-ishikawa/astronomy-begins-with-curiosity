import type { ReactNode } from "react";
import {
  StageSectionStatus,
  type StageSectionState,
} from "./StageSectionStatus";

export function StageSection({
  id,
  title,
  description,
  state,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  state: StageSectionState;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  const panelId = `${id}-content`;
  return (
    <section
      className="stage-section"
      aria-labelledby={headingId}
      data-open={open}
    >
      <div className="stage-section-heading">
        <div>
          <h2 id={headingId} tabIndex={-1}>
            {title}
          </h2>
          <StageSectionStatus state={state} />
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {open ? "閉じる" : summary ? "編集する" : "この項目を開く"}
        </button>
      </div>
      {!open && <p>{summary ? `選択済み：${summary}` : description}</p>}
      {open && (
        <div id={panelId} className="stage-section-content">
          {children}
        </div>
      )}
    </section>
  );
}
