import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ResearchCycleBar } from "../components/ResearchCycleBar/ResearchCycleBar";
import { CompanionRail } from "../components/CompanionRail/CompanionRail";
import { supportFor } from "../content/ja/support/stageSupport";
import { cosmicWebGrowthTheme } from "../content/ja/themes/cosmicWebGrowth";
import {
  addMiraMessage,
  INTRODUCTION,
  miraAdvice,
} from "../content/ja/mira/rules";
import { createEmptyProject, type ProjectState } from "../domain/project";
import { Invitation } from "../features/invitation/Invitation";
import { QuestionStage } from "../features/question/QuestionStage";
import { HypothesisStage } from "../features/hypothesis/HypothesisStage";
import {
  hypothesisPredictionAligned,
  predictionChoices,
} from "../features/hypothesis/logic";
import { questionMeasurementAligned } from "../features/question/logic";
import { projectRepository } from "../persistence/projectRepository";
import { MethodStage } from "../features/method/MethodStage";
import { answerMethod, isCorrect } from "../features/method/logic";
import { PlanningStage } from "../features/planning/PlanningStage";
import { PlanReviewStage } from "../features/review/PlanReviewStage";
import {
  buildReviewedSubject,
  createPlanVersion,
  reviewPlan,
  subjectHash,
  type PlanReviewRecord,
} from "../features/review/logic";
import { REVIEW_RULE_SET_ID } from "../features/review/content";
import { PageTransitionFocusManager } from "../components/PageTransitionFocusManager/PageTransitionFocusManager";
import { PilotStage } from "../features/pilot/PilotStage";
import type { PilotRecord } from "../features/pilot/logic";
import { ExecutionStage } from "../features/execution/ExecutionStage";
import { QualityStage } from "../features/quality/QualityStage";
import { AnalysisModeStage } from "../features/analysis/AnalysisModeStage";
import {
  planCompletionMissing,
  updateDraft,
  type ReasonKey,
  type ResearchPlanDraft,
} from "../features/planning/logic";
import {
  guardReason,
  guardStage,
  type ImplementedStage,
} from "../features/method/stageGuard";

type LoadState = "loading" | "ready" | "error";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
function progressLabel(project: ProjectState) {
  if (project.resultPackage?.refKind === "bound")
    return "結果パッケージ 取得済み（品質未確認）";
  if (project.pilot?.status === "complete") return "必須の試し計算 完了";
  if (project.currentStage === "pilot") return "必須の試し計算中";
  if (project.planReviewCompletedAt) return "研究計画レビュー 完了";
  if (project.currentStage === "plan-review") return "研究計画をレビュー中";
  if (project.researchPlanDraft.completedAt) return "研究計画案 完了";
  if (project.currentStage === "planning") return "研究計画案 作成中";
  if (project.methodUnderstanding.completedAt) return "方法の理解 完了";
  if (project.currentStage === "method") return "方法を確認中";
  if (project.prediction) return "仮説と予想 完了";
  if (project.researchQuestion) return "研究課題 作成中";
  if (project.motivation) return "研究への招待 完了";
  if (project.currentStage === "invitation") return "研究への招待";
  return "研究の準備";
}

