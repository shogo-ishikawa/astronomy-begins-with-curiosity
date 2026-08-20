import { glossaryById } from "../../content/ja/glossary/entries";

export function GlossaryPanel({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const entry = selectedId ? glossaryById.get(selectedId) : undefined;
  return (
    <section className="glossary-panel" aria-labelledby="glossary-title">
      <h2 id="glossary-title">用語解説</h2>
      {!entry ? (
        <p>本文の点線付きの言葉を選ぶと、ここで確かめられます。</p>
      ) : (
        <>
          <h3>{entry.term}</h3>
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
        </>
      )}
    </section>
  );
}
