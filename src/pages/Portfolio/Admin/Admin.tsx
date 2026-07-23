import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubAuth } from "./useGitHubAuth";
import { getFile, putTextFile } from "./githubApi";
import ProjectList from "./ProjectList";
import ProjectForm from "./ProjectForm";
import SiteSettingsForm from "./SiteSettingsForm";
import type { Category, Project, SiteConfig } from "../../../types/project";
import "./Admin.css";

type Tab = "projects" | "settings";

interface RepoFile<T> {
  data: T;
  sha: string;
}

export default function Admin() {
  const { state, signIn, signOut, getToken } = useGitHubAuth();
  const [tab, setTab] = useState<Tab>("projects");

  const [projectsFile, setProjectsFile] = useState<RepoFile<Project[]> | null>(null);
  const [categoriesFile, setCategoriesFile] = useState<RepoFile<Category[]> | null>(null);
  const [configFile, setConfigFile] = useState<RepoFile<SiteConfig> | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [p, c, s] = await Promise.all([
        getFile(token, "public/data/projects.json"),
        getFile(token, "public/data/categories.json"),
        getFile(token, "public/data/site-config.json"),
      ]);
      if (p) setProjectsFile({ data: JSON.parse(p.content), sha: p.sha });
      if (c) setCategoriesFile({ data: JSON.parse(c.content), sha: c.sha });
      if (s) setConfigFile({ data: JSON.parse(s.content), sha: s.sha });
    } catch {
      setLoadError("Could not load site data from the repo. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (state.status === "signed-in") loadData();
  }, [state.status, loadData]);

  async function saveProjects(next: Project[], commitMessage: string) {
    const token = getToken();
    if (!token || !projectsFile) return;
    await putTextFile(
      token,
      "public/data/projects.json",
      JSON.stringify(next, null, 2),
      commitMessage,
      projectsFile.sha,
    );
    await loadData();
  }

  async function saveCategories(next: Category[], commitMessage: string) {
    const token = getToken();
    if (!token || !categoriesFile) return;
    await putTextFile(
      token,
      "public/data/categories.json",
      JSON.stringify(next, null, 2),
      commitMessage,
      categoriesFile.sha,
    );
    await loadData();
  }

  async function saveConfig(next: SiteConfig) {
    const token = getToken();
    if (!token || !configFile) return;
    await putTextFile(
      token,
      "public/data/site-config.json",
      JSON.stringify(next, null, 2),
      "Update portfolio title/tagline via admin dashboard",
      configFile.sha,
    );
    await loadData();
  }

  async function deleteProject(id: string) {
    if (!projectsFile) return;
    const next = projectsFile.data.filter((p) => p.id !== id);
    await saveProjects(next, `Remove project: ${id}`);
  }

  // ---- Auth gate ----
  if (state.status === "checking" || state.status === "authorizing") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">Portfolio Admin</p>
        <p className="admin-status">
          {state.status === "authorizing" ? "Signing you in\u2026" : "Checking session\u2026"}
        </p>
      </div>
    );
  }

  if (state.status === "unauthorized") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">Portfolio Admin</p>
        <h1>Not authorized</h1>
        <p>
          Signed in as <strong>{state.login}</strong>, but this dashboard only accepts the repo owner's
          GitHub account.
        </p>
        <button type="button" className="admin-btn" onClick={signIn}>
          Try a different account
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">Portfolio Admin</p>
        <h1>Something went wrong</h1>
        <p className="admin-error">{state.error}</p>
        <button type="button" className="admin-btn" onClick={signIn}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status === "signed-out") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">Portfolio Admin</p>
        <h1>Sign in to manage your portfolio</h1>
        <p>Changes here are committed directly to the live repo, under your own GitHub account.</p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={signIn}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Continue with GitHub
        </button>
        <Link to="/portfolio" className="admin-back">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Portfolio
        </Link>
      </div>
    );
  }

  // ---- Signed in ----
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Portfolio Admin</p>
          <h1>Dashboard</h1>
        </div>
        <div className="admin-user">
          {state.avatarUrl && <img src={state.avatarUrl} alt="" className="admin-avatar" />}
          <span>{state.login}</span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>
          Projects
        </button>
        <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          Site Settings
        </button>
        <Link to="/portfolio" className="admin-tab-link">
          View live site
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.25 3.5a.75.75 0 0 0 0 1.5h5.19L2.97 11.47a.75.75 0 1 0 1.06 1.06L11.5 5.06v5.19a.75.75 0 0 0 1.5 0v-7a.75.75 0 0 0-.75-.75h-8Z" />
          </svg>
        </Link>
      </nav>

      {loadError && <p className="admin-error">{loadError}</p>}

      {loading && !projectsFile ? (
        <p className="admin-status">Loading repo data&hellip;</p>
      ) : tab === "projects" ? (
        <div className="admin-grid">
          <ProjectForm
            categories={categoriesFile?.data ?? []}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onSaveCategory={async (cat, mode) => {
              const current = categoriesFile?.data ?? [];
              const next = mode === "add" ? [...current, cat] : current;
              await saveCategories(next, `Add category: ${cat.label}`);
            }}
            onSubmit={async (project) => {
              const current = projectsFile?.data ?? [];
              const exists = current.some((p) => p.id === project.id);
              const next = exists
                ? current.map((p) => (p.id === project.id ? project : p))
                : [...current, project];
              await saveProjects(next, exists ? `Update project: ${project.title}` : `Add project: ${project.title}`);
              setEditing(null);
            }}
          />
          <ProjectList
            projects={projectsFile?.data ?? []}
            categories={categoriesFile?.data ?? []}
            onEdit={(p) => {
              setEditing(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={deleteProject}
          />
        </div>
      ) : (
        <SiteSettingsForm config={configFile?.data ?? null} onSubmit={saveConfig} />
      )}
    </div>
  );
}
