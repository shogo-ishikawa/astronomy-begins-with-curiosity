import { useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { orderChoices } from "../../domain/choiceOrder";
import {
  claims,
  limitations,
  reviewMessages,
} from "../../content/ja/interpretation";
import {
  appendResult,
  currentAnalysis,
  direction,
  interpretationFingerprint,
  normalizeInterpretation,
  reviewDraft,
  saveDraft,
  type EvidenceRef,
  type InterpretationDraft,
} from "./logic";

export function InterpretationStage({
  project,
  onSave,
  onBack,
  onGlossary,
}: {
  project: ProjectState;
  onSave: (p: ProjectState) => Promise<boolean>;
  onBack: () => void;
  onGlossary: (id: string) => void;
}) {
  const current = currentAnalysis(project),
    fingerprint = interpretationFingerprint(project),
    store = normalizeInterpretation(project.interpretation);
  const existing = [...store.results]
    .reverse()
    .find((x) => x.contextFingerprint === fingerprint);
  const initial = store.drafts.find(
    (x) => x.contextFingerprint === fingerprint,
  );
  const now = new Date().toISOString();
  const [draft, setDraft] = useState<InterpretationDraft>(
    initial ?? {
      recordKind: "interpretation-draft",
      schemaVersion: 1,
      draftId: crypto.randomUUID(),
      contextFingerprint: fingerprint ?? "",
      runId: current?.result.runId ?? "",
      step: 1,
      evidence: [],
      resultClaimId: null,
      interpretationClaimId: null,
      predictionMatch: null,
      answerId: null,
      scopeId: null,
      limitations: [],
      addressedGuardIds: [],
      note: "",
      updatedAt: now,
    },
  );
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const ordered = useMemo(
    () =>
      orderChoices(
        claims,
        { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
        {
          choiceOrderSeed: project.choiceOrderSeed,
          themeId: project.themeId,
          groupId: `s12-${draft.step}`,
        },
      ),
    [project.choiceOrderSeed, project.themeId, draft.step],
  );
  if (!current || !fingerprint)
    return (
      <article>
        <h2 id="stage-title">S12へ進めません</h2>
        <p>
          現在のS11A結果が無効または古いため、S11へ戻って解析と図を保存してください。
        </p>
        <button onClick={onBack}>S11へ戻る</button>
      </article>
    );
  if (existing)
    return (
      <article className="interpretation-workspace">
        <p className="demo-label">DEMO / synthetic fixture</p>
        <h2 id="stage-title">結果を読み解き、研究の答えをつくる</h2>
        <h3>完成結果（変更不可）</h3>
        <p>証拠、結果、解釈、結論と3カテゴリの限界を保存しました。</p>
        <p>次は、結果をミニ論文にまとめます（S13で実装予定）</p>
        <button
          onClick={() => {
            setDraft({
              ...draft,
              draftId: crypto.randomUUID(),
              step: 1,
              updatedAt: new Date().toISOString(),
            });
            setMessage("新しいdraftを作りました。古い完成結果は保持されます。");
          }}
        >
          新しいdraftを作る
        </button>
        <p role="status">{message}</p>
      </article>
    );
  const update = (change: Partial<InterpretationDraft>) =>
    setDraft((d) => ({ ...d, ...change, updatedAt: new Date().toISOString() }));
  const evidenceOptions: EvidenceRef[] = [
    ...current.figures.map((f) => ({
      kind: "figure" as const,
      figureId: f.figureId,
      runId: f.runId,
      figureKind: f.figureKind,
    })),
    ...current.snapshots.map((s) => ({
      kind: "snapshot-statistic" as const,
      runId: current.result.runId,
      snapshotId: s.id,
      metric: "sigmaDelta",
      value: s.sigmaDelta,
    })),
    ...(current.snapshots.length > 1
      ? [
          (() => {
            const a = [...current.snapshots].sort(
                (x, y) => x.scaleFactor - y.scaleFactor,
              ),
              from = a[0]!,
              to = a.at(-1)!;
            return {
              kind: "comparison" as const,
              runId: current.result.runId,
              fromSnapshotId: from.id,
              toSnapshotId: to.id,
              metric: "sigmaDelta",
              fromValue: from.sigmaDelta,
              toValue: to.sigmaDelta,
              direction: direction(from.sigmaDelta, to.sigmaDelta),
            };
          })(),
        ]
      : []),
  ];
  const key = (e: EvidenceRef) => JSON.stringify(e);
  const selected = (e: EvidenceRef) =>
    draft.evidence.some((x) => key(x) === key(e));
  const save = async (next = draft) => {
    const state = saveDraft(store, next);
    const ok = await onSave({
      ...project,
      interpretation: state,
      updatedAt: new Date().toISOString(),
    });
    setMessage(
      ok
        ? "draftを保存しました。"
        : "保存に失敗しました。選択は画面に保持しています。再試行してください。",
    );
  };
  const next = () => {
    const n = Math.min(5, draft.step + 1);
    update({ step: n });
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    });
  };
  const codes = reviewDraft(draft, []);
  const complete = async () => {
    if (codes.length) {
      setMessage("未解決のレビューがあります。");
      return;
    }
    const completedAt = new Date().toISOString();
    const result = {
      ...draft,
      recordKind: "evidence-based-interpretation-result" as const,
      resultId: crypto.randomUUID(),
      completedAt,
      reviewCodes: [],
    };
    const nextStore = appendResult(saveDraft(store, draft), result);
    const ok = await onSave({
      ...project,
      interpretation: nextStore,
      updatedAt: completedAt,
    });
    setMessage(
      ok
        ? "完成結果を追記保存しました。"
        : "保存に失敗しました。選択は失われていません。",
    );
  };
  return (
    <article className="interpretation-workspace">
      <p className="demo-label">DEMO / synthetic fixture</p>
      <p className="eyebrow">S12 / Step {draft.step} of 5</p>
      <h2 id="stage-title">結果を読み解き、研究の答えをつくる</h2>
      <nav aria-label="解釈の手順">
        <ol className="interpretation-steps">
          {[
            "証拠から結果を記述",
            "結果を解釈",
            "予想と結論",
            "限界と影響",
            "Miraの最終レビュー",
          ].map((x, i) => (
            <li
              key={x}
              aria-current={draft.step === i + 1 ? "step" : undefined}
            >
              {i + 1}. {x}
            </li>
          ))}
        </ol>
      </nav>
      <h3 ref={heading} tabIndex={-1}>
        Step {draft.step}
      </h3>
      <aside className="evidence-tray" aria-label="証拠トレイ">
        <h3>同一runの証拠トレイ</h3>
        <p>run: {current.result.runId} ／ 教育用合成データ</p>
        {evidenceOptions.map((e, i) => (
          <div key={key(e)}>
            <button
              aria-pressed={selected(e)}
              onClick={() =>
                update({
                  evidence: selected(e)
                    ? draft.evidence.filter((x) => key(x) !== key(e))
                    : [...draft.evidence, e],
                })
              }
            >
              {selected(e) ? "解除" : "追加"}
            </button>{" "}
            {e.kind === "figure"
              ? `図: ${current.figures.find((f) => f.figureId === e.figureId)?.title}`
              : e.kind === "snapshot-statistic"
                ? `${e.snapshotId}: σδ=${e.value.toPrecision(4)}`
                : `${e.fromSnapshotId} → ${e.toSnapshotId}: ${e.direction}`}
            {i === 0 && (
              <small> 図には保存済みcaptionと数値表があります。</small>
            )}
          </div>
        ))}
      </aside>
      {draft.step === 1 && (
        <fieldset>
          <legend>原因を含まない直接的な結果</legend>
          {ordered
            .filter((x) =>
              [
                "directly-supported",
                "reasonable-interpretation",
                "unsupported",
                "insufficient-evidence",
              ].includes(x.classification),
            )
            .map((c) => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="result"
                  checked={draft.resultClaimId === c.id}
                  onChange={() => {
                    update({ resultClaimId: c.id });
                    setMessage(c.feedback + " " + c.reason);
                  }}
                />
                {c.text}
              </label>
            ))}
        </fieldset>
      )}
      {draft.step === 2 && (
        <>
          <fieldset>
            <legend>結果と整合する物理的解釈</legend>
            {ordered
              .filter((x) =>
                [
                  "reasonable-interpretation",
                  "beyond-this-model",
                  "unsupported",
                  "insufficient-evidence",
                ].includes(x.classification),
              )
              .map((c) => (
                <label key={c.id}>
                  <input
                    type="radio"
                    name="interpretation"
                    checked={draft.interpretationClaimId === c.id}
                    onChange={() => {
                      update({ interpretationClaimId: c.id });
                      setMessage(c.feedback + " " + c.reason);
                    }}
                  />
                  {c.text}
                </label>
              ))}
          </fieldset>
          <details>
            <summary>確認のヒント</summary>
            <p>
              画像・ヒストグラム・σδ・高密度セル割合の整合、閾値感度、色範囲と2次元投影の影響を確認します。Python一致は別実装による数値再現性の参考であり、物理的主張の証拠には数えません。
            </p>
          </details>
        </>
      )}
      {draft.step === 3 && (
        <>
          <fieldset>
            <legend>最初の予想との照合</legend>
            {[
              ["aligned", "整合した"],
              ["partly", "一部だけ整合した"],
              ["not-aligned", "整合しなかった"],
              ["insufficient", "今回の証拠だけでは判断できない"],
            ].map(([id, label]) => (
              <label key={id}>
                <input
                  type="radio"
                  name="prediction"
                  checked={draft.predictionMatch === id}
                  onChange={() =>
                    update({
                      predictionMatch:
                        id as InterpretationDraft["predictionMatch"],
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>研究課題への自分の回答</legend>
            <label>
              <input
                type="radio"
                checked={draft.answerId === "density-changed"}
                onChange={() => update({ answerId: "density-changed" })}
              />
              この教育用合成データでは密度コントラストのばらつきが変化した
            </label>
            <label>
              <input
                type="radio"
                checked={draft.answerId === "prediction-proof"}
                onChange={() => update({ answerId: "prediction-proof" })}
              />
              予想が証明された
            </label>
          </fieldset>
          <fieldset>
            <legend>適用範囲</legend>
            <label>
              <input
                type="radio"
                checked={draft.scopeId === "fixture-run"}
                onChange={() => update({ scopeId: "fixture-run" })}
              />
              このrunの教育用合成データの範囲
            </label>
            <label>
              <input
                type="radio"
                checked={draft.scopeId === "universe"}
                onChange={() => update({ scopeId: "universe" })}
              />
              宇宙全体
            </label>
          </fieldset>
          <label>
            自分の言葉で一文（任意）
            <textarea
              value={draft.note}
              onChange={(e) => update({ note: e.target.value })}
            />
          </label>
        </>
      )}
      {draft.step === 4 && (
        <fieldset>
          <legend>各カテゴリから限界と「何を結論できないか」を選ぶ</legend>
          {limitations.map((l) => (
            <label key={l.id}>
              <input
                type="checkbox"
                checked={draft.limitations.some((x) => x.id === l.id)}
                onChange={(e) =>
                  update({
                    limitations: e.target.checked
                      ? [
                          ...draft.limitations,
                          {
                            id: l.id,
                            category: l.category,
                            impactId: `impact-${l.id}`,
                          },
                        ]
                      : draft.limitations.filter((x) => x.id !== l.id),
                  })
                }
              />
              <strong>{l.category}</strong>: {l.label}。このため、{l.impact}。
            </label>
          ))}
        </fieldset>
      )}
      {draft.step === 5 && (
        <>
          <section aria-live="polite" tabIndex={-1}>
            <h3>Miraの最終レビュー</h3>
            {codes.length ? (
              <ul>
                {codes.map((c) => (
                  <li key={c}>
                    <a
                      href="#stage-title"
                      onClick={() => update({ step: reviewMessages[c]!.step })}
                    >
                      {reviewMessages[c]!.reason}（Step{" "}
                      {reviewMessages[c]!.step}へ）
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                私が証拠と主張、provenance、研究課題への回答、3カテゴリの限界を確認しました。未解決のerrorはありません。
              </p>
            )}
          </section>
          <button
            className="primary"
            disabled={codes.length > 0}
            onClick={() => void complete()}
          >
            完成結果を保存
          </button>
        </>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <div className="actions">
        <button
          onClick={() =>
            draft.step === 1 ? onBack() : update({ step: draft.step - 1 })
          }
        >
          戻る
        </button>
        <button onClick={() => void save()}>draftを保存</button>
        {draft.step < 5 && (
          <button className="primary" onClick={next}>
            次のstep
          </button>
        )}
        <button
          onClick={() => onGlossary(draft.step < 3 ? "evidence" : "limitation")}
        >
          用語解説
        </button>
      </div>
    </article>
  );
}
