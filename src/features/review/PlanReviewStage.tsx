import { useMemo, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { orderChoices } from "../../domain/choiceOrder";
import {
  findingMessages,
  limitationChoices,
  warningReasons,
  changeReasons,
} from "./content";
import {
  buildReviewedSubject,
  limitationsComplete,
  subjectHash,
  type PlanReviewRecord,
} from "./logic";
import { formatSnapshotId } from "../../domain/snapshotTime";

const states = {
  "research-ready": "研究を進められる整合性があります",
  "one-revision-needed": "見直したい点があります",
  "question-method-mismatch": "問いと方法の対応を見直します",
  "snapshot-insufficient": "スナップショットを見直します",
  "resource-warning": "計算・出力負荷の確認が必要です",
};
const severity = {
  blocking: "修正が必要",
  warning: "確認が必要",
  strength: "整合しています",
};
export function PlanReviewStage({
  project,
  requestReview,
  updateReview,
  commit,
  revise,
  setChangeReason,
  onGlossary,
}: {
  project: ProjectState;
  requestReview: (limitations: string[]) => void;
  updateReview: (review: PlanReviewRecord) => void;
  commit: () => void;
  revise: () => void;
  setChangeReason: (reasonId: string) => void;
  onGlossary: (id: string) => void;
}) {
  const [limitations, setLimitations] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const currentHash = subjectHash(buildReviewedSubject(project, []));
  const review = [...project.planReviewHistory]
    .reverse()
    .find((r) => r.subjectHash === currentHash);
  const ordered = useMemo(
    () =>
      orderChoices(
        limitationChoices,
        { kind: "stable-shuffle", orderVersion: 1, pinToEnd: ["unsure"] },
        {
          choiceOrderSeed: project.choiceOrderSeed,
          themeId: project.themeId,
          groupId: "s06-limitations",
        },
      ),
    [project.choiceOrderSeed, project.themeId],
  );
  const misconception = limitations.some(
    (id) =>
      limitationChoices.find((x) => x.id === id)?.category === "misconception",
  );
  function run() {
    requestReview(limitations);
    requestAnimationFrame(() =>
      summaryRef.current?.focus({ preventScroll: true }),
    );
  }
  function patch(change: Partial<PlanReviewRecord>) {
    if (review) updateReview({ ...review, ...change });
  }
  const warning = review?.findings.find((f) => f.severity === "warning");
  const ready =
    review && !review.findings.some((f) => f.severity === "blocking");
  return (
    <article className="stage plan-review">
      <p className="eyebrow">S06 / Miraによる研究計画レビュー</p>
      <h1 id="stage-title" tabIndex={-1}>
        研究計画案のつながりを確認する
      </h1>
      <div className="mira-review-intro">
        <strong>★ Mira（研究パートナー）</strong>
        <p>
          私が確認するのは、仮説が正しいかどうかではありません。知りたいこと、測る量、計算条件、作る図がつながっているかを一緒に確認します。
        </p>
      </div>
      <section>
        <h2>レビュー前の研究計画案</h2>
        <dl>
          <dt>研究課題・測定対象</dt>
          <dd>
            {project.researchQuestion?.choiceId}／
            {project.researchQuestion?.measurementId}
          </dd>
          <dt>仮説・事前予想</dt>
          <dd>
            {project.hypothesis?.choiceId}／{project.prediction?.choiceId}
          </dd>
          <dt>計算条件</dt>
          <dd>
            <button
              className="term-link"
              onClick={() => onGlossary("comoving-distance")}
            >
              L
            </button>{" "}
            = {project.researchPlanDraft.boxSizeMpcOverH} h⁻¹ Mpc、
            <button
              className="term-link"
              onClick={() => onGlossary("particle-side")}
            >
              N<sub>side</sub>
            </button>{" "}
            = {project.researchPlanDraft.particleSide}
          </dd>
          <dt>スナップショット</dt>
          <dd>
            <button
              className="term-link"
              onClick={() => onGlossary("snapshot")}
            >
              時刻
            </button>
            :{" "}
            {project.researchPlanDraft.snapshotIds
              .map(formatSnapshotId)
              .join("、")}
          </dd>
          <dt>主解析・主要図</dt>
          <dd>
            {project.researchPlanDraft.primaryAnalysis}／
            {project.researchPlanDraft.plannedFigure}
          </dd>
        </dl>
        {!review && (
          <button className="primary" onClick={run}>
            Miraに計画案をレビューしてもらう
          </button>
        )}
      </section>
      {review && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          className="review-results"
          aria-labelledby="review-summary-title"
        >
          <h2 id="review-summary-title">
            レビュー結果：{states[review.overallState]}
          </h2>
          <p>
            7つの観点を論理順に確認しました。総合点や仮説の正誤ではありません。
          </p>
          {review.findings.map((f) => (
            <section className={`finding ${f.severity}`} key={f.findingId}>
              <h3>
                {severity[f.severity]}：{f.category}
              </h3>
              <p>{findingMessages[f.messageId]}</p>
            </section>
          ))}
        </div>
      )}
      {review && (
        <section>
          <h2>研究の限界を自分で確認する</h2>
          <p>
            「この研究で結論を出せないこと」「ミニ論文の限界欄へ残すべきこと」を選んでください。有限体積・粒子数、乱数シード、物理モデル、解析計画の4種類が必要です。
          </p>
          <div className="choice-grid">
            {ordered.map((c) => (
              <label className="plan-choice" key={c.id}>
                <input
                  type="checkbox"
                  checked={(review.limitationChoiceIds.length
                    ? review.limitationChoiceIds
                    : limitations
                  ).includes(c.id)}
                  onChange={(e) => {
                    const base = review.limitationChoiceIds;
                    const next = e.target.checked
                      ? [...base, c.id]
                      : base.filter((x) => x !== c.id);
                    setLimitations(next);
                    patch({
                      limitationChoiceIds: next,
                      subjectSnapshot: {
                        ...review.subjectSnapshot,
                        limitationChoiceIds: next,
                      },
                    });
                  }}
                />
                {c.label}
              </label>
            ))}
          </div>
          {misconception && (
            <p className="validation-summary">
              粒子数を増やしても物理モデルは増えず、高密度領域だけから銀河形成を直接確認できません。限界のある候補を比べて再選択してください。
            </p>
          )}
          {review.limitationChoiceIds.includes("unsure") && (
            <p className="notice">
              比較のヒント：箱・粒子数、乱数シード、含まれない物理、図や保存時刻の各欄から一つずつ探しましょう。
            </p>
          )}
          <p>
            {limitationsComplete(review.limitationChoiceIds)
              ? "必要な4種類の限界を認識しました。"
              : "まだ必要な限界がそろっていません。"}
          </p>
        </section>
      )}
      {review && warning && (
        <section>
          <h2>計算・出力負荷を理解して維持する理由</h2>
          <div className="choice-grid">
            {orderChoices(
              warningReasons,
              { kind: "stable-shuffle", orderVersion: 1 },
              {
                choiceOrderSeed: project.choiceOrderSeed,
                themeId: project.themeId,
                groupId: "s06-warning-reason",
              },
            ).map((r) => (
              <label className="plan-choice" key={r.id}>
                <input
                  type="radio"
                  name="warning-reason"
                  checked={review.acknowledgementRecords.some(
                    (a) => a.reasonId === r.id,
                  )}
                  onChange={() =>
                    patch({
                      acknowledgementRecords: [
                        {
                          findingId: warning.findingId,
                          reasonId: r.id,
                          acknowledged: true,
                        },
                      ],
                      studentDecision: "approve-with-warning",
                    })
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </section>
      )}
      {review &&
        project.planVersions.length > 0 &&
        !project.planVersions.some(
          (v) => v.sourceReviewId === review.reviewId,
        ) && (
          <section>
            <h2>前版からの変更理由</h2>
            {changeReasons.map((r) => (
              <label key={r.id}>
                <input
                  type="radio"
                  name="change-reason"
                  checked={project.planChangeReasonId === r.id}
                  onChange={() => setChangeReason(r.id)}
                />
                {r.label}
              </label>
            ))}
          </section>
        )}
      {review && (
        <div className="actions">
          <button onClick={revise}>計画案を修正する</button>
          {ready && (
            <>
              <button
                onClick={() =>
                  patch({
                    studentDecision: warning
                      ? "approve-with-warning"
                      : "approve",
                  })
                }
              >
                この計画で進む
              </button>
              <button className="primary" onClick={commit}>
                この計画を正式な第{project.planVersions.length + 1}版として保存
              </button>
            </>
          )}
        </div>
      )}
      {project.planVersions.length > 0 && (
        <section className="completion-notice">
          <h2>S06 完了サマリ</h2>
          <p>
            レビュー済みの計画版を保存しました。次は試し計算で、この研究計画の長所と限界を確かめます。
          </p>
          <h3>計画版履歴</h3>
          <ol>
            {project.planVersions.map((v) => (
              <li key={v.planVersionId}>
                第{v.versionNumber}版（{v.review.overallState}）
              </li>
            ))}
          </ol>
        </section>
      )}
      {project.planReviewHistory
        .filter((r) => r.subjectHash !== currentHash)
        .map((r) => (
          <p key={r.reviewId} className="notice">
            以前の研究計画案に対するレビュー：{states[r.overallState]}
          </p>
        ))}
    </article>
  );
}
