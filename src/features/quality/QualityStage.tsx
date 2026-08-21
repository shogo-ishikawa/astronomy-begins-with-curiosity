import { useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { StageLearningFrame } from "../../components/stage/StageLearningFrame";
import { stageLearning } from "../../content/ja/stageLearning";
import {
  assessmentLabels,
  limitationChoices,
  qualityChecks,
} from "../../content/ja/quality";
import { reloadResultPackage } from "../execution/logic";
import {
  QUALITY_CHECK_IDS,
  QUALITY_RULESET_V1,
  METHOD_PACK,
  MISSION_PACK,
  REQUIRED_LIMITATION_IDS,
  assessmentMatches,
  qualityContextFingerprint,
  qualityRecordRelation,
  runQualityChecks,
  stableShuffle,
  type MachineQualityResult,
  type QualityCheckRecord,
  type QualityDecision,
  type QualityReviewDraft,
  type StudentAssessment,
} from "./logic";

export function QualityStage({
  project,
  onSave,
  onReacquire,
  onGlossary,
}: {
  project: ProjectState;
  onSave: (p: ProjectState) => Promise<boolean>;
  onReacquire: () => void;
  onGlossary: (id: string) => void;
}) {
  const ref =
    project.resultPackage?.refKind === "bound" ? project.resultPackage : null;
  const fingerprint = ref ? qualityContextFingerprint(project, ref) : undefined;
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "saving"
  >("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<MachineQualityResult[]>();
  const [draft, setDraft] = useState<QualityReviewDraft | null>(
    project.qualityDraft &&
      project.qualityDraft.contextFingerprint === fingerprint
      ? project.qualityDraft
      : null,
  );
  const [assessment, setAssessment] = useState<StudentAssessment>();
  const [reason, setReason] = useState("");
  const [compared, setCompared] = useState(false);
  const [decision, setDecision] = useState<QualityDecision>();
  const abort = useRef<AbortController | undefined>(undefined);
  const currentIndex = draft
      ? QUALITY_CHECK_IDS.indexOf(draft.currentCheckId)
      : 0,
    currentId = QUALITY_CHECK_IDS[currentIndex]!;
  const content = qualityChecks[currentId],
    currentResult = results?.find((x) => x.checkId === currentId);
  const assessmentOptions = useMemo(
    () =>
      stableShuffle(
        Object.keys(assessmentLabels) as StudentAssessment[],
        `${project.projectId}:${draft?.shuffleSeed ?? "new"}:${currentId}`,
        (x) => x,
      ),
    [project.projectId, draft?.shuffleSeed, currentId],
  );
  const reasons = useMemo(
    () =>
      stableShuffle(
        content.reasons,
        `${project.projectId}:${draft?.shuffleSeed ?? "new"}:${currentId}`,
        (x) => x.id,
      ),
    [project.projectId, draft?.shuffleSeed, currentId, content.reasons],
  );
  async function begin() {
    if (!ref || !fingerprint) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setStatus("loading");
    setError("");
    try {
      const runtime = await reloadResultPackage(
        ref,
        import.meta.env.BASE_URL,
        fetch,
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        qualityContextFingerprint(project, ref) !== fingerprint
      )
        return;
      const machine = runQualityChecks(project, runtime);
      const next = draft ?? {
        draftKind: "quality-review-draft",
        draftId: crypto.randomUUID(),
        contextFingerprint: fingerprint,
        startedAt: new Date().toISOString(),
        currentCheckId: QUALITY_CHECK_IDS[0],
        assessments: [],
        responseHistory: [],
        warningAcknowledgementIds: [],
        limitationAcknowledgementIds: [],
        shuffleSeed: crypto.randomUUID(),
      };
      setResults(machine);
      setDraft(next);
      const ok = await onSave({
        ...project,
        qualityDraft: next,
        updatedAt: new Date().toISOString(),
      });
      if (!ok) throw Error("draftを保存できませんでした。");
      setStatus("ready");
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "品質検査に失敗しました。");
        setStatus("error");
      }
    }
  }
  async function compare() {
    if (!draft || !assessment || !reason || !currentResult) return;
    const now = new Date().toISOString();
    const item = {
      checkId: currentId,
      assessment,
      reasonIds: [reason],
      comparedAt: now,
    };
    const next = {
      ...draft,
      assessments: [
        ...draft.assessments.filter((x) => x.checkId !== currentId),
        item,
      ],
      responseHistory: [
        ...draft.responseHistory,
        {
          ...item,
          attempt:
            draft.responseHistory.filter((x) => x.checkId === currentId)
              .length + 1,
        },
      ],
    };
    setDraft(next);
    setCompared(true);
    await onSave({ ...project, qualityDraft: next, updatedAt: now });
  }
  async function next() {
    if (!draft) return;
    const id = QUALITY_CHECK_IDS[currentIndex + 1];
    if (!id) return;
    const next = { ...draft, currentCheckId: id };
    setDraft(next);
    setAssessment(undefined);
    setReason("");
    setCompared(false);
    await onSave({
      ...project,
      qualityDraft: next,
      updatedAt: new Date().toISOString(),
    });
  }
  async function finish() {
    if (!draft || !results || !ref || !fingerprint || !decision) return;
    if (qualityContextFingerprint(project, ref) !== fingerprint) {
      setError("検査中に対象が変わりました。再読込してください。");
      return;
    }
    const blocking = results.some((x) => x.gate === "blocked"),
      allMatch = results.every((r) =>
        draft.assessments.some(
          (a) => a.checkId === r.checkId && assessmentMatches(r, a.assessment),
        ),
      );
    const limitations = REQUIRED_LIMITATION_IDS.every((id) =>
      draft.limitationAcknowledgementIds.includes(id),
    );
    if (
      (decision.startsWith("proceed") &&
        (!allMatch || blocking || !limitations)) ||
      decision === "proceed-to-analysis"
    ) {
      setError(
        "機械判定、学生の照合、必須limitationに整合する判断を選んでください。DEMOは条件付き利用です。",
      );
      return;
    }
    setStatus("saving");
    const now = new Date().toISOString();
    const prior = project.qualityChecks
      .filter(
        (x): x is QualityCheckRecord =>
          (x as QualityCheckRecord).recordKind === "quality-check" &&
          (x as QualityCheckRecord).contextFingerprint === fingerprint,
      )
      .at(-1);
    const record: QualityCheckRecord = {
      recordKind: "quality-check",
      schemaVersion: 1,
      recordId: crypto.randomUUID(),
      createdAt: draft.startedAt,
      completedAt: now,
      ruleSetId: QUALITY_RULESET_V1.id,
      methodPackId: METHOD_PACK.id,
      methodPackVersion: METHOD_PACK.version,
      missionPackId: MISSION_PACK.id,
      contentVersion: project.contentVersion,
      contextFingerprint: fingerprint,
      context: {
        themeId: project.themeId,
        planVersionId: ref.planVersionId,
        planSubjectHash: ref.planSubjectHash,
        packageId: ref.packageId,
        requestFingerprint: ref.requestFingerprint,
        acquisitionFingerprint: ref.acquisitionFingerprint,
        acquisitionIdentity: ref.acquiredAt,
        catalogVersion: ref.catalogVersion,
        dataVersion: ref.dataVersion,
        fixtureVersion: ref.fixtureVersion,
        snapshotIds: ref.requestedSnapshotIds,
      },
      machineResults: results,
      studentAssessments: draft.assessments,
      responseHistory: draft.responseHistory,
      warningAcknowledgements: draft.warningAcknowledgementIds.map(
        (checkId) => ({ checkId: checkId as never }),
      ),
      limitationAcknowledgements: draft.limitationAcknowledgementIds.map(
        (limitationId) => ({ limitationId }),
      ),
      decision,
      decisionReasonIds: [decision],
      overallOutcome:
        decision === "proceed-with-conditions"
          ? "approved-with-conditions"
          : decision === "reacquire-data"
            ? "blocked"
            : "inconclusive",
      carriedLimitationIds: draft.limitationAcknowledgementIds,
      supersedesRecordId: prior?.recordId ?? null,
    };
    const ok = await onSave({
      ...project,
      qualityChecks: [...project.qualityChecks, record],
      qualityDraft: null,
      currentStage: decision === "reacquire-data" ? "execution" : "quality",
      updatedAt: now,
    });
    if (!ok) {
      setError("完成記録を保存できませんでした。draftを残して再試行できます。");
      setStatus("ready");
      return;
    }
    if (decision === "reacquire-data") onReacquire();
    else setStatus("idle");
  }
  const completed = project.qualityChecks.filter(
    (x): x is QualityCheckRecord =>
      (x as QualityCheckRecord).recordKind === "quality-check",
  );
  return (
    <article aria-labelledby="quality-title">
      <h1 id="stage-title" tabIndex={-1}>
        S09 データ品質を証拠から確認する
      </h1>
      <StageLearningFrame content={stageLearning.quality} />
      <div className="demo-banner">
        <strong>DEMO / synthetic fixture</strong>
        <p>
          教育用fixtureです。CWSや観測データ、実際のN体計算の結果ではありません。
        </p>
      </div>
      <section>
        <h2>品質確認の対象</h2>
        <p>
          package ID: {ref?.packageId ?? "確認不能"} ／ PlanVersion:{" "}
          {ref?.planVersionId ?? "確認不能"}
        </p>
        <p>
          Mira:
          ここでは、データから宇宙について何が分かるかはまだ考えません。まず、計画したデータがそろい、解析に使える状態かを、証拠を一つずつ確認しましょう。
        </p>
        <button
          className="primary"
          onClick={() => void begin()}
          disabled={!ref || status === "loading"}
        >
          {draft ? "品質確認を再開する" : "品質確認を始める"}
        </button>
        {status === "loading" && (
          <p role="status" aria-busy="true">
            catalog、manifest、要求したスナップショットを再読込して検査しています。
          </p>
        )}
        {error && (
          <p role="alert" className="validation-summary">
            {error}
          </p>
        )}
      </section>
      {status === "ready" && draft && currentResult && (
        <section>
          <p>確認 {currentIndex + 1} / 6</p>
          <h2>{content.title}</h2>
          <p>{content.why}</p>
          <p>Mira: {content.prompt}</p>
          <div className="table-scroll">
            <table>
              <caption>期待値、観測値、単位、情報源</caption>
              <thead>
                <tr>
                  <th>証拠</th>
                  <th>観測値</th>
                  <th>情報源</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(currentResult.evidence).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>
                      <code>{JSON.stringify(v)}</code>
                    </td>
                    <td>
                      {currentId === "plan-configuration-match"
                        ? "研究計画／manifest"
                        : "再読込したmanifest／メモリ内配列"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <fieldset>
            <legend>この証拠をどう判断しますか</legend>
            {assessmentOptions.map((x) => (
              <label className="choice-row" key={x}>
                <input
                  type="radio"
                  name="assessment"
                  checked={assessment === x}
                  onChange={() => setAssessment(x)}
                />
                {assessmentLabels[x]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>判断を支える理由（1つ選択）</legend>
            {reasons.map((x) => (
              <label className="choice-row" key={x.id}>
                <input
                  type="radio"
                  name="reason"
                  checked={reason === x.id}
                  onChange={() => setReason(x.id)}
                />
                {x.label}
              </label>
            ))}
          </fieldset>
          <button
            disabled={!assessment || !reason}
            onClick={() => void compare()}
          >
            Miraと照合する
          </button>
          {compared && (
            <div className="quality-feedback" tabIndex={-1}>
              <h3>
                照合結果: {currentResult.outcome}（{currentResult.gate}）
              </h3>
              <p>
                {assessmentMatches(currentResult, assessment!)
                  ? content.feedback
                  : `もう一度、表の ${Object.keys(currentResult.evidence).slice(0, 3).join("、")} を比べてみましょう。`}
              </p>
              {currentIndex < 5 && (
                <button onClick={() => void next()}>次の証拠へ</button>
              )}
            </div>
          )}
        </section>
      )}
      {status === "ready" && draft && draft.assessments.length === 6 && (
        <section>
          <h2>warningとlimitation</h2>
          <p>
            <button onClick={() => onGlossary("limitation")}>
              limitationの用語解説
            </button>
            はデータ破損ではなく、主張できる範囲の限界です。
          </p>
          <fieldset>
            <legend>各制約の意味と、述べてよい／いけない範囲を確認する</legend>
            {limitationChoices.map(([id, label]) => (
              <label className="choice-row" key={id}>
                <input
                  type="checkbox"
                  checked={draft.limitationAcknowledgementIds.includes(id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      limitationAcknowledgementIds: e.target.checked
                        ? [...draft.limitationAcknowledgementIds, id]
                        : draft.limitationAcknowledgementIds.filter(
                            (x) => x !== id,
                          ),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>総合判断</legend>
            {(
              [
                "proceed-to-analysis",
                "proceed-with-conditions",
                "reacquire-data",
                "review-again",
              ] as QualityDecision[]
            ).map((x) => (
              <label className="choice-row" key={x}>
                <input
                  type="radio"
                  name="decision"
                  onChange={() => setDecision(x)}
                />
                {
                  {
                    "proceed-to-analysis": "問題なしとして解析へ進む",
                    "proceed-with-conditions": "条件を記録して解析へ進む",
                    "reacquire-data": "結果パッケージを取得し直す",
                    "review-again": "まだ判断できないため再確認する",
                  }[x]
                }
              </label>
            ))}
          </fieldset>
          <button
            className="primary"
            disabled={!decision}
            onClick={() => void finish()}
          >
            品質確認報告を保存する
          </button>
        </section>
      )}
      <section>
        <h2>過去の品質確認履歴</h2>
        {completed.length ? (
          <ul>
            {completed.map((r) => (
              <li key={r.recordId}>
                {r.completedAt} — {r.overallOutcome} —{" "}
                {qualityRecordRelation(r, fingerprint)}
              </li>
            ))}
          </ul>
        ) : (
          <p>完成した品質確認記録はまだありません。</p>
        )}{" "}
        {completed.at(-1)?.overallOutcome === "approved-with-conditions" && (
          <p className="next-preview">
            次は解析方法を選びます（この段階では操作できません）。
          </p>
        )}
      </section>
    </article>
  );
}
