import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { MiraMessageRecord } from "../../domain/project";
import type { StageSupportContent } from "../../content/ja/support/stageSupport";
import { MiraPanel } from "../MiraPanel/MiraPanel";
import { GlossaryPanel } from "../GlossaryPanel/GlossaryPanel";

type Tab = "glossary" | "figure" | "history";
export function CompanionRail({
  history,
  support,
  selectedGlossary,
  onGlossary,
  glossaryRequest,
  onReturn,
}: {
  history: MiraMessageRecord[];
  support: StageSupportContent;
  selectedGlossary?: string;
  onGlossary: (id: string) => void;
  glossaryRequest: number;
  onReturn?: () => void;
}) {
  const available: Tab[] = useMemo(
    () =>
      support.figureGuide
        ? ["glossary", "figure", "history"]
        : ["glossary", "history"],
    [support.figureGuide],
  );
  const [tab, setTab] = useState<Tab>("glossary");
  const refs = useRef(new Map<Tab, HTMLButtonElement>());
  useEffect(() => {
    if (!available.includes(tab)) setTab("glossary");
  }, [available, tab]);
  useEffect(() => {
    if (glossaryRequest) {
      setTab("glossary");
      requestAnimationFrame(() =>
        document
          .getElementById("glossary-entry-title")
          ?.focus({ preventScroll: true }),
      );
    }
  }, [glossaryRequest]);
  const labels: Record<Tab, string> = {
    glossary: "用語解説",
    figure: "図の見方",
    history: "これまでの助言",
  };
  function keys(event: KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const index = available.indexOf(current);
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (index + 1) % available.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + available.length) % available.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = available.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const value = available[next]!;
    setTab(value);
    refs.current.get(value)?.focus();
  }
  return (
    <aside className="companion-rail" aria-label="共同研究者席">
      <MiraPanel
        history={history}
        onGlossary={onGlossary}
        focus={support.mira.focus}
        nextQuestion={support.mira.nextQuestion}
      />
      <div className="context-tabs">
        <div role="tablist" aria-label="補助資料">
          {available.map((value) => (
            <button
              key={value}
              ref={(node) => {
                if (node) refs.current.set(value, node);
              }}
              role="tab"
              id={`support-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`support-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(e) => keys(e, value)}
            >
              {labels[value]}
            </button>
          ))}
        </div>
        {available.map((value) => (
          <section
            className="context-panel"
            key={value}
            role="tabpanel"
            id={`support-panel-${value}`}
            aria-labelledby={`support-tab-${value}`}
            hidden={tab !== value}
            tabIndex={tab === value ? 0 : undefined}
          >
            {value === "glossary" && (
              <GlossaryPanel
                selectedId={selectedGlossary}
                onSelect={onGlossary}
                keyTermIds={support.keyTermIds}
                onReturn={onReturn}
              />
            )}
            {value === "figure" && support.figureGuide && (
              <>
                <h2>図の見方</h2>
                <p className="diagram-label">{support.figureGuide.kind}</p>
                <p>{support.figureGuide.whatItIs}</p>
                <h3>見る順番</h3>
                <ol>
                  {support.figureGuide.readingSteps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                <h3>この図だけでは言えないこと</h3>
                <ul>
                  {support.figureGuide.limitations.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            {value === "history" && (
              <>
                <h2>これまでの助言</h2>
                {history.length > 1 ? (
                  <ol reversed>
                    {history
                      .slice(0, -1)
                      .reverse()
                      .map((message) => (
                        <li key={message.messageId}>{message.body}</li>
                      ))}
                  </ol>
                ) : (
                  <p>
                    以前の助言はまだありません。最新の助言はMiraカードに表示しています。
                  </p>
                )}
              </>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}