function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("保存済みの研究を確認しています。");
  const refresh = useCallback(async () => {
    try {
      setProjects(await projectRepository.list());
      setLoadState("ready");
      setMessage("このコンピュータに自動保存されます。");
    } catch {
      setLoadState("error");
      setMessage(
        "保存領域を読み込めませんでした。ブラウザの設定を確認してください。",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function createProject() {
    setMessage("保存しています…");
    try {
      const project = createEmptyProject();
      await projectRepository.save(project);
      navigate(`/projects/${project.projectId}`);
    } catch {
      setMessage("保存できませんでした。再度お試しください。");
    }
  }
  async function removeProject(project: ProjectState) {
    if (
      !window.confirm(
        `「${project.projectName}」を削除しますか？この操作は取り消せません。`,
      )
    )
      return;
    try {
      await projectRepository.remove(project.projectId);
      await refresh();
    } catch {
      setMessage("削除できませんでした。再度お試しください。");
    }
  }
  return (
    <main id="main-content" className="home">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Undergraduate Astronomy Research Lab</p>
        <h1 id="hero-title">ABCs — Astronomy Begins with Curiosity</h1>
        <p className="tagline">宇宙への疑問を、研究のかたちに。</p>
        <p className="intro">
          知識がなくても、模式図を観察し、Miraや用語解説と一緒に「宇宙の網目」の不思議を見つけられます。
        </p>
        <button
          className="primary"
          onClick={() => void createProject()}
          disabled={loadState === "loading"}
        >
          新しい研究を始める
        </button>
      </section>
      <section className="theme-card" aria-labelledby="theme-title">
        <p className="eyebrow">v0.1 研究テーマ</p>
        <h2 id="theme-title">{cosmicWebGrowthTheme.title}</h2>
        <p>{cosmicWebGrowthTheme.question}</p>
        <p className="phase-note">v0.1-alpha</p>
      </section>
      <section aria-labelledby="projects-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">このコンピュータの記録</p>
            <h2 id="projects-title">研究プロジェクト</h2>
          </div>
          <span className={`save-status ${loadState}`} role="status">
            {message}
          </span>
        </div>
        {loadState === "ready" && projects.length === 0 && (
          <p className="empty-state">保存された研究はまだありません。</p>
        )}
        <ul className="project-list" aria-label="保存済み研究プロジェクト">
          {projects.map((project) => (
            <li key={project.projectId} className="project-card">
              <div>
                <h3>{project.projectName}</h3>
                <p>更新: {formatDate(project.updatedAt)}</p>
                <p>進捗: {progressLabel(project)}</p>
              </div>
              <div className="actions">
                <button
                  onClick={() => navigate(`/projects/${project.projectId}`)}
                >
                  続きから始める
                </button>
                <button
                  className="danger"
                  onClick={() => void removeProject(project)}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ProjectWorkspace() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectState>();
  const [saveStatus, setSaveStatus] =
    useState("研究プロジェクトを読み込んでいます。");
  const [selectedGlossary, setSelectedGlossary] = useState<string>();
  const [glossaryRequest, setGlossaryRequest] = useState(0);
  const glossarySource = useRef<HTMLElement | null>(null);
  const [note, setNote] = useState("");
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    let active = true;
    projectRepository
      .get(projectId)
      .then((result) => {
        if (!active) return;
        if (result) {
          const requested = (
            [
              "home",
              "invitation",
              "question",
              "hypothesis",
              "method",
              "planning",
              "plan-review",
              "pilot",
              "execution",
              "quality",
              "analysis-mode",
            ] as const
          ).includes(result.currentStage as ImplementedStage)
            ? (result.currentStage as ImplementedStage)
            : "pilot";
          const safeStage = guardStage(result, requested);
          const wasGuarded = safeStage !== requested;
          const history = addMiraMessage(
            result.miraHistory,
            "introduction",
            INTRODUCTION,
            new Date(result.createdAt),
          );
          const guardedHistory = wasGuarded
            ? addMiraMessage(
                history,
                `stage-guard-${safeStage}`,
                guardReason(safeStage),
              )
            : history;
          const hydrated = {
            ...result,
            currentStage: safeStage,
            miraHistory: guardedHistory,
          };
          setProject(hydrated);
          setNote(hydrated.motivation?.note ?? "");
          if (guardedHistory !== result.miraHistory || wasGuarded)
            void projectRepository.save(hydrated);
          setSaveStatus("保存済みの状態から再開しました。");
        } else setSaveStatus("研究プロジェクトが見つかりません。");
      })
      .catch(
        () =>
          active && setSaveStatus("研究プロジェクトを読み込めませんでした。"),
      );
    return () => {
      active = false;
    };
  }, [projectId]);
  const persist = useCallback(async (next: ProjectState): Promise<boolean> => {
    setProject(next);
    setSaveStatus("保存しています…");
    try {
      await projectRepository.save(next);
      setSaveStatus("保存しました。");
      return true;
    } catch {
      setSaveStatus(
        "保存できませんでした。再試行するか、あとで記録を控えてください。",
      );
      return false;
    }
  }, []);
  function openGlossary(id: string, source?: HTMLElement) {
    if (!project) return;
    if (
      !source &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.classList.contains("glossary-link")
    )
      source = document.activeElement;
    setSelectedGlossary(id);
    if (source) glossarySource.current = source;
    setGlossaryRequest((value) => value + 1);
    const viewed = project.glossaryViewed.includes(id)
      ? project.glossaryViewed
      : [...project.glossaryViewed, id];
    if (viewed !== project.glossaryViewed)
      void persist({
        ...project,
        glossaryViewed: viewed,
        updatedAt: new Date().toISOString(),
      });
  }
  function startInvitation() {
    if (!project) return;
    void persist({
      ...project,
      currentStage: "invitation",
      updatedAt: new Date().toISOString(),
    });
  }
  function chooseMotivation(choiceId: string) {
    if (!project) return;
    const now = new Date().toISOString();
    const next = {
      ...project,
      motivation: { choiceId, note, chosenAt: now },
      updatedAt: now,
      miraHistory: addMiraMessage(
        project.miraHistory,
        `motivation-${choiceId}`,
        miraAdvice(choiceId),
      ),
    };
    void persist(next);
  }
  function goStage(stage: ImplementedStage) {
    if (!project) return;
    const guarded = guardStage(project, stage);
    void persist({
      ...project,
      currentStage: guarded,
      updatedAt: new Date().toISOString(),
      miraHistory:
        guarded !== stage
          ? addMiraMessage(
              project.miraHistory,
              `stage-guard-${guarded}`,
              guardReason(guarded),
            )
          : project.miraHistory,
    });
  }
  function updateMethod(questionId: string, choiceId: string) {
    if (!project) return;
    const now = new Date().toISOString();
    const methodUnderstanding = answerMethod(
      project.methodUnderstanding,
      questionId,
      choiceId,
      now,
    );
    const correct = isCorrect(questionId, choiceId);
    void persist({
      ...project,
      methodUnderstanding,
      updatedAt: now,
      miraHistory: addMiraMessage(
        project.miraHistory,
        `method-${questionId}-${choiceId}`,
        choiceId === "unsure"
          ? "まだわからなくても不利益はありません。私と本文の違いを一つずつ確認しましょう。"
          : correct
            ? "選んだ理由を教材の説明と照らしました。何を直接扱えるかという境界が研究計画の土台になります。"
            : "回答を記録しました。正誤だけでなく、選択肢の下に示した理由を比べて再挑戦できます。",
      ),
    });
  }
  function updatePlan(
    change: Partial<ResearchPlanDraft>,
    reason: ReasonKey | null,
  ) {
    setProject((current) => {
      if (!current) return current;
      const now = new Date().toISOString();
      const draft = updateDraft(current.researchPlanDraft, change, reason, now);
      const next = {
        ...current,
        researchPlanDraft: draft,
        planReviewCompletedAt: null,
        activePlanVersionId:
          current.pilot?.status === "awaiting-rereview"
            ? current.activePlanVersionId
            : null,
        updatedAt: now,
        miraHistory: addMiraMessage(
          current.miraHistory,
          `planning-${reason ?? Object.keys(change)[0]}-${JSON.stringify(change)}`,
          "選択を記録しました。私と、調べやすくなること、調べにくくなること、次に比べたい判断を確認しましょう。",
        ),
      };
      setSaveStatus("保存しています…");
      void projectRepository.save(next).then(
        () => setSaveStatus("保存しました。"),
        () => setSaveStatus("保存できませんでした。再試行してください。"),
      );
      return next;
    });
  }
  function completePlan() {
    setProject((current) => {
      if (!current || planCompletionMissing(current.researchPlanDraft).length)
        return current;
      const now = new Date().toISOString();
      const next = {
        ...current,
        updatedAt: now,
        researchPlanDraft: {
          ...current.researchPlanDraft,
          completedAt: now,
          updatedAt: now,
        },
        currentStage: "plan-review" as const,
      };
      setSaveStatus("保存しています…");
      void projectRepository
        .save(next)
        .then(() => setSaveStatus("保存しました。"));
      return next;
    });
  }
  function requestReview(limitationChoiceIds: string[]) {
    if (!project) return;
    const subject = buildReviewedSubject(project, limitationChoiceIds);
    const hash = subjectHash(subject);
    if (
      project.planReviewHistory.some(
        (r) => r.subjectHash === hash && r.ruleSetId === REVIEW_RULE_SET_ID,
      )
    )
      return;
    const now = new Date().toISOString();
    const result = reviewPlan(subject);
    const record: PlanReviewRecord = {
      reviewId: crypto.randomUUID(),
      ruleSetId: REVIEW_RULE_SET_ID,
      reviewedAt: now,
      subjectHash: hash,
      subjectSnapshot: structuredClone(subject),
      overallState: result.overallState,
      findings: result.findings,
      acknowledgementRecords: [],
      limitationChoiceIds,
      studentDecision: null,
      committedPlanVersionId: null,
      completedAt: null,
    };
    void persist({
      ...project,
      planReviewHistory: [...project.planReviewHistory, record],
      updatedAt: now,
      miraHistory: addMiraMessage(
        project.miraHistory,
        `review-${record.reviewId}`,
        "研究計画案の7つのつながりを確認しました。仮説の正誤ではなく、選択した事実、長所、不足または負荷、修正できる項目の順で一緒に考えます。",
      ),
    });
  }
  function updateReview(review: PlanReviewRecord) {
    if (!project) return;
    const now = new Date().toISOString();
    void persist({
      ...project,
      planReviewHistory: project.planReviewHistory.map((r) =>
        r.reviewId === review.reviewId ? review : r,
      ),
      updatedAt: now,
    });
  }
  function commitReview() {
    if (!project) return;
    const subject = buildReviewedSubject(project, []);
    const hash = subjectHash(subject);
    const review = [...project.planReviewHistory]
      .reverse()
      .find((r) => r.subjectHash === hash);
    if (!review) return;
    try {
      const now = new Date().toISOString();
      const versions = createPlanVersion(
        review,
        project.planVersions,
        project.planChangeReasonId,
        now,
      );
      const version = versions.find(
        (v) => v.sourceReviewId === review.reviewId,
      )!;
      const complete = {
        ...review,
        committedPlanVersionId: version.planVersionId,
        completedAt: now,
      };
      void persist({
        ...project,
        planVersions: versions,
        activePlanVersionId: version.planVersionId,
        planReviewHistory: project.planReviewHistory.map((r) =>
          r.reviewId === review.reviewId ? complete : r,
        ),
        planReviewCompletedAt: now,
        pilot:
          project.pilot?.status === "awaiting-rereview"
            ? {
                ...project.pilot,
                status: "complete",
                resultingPlanVersionId: version.planVersionId,
                completedAt: now,
              }
            : project.pilot,
        currentStage: "pilot",
        updatedAt: now,
      });
    } catch {
      setSaveStatus(
        "保存条件を確認してください。警告の理由、限界、進む判断が必要です。",
      );
    }
  }
  function updateQuestion(field: string, value: string) {
    if (!project) return;
    const now = new Date().toISOString();
    const old = project.researchQuestion;
    const draft = old ?? {
      choiceId: "",
      measurementId: "",
      timeFocusId: "",
      spaceFocusId: "",
      alignment: {
        status: "needs-review" as const,
        acknowledged: false,
        reasonId: null,
      },
      note: "",
      chosenAt: now,
    };
    let q = { ...draft, [field]: value, chosenAt: now };
    if (field === "questionReview")
      q = {
        ...q,
        alignment: {
          status: "acknowledged",
          acknowledged: true,
          reasonId: value,
        },
      };
    else {
      const ok =
        q.choiceId &&
        q.measurementId &&
        questionMeasurementAligned(q.choiceId, q.measurementId);
      q = {
        ...q,
        alignment: {
          status: ok ? "aligned" : "needs-review",
          acknowledged: false,
          reasonId: null,
        },
      };
    }
    void persist({
      ...project,
      researchQuestion: q,
      planReviewCompletedAt: null,
      activePlanVersionId: null,
      updatedAt: now,
      miraHistory: addMiraMessage(
        project.miraHistory,
        `question-${field}-${value}`,
        field === "measurementId"
          ? `選んだ測定対象で何を直接比べられるか確認しました。次は時間と空間の焦点を一つずつ考えましょう。`
          : `「${value}」という研究判断を記録しました。次に必要な一つの選択へ進みましょう。`,
      ),
    });
  }
  function updateHypothesis(field: string, value: string) {
    if (!project?.researchQuestion) return;
    const now = new Date().toISOString();
    let h = project.hypothesis;
    let p = project.prediction;
    if (field === "hypothesis")
      h = { choiceId: value, note: h?.note ?? "", chosenAt: now };
    if (field === "prediction") {
      const x = predictionChoices(
        project.researchQuestion.measurementId,
        project.researchQuestion.choiceId,
      ).find((x) => x.id === value)!;
      p = {
        choiceId: value,
        direction: x.direction,
        reasonId: p?.reasonId ?? "",
        alignment: {
          status:
            h && hypothesisPredictionAligned(h.choiceId, x.direction)
              ? "aligned"
              : "needs-review",
          acknowledged: false,
          reasonId: null,
        },
        note: p?.note ?? "",
        chosenAt: now,
      };
    }
    if (field === "predictionReason" && p)
      p = { ...p, reasonId: value, chosenAt: now };
    if (field === "predictionNote" && p)
      p = { ...p, note: value, chosenAt: now };
    if (field === "predictionReview" && p)
      p = {
        ...p,
        alignment: {
          status: "acknowledged",
          acknowledged: true,
          reasonId: value,
        },
        chosenAt: now,
      };
    if (h && p && field === "hypothesis")
      p = {
        ...p,
        alignment: {
          status: hypothesisPredictionAligned(h.choiceId, p.direction)
            ? "aligned"
            : "needs-review",
          acknowledged: false,
          reasonId: null,
        },
      };
    void persist({
      ...project,
      hypothesis: h,
      prediction: p,
      planReviewCompletedAt: null,
      activePlanVersionId: null,
      updatedAt: now,
      miraHistory: addMiraMessage(
        project.miraHistory,
        `hypothesis-${field}-${value}`,
        value.includes("uncertain") || value === "uncertain"
          ? "「まだわからない」を記録しました。判断を保留しても不利益はありません。次に、データなら何が見えるかを一つ考えましょう。"
          : "仮説と予想の選択を記録しました。正誤は判定せず、両者が同じ方向かを確認します。",
      ),
    });
  }
  function updateNote(value: string) {
    setNote(value);
    if (!project?.motivation) return;
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      const now = new Date().toISOString();
      void persist({
        ...project,
        motivation: { ...project.motivation!, note: value },
        updatedAt: now,
      });
    }, 500);
  }
  if (!project)
    return (
      <main id="main-content" className="workspace">
        <p role="status">{saveStatus}</p>
      </main>
    );
  return (
    <main id="main-content" className="workspace">
      <PageTransitionFocusManager
        pageKey={`${projectId}:${project.currentStage}`}
        title={
          project.currentStage === "plan-review"
            ? "研究計画レビュー"
            : project.projectName
        }
        headingId="stage-title"
      />
      <nav aria-label="研究プロジェクト">
        <button className="link-button" onClick={() => navigate("/")}>
          ← プロジェクト一覧へ
        </button>
      </nav>
      <div className="project-heading">
        <div>
          <p className="eyebrow">研究プロジェクト</p>
          <h1>{project.projectName}</h1>
        </div>
        <p
          className={`save-status ${saveStatus.startsWith("保存でき") ? "error" : "ready"}`}
          role="status"
        >
          {saveStatus}
        </p>
      </div>
      <ResearchCycleBar project={project} />
      <div className="research-layout">
        <section
          id="stage-content"
          className="work-card"
          aria-labelledby="stage-title"
        >
          {project.currentStage === "home" ? (
            <div className="welcome">
              <p className="eyebrow">空の研究ワークスペース</p>
              <h2 id="stage-title" tabIndex={-1}>
                宇宙への疑問を見つける準備ができました
              </h2>
              <p>
                このアプリは天文学の予備知識を前提にしません。わからない用語は、本文の点線付きリンクからその場で確認できます。
              </p>
              <button className="primary" onClick={startInvitation}>
                研究への招待を始める
              </button>
            </div>
          ) : project.currentStage === "question" ? (
            <QuestionStage
              project={project}
              update={updateQuestion}
              back={() => goStage("invitation")}
              next={() => goStage("hypothesis")}
              onGlossary={openGlossary}
            />
          ) : project.currentStage === "hypothesis" ? (
            <HypothesisStage
              project={project}
              update={updateHypothesis}
              back={() => goStage("question")}
              next={() => goStage("method")}
              onGlossary={openGlossary}
            />
          ) : project.currentStage === "method" ? (
            <MethodStage
              project={project}
              onAnswer={updateMethod}
              back={() => goStage("hypothesis")}
              next={() => goStage("planning")}
              onGlossary={openGlossary}
            />
          ) : project.currentStage === "planning" ? (
            <PlanningStage
              project={project}
              update={updatePlan}
              complete={completePlan}
              review={() => goStage("plan-review")}
              back={() => goStage("method")}
              onGlossary={openGlossary}
            />
          ) : project.currentStage === "plan-review" ? (
            <PlanReviewStage
              project={project}
              onGlossary={openGlossary}
              requestReview={requestReview}
              updateReview={updateReview}
              commit={commitReview}
              revise={() => goStage("planning")}
              setChangeReason={(planChangeReasonId) =>
                void persist({
                  ...project,
                  planChangeReasonId,
                  updatedAt: new Date().toISOString(),
                })
              }
            />
          ) : project.currentStage === "pilot" ? (
            <PilotStage
              project={project}
              next={() => goStage("execution")}
              onGlossary={openGlossary}
              save={async (pilot) => {
                await persist({
                  ...project,
                  pilot,
                  updatedAt: new Date().toISOString(),
                });
              }}
              revise={async (pilot: PilotRecord) => {
                if (!pilot.comparison || !pilot.axis) return;
                const now = new Date().toISOString();
                const draft = structuredClone(
                  project.planVersions.find(
                    (v) => v.planVersionId === pilot.baselinePlanVersionId,
                  )!.subjectSnapshot.draft,
                );
                if (pilot.axis === "box-size")
                  draft.boxSizeMpcOverH = pilot.comparison.boxSizeMpcOverH as
                    | 25
                    | 50
                    | 75
                    | 100;
                else
                  draft.particleSide = pilot.comparison.particleSide as
                    | 16
                    | 32
                    | 64;
                draft.completedAt = null;
                draft.updatedAt = now;
                await persist({
                  ...project,
                  pilot,
                  researchPlanDraft: draft,
                  planReviewCompletedAt: null,
                  planChangeReasonId: "pilot-revision",
                  currentStage: "planning",
                  updatedAt: now,
                });
              }}
            />
          ) : project.currentStage === "execution" ? (
            <ExecutionStage
              project={project}
              onGlossary={openGlossary}
              back={() => goStage("pilot")}
              next={() => goStage("quality")}
              save={async (resultPackage) => {
                await persist({
                  ...project,
                  resultPackage,
                  currentStage: "execution",
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
          ) : project.currentStage === "quality" ? (
            <QualityStage
              project={project}
              onGlossary={openGlossary}
              onSave={persist}
              onReacquire={() => goStage("execution")}
              onStartAnalysis={() =>
                void persist({
                  ...project,
                  currentStage: "analysis-mode",
                  updatedAt: new Date().toISOString(),
                })
              }
            />
          ) : project.currentStage === "analysis-mode" ? (
            <AnalysisModeStage
              project={project}
              onSave={persist}
              onGlossary={openGlossary}
            />
          ) : (
            <Invitation
              project={project}
              onGlossary={openGlossary}
              onChoice={chooseMotivation}
              note={note}
              onNote={updateNote}
              onNext={() => goStage("question")}
            />
          )}
        </section>
        <CompanionRail
          history={project.miraHistory}
          support={supportFor(project)}
          selectedGlossary={selectedGlossary}
          onGlossary={openGlossary}
          glossaryRequest={glossaryRequest}
          onReturn={
            glossarySource.current
              ? () => {
                  const target = glossarySource.current?.isConnected
                    ? glossarySource.current
                    : document.getElementById("stage-title");
                  target?.focus({ preventScroll: true });
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#stage-content">
        研究内容へ移動
      </a>
      <header className="site-header">
        <div className="site-header-content">
          <a href={`${import.meta.env.BASE_URL}#/`} aria-label="ABCs ホーム">
            ABCs <span>Astronomy Begins with Curiosity</span>
          </a>
          <p className="prototype-status">開発中のプロトタイプ — v0.1-alpha</p>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
