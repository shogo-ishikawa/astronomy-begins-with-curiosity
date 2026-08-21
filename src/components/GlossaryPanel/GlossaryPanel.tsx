import { glossaryById } from "../../content/ja/glossary/entries";

export function GlossaryPanel({
  selectedId,
  onSelect,
  keyTermIds = [],
  onReturn,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
  keyTermIds?: string[];
  onReturn?: () => void;
}) {
  const entry = selectedId ? glossaryById.get(selectedId) : undefined;
  return (
    <section className="glossary-panel" aria-labelledby="glossary-title">
      <h2 id="glossary-title">用語解説</h2>
      {!entry ? (
        <div>
          <p>この画面の重要語</p>
          <ul className="key-terms">
            {keyTermIds.slice(0, 3).map((id) => {
              const item = glossaryById.get(id);
              return item ? (
                <li key={id}>
                  <button onClick={() => onSelect(id)}>{item.term}</button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      ) : (
        <>
          <h3 id="glossary-entry-title" tabIndex={-1}>
            {entry.term}
          </h3>
          <p className="definition">{entry.short}</p>
          <h4>今ここで重要な理由</h4>
          <p>{entry.relevance}</p>
          <h4>具体例</h4>
          <p>{entry.example}</p>
          <details>
            <summary>もう少し詳しく</summary>
            <p>{entry.detail}</p>
          </details>
          <p>
            <strong>関連する授業:</strong> {entry.courses.join("、")}
          </p>
          {entry.related.length > 0 && (
            <div className="related">
              <strong>関連用語:</strong>
              {entry.related.map((id) => {
                const related = glossaryById.get(id);
                return related ? (
                  <button key={id} onClick={() => onSelect(id)}>
                    {related.term}
                  </button>
                ) : null;
              })}
            </div>
          )}
          {onReturn && (
            <button className="return-to-content" onClick={onReturn}>
              本文へ戻る
            </button>
          )}
        </>
      )}
    </section>
  );
}
