export interface Choice {
  id: string;
  label: string;
}
export function ChoiceCards({
  choices,
  value,
  onChange,
  label = "特に気になったこと",
  orderContext,
  pinToEnd = [],
}: {
  choices: Choice[];
  value?: string;
  onChange: (id: string) => void;
  label?: string;
  orderContext?: { seed: string; themeId: string; groupId: string };
  pinToEnd?: string[];
}) {
  const ordered = orderContext
    ? orderChoices(
        choices,
        { kind: "stable-shuffle", orderVersion: 1, pinToEnd },
        {
          choiceOrderSeed: orderContext.seed,
          themeId: orderContext.themeId,
          groupId: orderContext.groupId,
        },
      )
    : choices;
  return (
    <div className="choice-cards" role="radiogroup" aria-label={label}>
      {ordered.map((choice, index) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === choice.id}
          tabIndex={
            value ? (value === choice.id ? 0 : -1) : index === 0 ? 0 : -1
          }
          key={choice.id}
          onClick={() => onChange(choice.id)}
          onKeyDown={(event) => {
            if (
              !["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(
                event.key,
              )
            )
              return;
            event.preventDefault();
            const direction =
              event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
            const next =
              ordered[(index + direction + ordered.length) % ordered.length]!;
            onChange(next.id);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLElement>(
                  `[role=radio][data-choice="${next.id}"]`,
                )
                ?.focus(),
            );
          }}
          data-choice={choice.id}
        >
          <span className="choice-indicator" aria-hidden="true">
            {value === choice.id ? "✓" : "○"}
          </span>
          {choice.label}
        </button>
      ))}
    </div>
  );
}
import { orderChoices } from "../../domain/choiceOrder";
