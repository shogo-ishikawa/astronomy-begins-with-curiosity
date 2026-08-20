import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { GlossaryPanel } from "../components/GlossaryPanel/GlossaryPanel";
import { MiraPanel } from "../components/MiraPanel/MiraPanel";
import { ResearchProgress } from "../components/ResearchProgress/ResearchProgress";
import { cosmicWebGrowthTheme } from "../content/ja/themes/cosmicWebGrowth";
import {
  addMiraMessage,
  INTRODUCTION,
  miraAdvice,
} from "../content/ja/mira/rules";
import { createEmptyProject, type ProjectState } from "../domain/project";
import { Invitation } from "../features/invitation/Invitation";
import { projectRepository } from "../persistence/projectRepository";

type LoadState = "loading" | "ready" | "error";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
function progressLabel(project: ProjectState) {
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
        <p className="phase-note">
          Phase
          1Aでは「研究への招待」を体験し、気になったことを研究の出発点として保存できます。
        </p>
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
  const [sideTab, setSideTab] = useState<"mira" | "glossary">("mira");
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
          const history = addMiraMessage(
            result.miraHistory,
            "introduction",
            INTRODUCTION,
            new Date(result.createdAt),
          );
          const hydrated = { ...result, miraHistory: history };
          setProject(hydrated);
          setNote(hydrated.motivation?.note ?? "");
          if (history !== result.miraHistory)
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
  const persist = useCallback(async (next: ProjectState) => {
    setProject(next);
    setSaveStatus("保存しています…");
    try {
      await projectRepository.save(next);
      setSaveStatus("保存しました。");
    } catch {
      setSaveStatus(
        "保存できませんでした。再試行するか、あとで記録を控えてください。",
      );
    }
  }, []);
  function openGlossary(id: string) {
    if (!project) return;
    setSelectedGlossary(id);
    setSideTab("glossary");
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
    setSideTab("mira");
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
      <div className="workspace-grid">
        <ResearchProgress project={project} />
        <section className="work-card">
          {project.currentStage === "home" ? (
            <div className="welcome">
              <p className="eyebrow">空の研究ワークスペース</p>
              <h2>宇宙への疑問を見つける準備ができました</h2>
              <p>
                このアプリは天文学の予備知識を前提にしません。わからない用語は、本文の点線付きリンクからその場で確認できます。
              </p>
              <button className="primary" onClick={startInvitation}>
                研究への招待を始める
              </button>
            </div>
          ) : (
            <Invitation
              project={project}
              onGlossary={openGlossary}
              onChoice={chooseMotivation}
              note={note}
              onNote={updateNote}
            />
          )}
        </section>
        <aside className="support-panel">
          <div role="tablist" aria-label="研究サポート">
            <button
              role="tab"
              aria-selected={sideTab === "mira"}
              aria-controls="mira-tabpanel"
              id="mira-tab"
              onClick={() => setSideTab("mira")}
              onKeyDown={(e) => {
                if (e.key.startsWith("Arrow")) setSideTab("glossary");
              }}
            >
              Mira
            </button>
            <button
              role="tab"
              aria-selected={sideTab === "glossary"}
              aria-controls="glossary-tabpanel"
              id="glossary-tab"
              onClick={() => setSideTab("glossary")}
              onKeyDown={(e) => {
                if (e.key.startsWith("Arrow")) setSideTab("mira");
              }}
            >
              用語解説
            </button>
          </div>
          <div
            role="tabpanel"
            id={sideTab === "mira" ? "mira-tabpanel" : "glossary-tabpanel"}
            aria-labelledby={sideTab === "mira" ? "mira-tab" : "glossary-tab"}
          >
            {sideTab === "mira" ? (
              <MiraPanel
                history={project.miraHistory}
                onGlossary={openGlossary}
              />
            ) : (
              <GlossaryPanel
                selectedId={selectedGlossary}
                onSelect={openGlossary}
              />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <header className="site-header">
        <div className="site-header-content">
          <a href={`${import.meta.env.BASE_URL}#/`} aria-label="ABCs ホーム">
            ABCs <span>Astronomy Begins with Curiosity</span>
          </a>
          <p className="prototype-status">
            開発中のプロトタイプ — v0.1-alpha / Phase 1A
          </p>
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
