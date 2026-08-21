import type { ReactNode } from "react";
export function ScientificQuantityExplanation({
  name,
  meaning,
  unit,
  formula,
  symbols,
  tells,
  doesNotTell,
}: {
  name: string;
  meaning: string;
  unit?: string;
  formula?: ReactNode;
  symbols?: string;
  tells: string;
  doesNotTell: string;
}) {
  return (
    <aside className="quantity-explanation">
      <h3>{name}</h3>
      <p>{meaning}</p>
      {formula && (
        <p className="formula" aria-label={symbols}>
          {formula}
        </p>
      )}
      <dl>
        {unit && (
          <>
            <dt>単位</dt>
            <dd>{unit}</dd>
          </>
        )}
        {symbols && (
          <>
            <dt>記号の意味</dt>
            <dd>{symbols}</dd>
          </>
        )}
        <dt>この量から分かること</dt>
        <dd>{tells}</dd>
        <dt>この量だけでは分からないこと</dt>
        <dd>{doesNotTell}</dd>
      </dl>
    </aside>
  );
}
