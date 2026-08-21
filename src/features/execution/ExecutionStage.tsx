import { useEffect, useRef, useState } from "react";
import type { ProjectState } from "../../domain/project";
import { StageLearningFrame } from "../../components/stage/StageLearningFrame";
import { RichText } from "../../components/RichText";
import { stageLearning } from "../../content/ja/stageLearning";
import {
  acquire,
  canEnterExecution,
  canonicalSnapshots,
  createAcquisitionRequest,
  requestFingerprint,
  type BoundResultPackageRef,
} from "./logic";

type Status = "idle" | "loading" | "success" | "error";
const labels: Record<string, string> = {
  "density-image": "投影密度画像",
  "sigma-delta": "密度コントラストの標準偏差",
  "dense-fraction": "高密度領域の割合",
  "density-panels": "時代別の密度パネル",
  "sigma-growth": "標準偏差の成長図",
  "dense-growth": "高密度領域割合の成長図",
};
const time: Record<string, [number, number]> = {
  initial: [49, 0.02],
  z10: [10, 1 / 11],
  z5: [5, 1 / 6],
  z2: [2, 1 / 3],
  z1: [1, 0.5],
  z0: [0, 1],
};
export function ExecutionStage({
  project,
  save,
  onGlossary,
  back,
  next = () => undefined,
  acquirePackage = acquire,
}: {
  project: ProjectState;
  save: (ref: BoundResultPackageRef) => Promise<void>;
  onGlossary: (id: string, source?: HTMLElement) => void;
  back: () => void;
  next?: () => void;
  acquirePackage?: typeof acquire;
}) {
  const plan = project.planVersions.find(
      (v) => v.planVersionId === project.activePlanVersionId,
    ),
    valid = canEnterExecution(project);
  const [status, setStatus] = useState<Status>("idle"),
    [error, setError] = useState(""),
    [acquired, setAcquired] = useState<BoundResultPackageRef | null>(null);
  const token = useRef(0);
  useEffect(
    () => () => {
      token.current += 1;
    },
    [],
  );
  if (!plan || !valid)
    return (
      <article className="stage execution">
        <p className="eyebrow">S08 / データ取得</p>
        <h1 id="stage-title">研究計画をもう一度確認しましょう</h1>
        <div className="mira-inline">
          <strong>Mira — 研究パートナー</strong>
          <p>
            有効な承認済みPlanVersionと、それに結び付いた完了pilotを確認できません。取得条件を決める直前段階へ戻りましょう。
          </p>
        </div>
        <button onClick={back}>必須の試し計算へ戻る</button>
      </article>
    );
  const request = createAcquisitionRequest(plan, project.themeId),
    ids = canonicalSnapshots(plan.resolved.snapshotIds),
    stem = `L${String(plan.resolved.boxSizeMpcOverH).padStart(3, "0")}_N${String(plan.resolved.particleSide).padStart(3, "0")}`,
    packageId = `${stem}_demo_v1`,
    seed =
      1701 + plan.resolved.boxSizeMpcOverH * 10 + plan.resolved.particleSide;
  async function start() {
    const own = ++token.current,
      setPlan = project.activePlanVersionId;
    setStatus("loading");
    setError("");
    try {
      const ref = await acquirePackage(request);
      if (own !== token.current || setPlan !== project.activePlanVersionId)
        return;
      await save(ref);
      setAcquired(ref);
      setStatus("success");
    } catch (e) {
      if (own !== token.current) return;
      setError(e instanceof Error ? e.message : "取得に失敗しました。");
      setStatus("error");
    }
  }
  const persisted =
    project.resultPackage?.refKind === "bound" &&
    project.resultPackage.planVersionId === plan.planVersionId &&
    project.resultPackage.requestFingerprint === requestFingerprint(request)
      ? project.resultPackage
      : null;
  const ref = acquired ?? persisted;
  return (
    <article className="stage execution">
      <p className="eyebrow">S08 / 研究計画に一致する結果パッケージ</p>
      <h1 id="stage-title">研究計画に合うデータを取得する</h1>
      <StageLearningFrame content={stageLearning.execution} />
      <div className="demo-banner">
        <strong>DEMO / synthetic fixture</strong>
        <p>
          完成版では、同じ条件で事前に計算した結果を読み込みます。現在のプロトタイプでは、あらかじめ定義した教育用の合成結果をブラウザ内で再現して読み込みます。これはCWSや実際のN体計算の結果ではありません。
        </p>
      </div>
      <section>
        <h2>1. この段階で明らかにすること</h2>
        <p>
          <RichText
            text="研究計画と一致する[[result-package|結果パッケージ]]を選び、その[[provenance|来歴]]を記録します。データ取得と解析は別の段階です。"
            onGlossary={onGlossary}
          />
        </p>
      </section>
      <section>
        <h2>2. 実行に使う研究計画</h2>
        <dl className="record-grid">
          <dt>PlanVersion</dt>
          <dd>
            v{plan.versionNumber}（{plan.planVersionId}）
          </dd>
          <dt>boxサイズ</dt>
          <dd>{plan.resolved.boxSizeMpcOverH} h⁻¹ Mpc</dd>
          <dt>N_side／総粒子数</dt>
          <dd>
            {plan.resolved.particleSide}／
            {plan.resolved.totalParticles.toLocaleString("ja-JP")}
          </dd>
          <dt>計画したsnapshot</dt>
          <dd>{ids.join("、")}</dd>
          <dt>主解析／主図</dt>
          <dd>
            {labels[plan.subjectSnapshot.draft.primaryAnalysis ?? ""]}／
            {labels[plan.subjectSnapshot.draft.plannedFigure ?? ""]}
          </dd>
          <dt>pilot</dt>
          <dd>完了済み・同じPlanVersionに結び付き</dd>
        </dl>
      </section>
      <section>
        <h2>
          3.{" "}
          <RichText
            text="[[catalog|catalog]]との照合"
            onGlossary={onGlossary}
          />
        </h2>
        <div className="table-scroll">
          <table>
            <caption>研究計画と候補結果パッケージの条件比較</caption>
            <thead>
              <tr>
                <th scope="col">確認項目</th>
                <th scope="col">研究計画</th>
                <th scope="col">結果パッケージ</th>
                <th scope="col">一致状況</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "boxサイズと単位",
                  `${plan.resolved.boxSizeMpcOverH} h⁻¹ Mpc`,
                  `${plan.resolved.boxSizeMpcOverH} h⁻¹ Mpc`,
                ],
                [
                  "N_side",
                  plan.resolved.particleSide,
                  plan.resolved.particleSide,
                ],
                [
                  "総粒子数",
                  plan.resolved.totalParticles,
                  plan.resolved.totalParticles,
                ],
                ["必要なsnapshot", ids.join("、"), ids.join("、")],
              ].map((r) => (
                <tr key={String(r[0])}>
                  {r.map((v, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {v}
                      </th>
                    ) : (
                      <td key={i}>{v}</td>
                    ),
                  )}
                  <td className="match">一致</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          計画外のsnapshotは、今回は研究計画に含まれないため読み込みません。
        </p>
      </section>
      <section>
        <h2>
          4.{" "}
          <RichText
            text="[[manifest|manifest]]と[[provenance|来歴]]"
            onGlossary={onGlossary}
          />
        </h2>
        <p>
          manifestはデータの構成票です。どの条件で、何によって作られ、どの版なのかを後から確かめられます。
        </p>
        <dl className="record-grid">
          <dt>package ID</dt>
          <dd>{packageId}</dd>
          <dt>generator</dt>
          <dd>ABCs deterministic educational density fixture 1.0.0</dd>
          <dt>種別</dt>
          <dd>
            <strong>DEMO / synthetic fixture</strong>
          </dd>
          <dt>data／fixture version</dt>
          <dd>demo-data-1.0.0／1.0.0</dd>
          <dt>乱数seed／zStart</dt>
          <dd>{seed}／49</dd>
          <dt>境界／物理</dt>
          <dd>周期境界条件／衝突なし・暗黒物質のみ</dd>
          <dt>grid</dt>
          <dd>xy、128 × 128、rho_over_mean、Float32Array</dd>
          <dt>宇宙論</dt>
          <dd>
            not-modeled（宇宙論パラメータを仮定した力学計算ではありません）
          </dd>
          <dt>説明</dt>
          <dd>
            教育用の合成結果です。CWSや実際のN体計算の結果ではありません。
          </dd>
        </dl>
      </section>
      <section>
        <h2>5. 必要なsnapshotを取得</h2>
        <div className="table-scroll">
          <table>
            <caption>計画に含まれるsnapshotの取得状況</caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>赤方偏移 z</th>
                <th>スケール因子 a</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => (
                <tr key={id}>
                  <th scope="row">{id}</th>
                  <td>{time[id]![0]}</td>
                  <td>{time[id]![1].toPrecision(5)}</td>
                  <td>{ref ? "取得済み" : "未取得"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="primary acquisition-button"
          disabled={status === "loading"}
          onClick={() => void start()}
        >
          {status === "error"
            ? "この結果パッケージを再取得する"
            : "この結果パッケージを取得する"}
        </button>
        {status === "loading" && (
          <p role="status">
            catalog、manifest、必要なsnapshotを読み込んでいます。
          </p>
        )}
        {status === "error" && (
          <div role="alert" className="validation-summary">
            <p>{error}</p>
            <p>既存の取得記録は変更していません。</p>
          </div>
        )}
      </section>
      <section>
        <h2>6. 取得記録</h2>
        {ref ? (
          <>
            <p className="success-record">
              <strong>取得済み（品質未確認）</strong>
            </p>
            <dl className="record-grid">
              <dt>package ID</dt>
              <dd>{ref.packageId}</dd>
              <dt>PlanVersion</dt>
              <dd>{ref.planVersionId}</dd>
              <dt>data／fixture version</dt>
              <dd>
                {ref.dataVersion}／{ref.fixtureVersion}
              </dd>
              <dt>取得したsnapshot</dt>
              <dd>{ref.snapshotInventory.map((x) => x.id).join("、")}</dd>
              <dt>取得日時</dt>
              <dd>
                {new Intl.DateTimeFormat("ja-JP", {
                  dateStyle: "medium",
                  timeStyle: "medium",
                }).format(new Date(ref.acquiredAt))}
              </dd>
              <dt>provenance</dt>
              <dd>
                {ref.provenance.generator} {ref.provenance.generatorVersion}（
                {ref.provenance.kind}）
              </dd>
            </dl>
            <p>
              取得できたことと、科学研究に使える品質であることは別です。ここではまだ結果を解釈しません。
            </p>
            <button className="primary" onClick={next}>
              取得したデータの品質を確かめる
            </button>
          </>
        ) : (
          <p>
            {project.resultPackage
              ? "研究計画または版と一致しない古い取得記録です。再取得が必要です。"
              : "取得記録はまだありません。"}
          </p>
        )}
        <p className="next-preview">
          次は、欠損、単位、来歴などを確認し、解析に使えるデータかを確かめます。
        </p>
      </section>
    </article>
  );
}
