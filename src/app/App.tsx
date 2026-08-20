import { useCallback, useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { cosmicWebGrowthTheme } from "../content/ja/themes/cosmicWebGrowth";
import { createEmptyProject, type ProjectState } from "../domain/project";
import { projectRepository } from "../persistence/projectRepository";

type LoadState = "loading" | "ready" | "error";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
    let active = true;
    projectRepository
      .list()
      .then((savedProjects) => {
        if (!active) return;
        setProjects(savedProjects);
        setLoadState("ready");
        setMessage("このコンピュータに自動保存されます。");
      })
      .catch(() => {
        if (!active) return;
        setLoadState("error");
        setMessage(
          "保存領域を読み込めませんでした。ブラウザの設定を確認してください。",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function createProject() {
    setMessage("保存しています…");
    try {
      const project = createEmptyProject();
      await projectRepository.save(project);
      setMessage("保存しました。");
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
          自分の問いから始めて、証拠から何が言えるかを考える研究プロジェクトです。
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
          研究内容は次の開発フェーズで利用可能になります。
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
        {loadState === "ready" && projects.length === 0 ? (
          <p className="empty-state">保存された研究はまだありません。</p>
        ) : null}
        <ul className="project-list" aria-label="保存済み研究プロジェクト">
          {projects.map((project) => (
            <li key={project.projectId} className="project-card">
              <div>
                <h3>{project.projectName}</h3>
                <p>更新: {formatDate(project.updatedAt)}</p>
                <p>進捗: 研究の準備</p>
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
  const [message, setMessage] =
    useState("研究プロジェクトを読み込んでいます。");

  useEffect(() => {
    let active = true;
    projectRepository
      .get(projectId)
      .then((result) => {
        if (!active) return;
        setProject(result);
        setMessage(
          result
            ? "保存済みの状態から再開しました。"
            : "研究プロジェクトが見つかりません。",
        );
      })
      .catch(
        () => active && setMessage("研究プロジェクトを読み込めませんでした。"),
      );
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <main id="main-content" className="workspace">
      <nav aria-label="研究プロジェクト">
        <button className="link-button" onClick={() => navigate("/")}>
          ← プロジェクト一覧へ
        </button>
      </nav>
      <div className="workspace-grid">
        <aside aria-labelledby="progress-title">
          <p className="eyebrow">研究サイクル</p>
          <h2 id="progress-title">進捗</h2>
          <ol>
            <li aria-current="step">研究の準備</li>
            <li>研究への招待（Phase 1）</li>
          </ol>
        </aside>
        <section className="work-card" aria-labelledby="workspace-title">
          <p className="eyebrow">空の研究プロジェクト</p>
          <h1 id="workspace-title">{project?.projectName ?? "読み込み中"}</h1>
          <p>
            {project
              ? "研究を始めるための保存領域を用意しました。研究上の問いや選択は、まだ記録されていません。"
              : message}
          </p>
          <p className="phase-note">
            Phase 0 では作成・保存・再開のみ利用できます。
          </p>
        </section>
        <aside aria-labelledby="partner-title">
          <p className="eyebrow">今後の案内</p>
          <h2 id="partner-title">研究パートナー</h2>
          <p>Miraによる研究案内はPhase 1で追加されます。</p>
        </aside>
      </div>
      <p className="save-status ready" role="status">
        {message}
      </p>
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
            開発中のプロトタイプ — v0.1-alpha / Phase 0
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
