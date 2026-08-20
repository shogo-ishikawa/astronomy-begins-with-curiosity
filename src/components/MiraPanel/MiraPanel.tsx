import type { MiraMessageRecord } from "../../domain/project";
import { RichText } from "../RichText";

export function MiraStar({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={large ? "mira-star large" : "mira-star"}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Miraを表す抽象的な星"
    >
      <path d="M24 2l5.4 15.6L46 24l-16.6 6.4L24 46l-5.4-15.6L2 24l16.6-6.4z" />
      <circle cx="24" cy="24" r="5" />
    </svg>
  );
}

export function MiraPanel({
  history,
  onGlossary,
}: {
  history: MiraMessageRecord[];
  onGlossary: (id: string) => void;
}) {
  const latest = history.at(-1);
  return (
    <section
      className="mira-panel"
      aria-labelledby="mira-title"
      aria-live="polite"
    >
      <header className="partner-heading">
        <MiraStar large={history.length === 1} />
        <div>
          <h2 id="mira-title">Mira</h2>
          <p>研究パートナー</p>
        </div>
      </header>
      {latest ? (
        <p>
          <RichText text={latest.body} onGlossary={onGlossary} />
        </p>
      ) : (
        <p>一緒に観察を始めましょう。</p>
      )}
    </section>
  );
}
