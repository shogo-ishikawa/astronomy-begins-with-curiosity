import {
  StageSectionStatus,
  type StageSectionState,
} from "./StageSectionStatus";

export interface StageSectionNavItem {
  id: string;
  label: string;
  state: StageSectionState;
  available?: boolean;
  unavailableReason?: string;
}

export function StageSectionNav({
  items,
  activeId,
  onNavigate,
}: {
  items: readonly StageSectionNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  if (new Set(items.map(({ id }) => id)).size !== items.length)
    throw new Error("Stage section IDs must be unique");
  return (
    <nav className="stage-section-nav" aria-label="この画面の項目">
      <h2>この画面の項目</h2>
      <ol>
        {items.map((item) => {
          const available = item.available !== false;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={activeId === item.id ? "step" : undefined}
                disabled={!available}
                aria-describedby={
                  !available ? `${item.id}-requirement` : undefined
                }
                onClick={() => onNavigate(item.id)}
              >
                <span>{item.label}</span>
                <StageSectionStatus state={item.state} />
              </button>
              {!available && item.unavailableReason && (
                <small id={`${item.id}-requirement`}>
                  {item.unavailableReason}
                </small>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
