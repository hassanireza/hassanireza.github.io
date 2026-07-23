import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubAuth } from "../../../lib/admin/useGitHubAuth";
import { getFile, putTextFile } from "../../../lib/admin/githubApi";
import AdminAuthGate from "../../../lib/admin/AdminAuthGate";
import ProjectList from "./ProjectList";
import ProjectForm from "./ProjectForm";
import SiteSettingsForm from "./SiteSettingsForm";
import type { Category, Project, SiteConfig } from "../../../types/project";
import "../../../lib/admin/admin-shared.css";
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
    await putTextFile(token, "public/data/projects.json", JSON.stringify(next, null, 2), commitMessage, projectsFile.sha);
    await loadData();
  }

  async function saveCategories(next: Category[], commitMessage: string) {
    const token = getToken();
    if (!token || !categoriesFile) return;
    await putTextFile(token, "public/data/categories.json", JSON.stringify(next, null, 2), commitMessage, categoriesFile.sha);
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

  return (
    <AdminAuthGate title="Portfolio Admin" backTo="/portfolio" backLabel="Portfolio" state={state} signIn={signIn}>
      {(user) => (
        <div className="admin-shell">
          <header className="admin-header">
            <div>
              <p className="admin-eyebrow">Portfolio Admin</p>
              <h1>Dashboard</h1>
            </div>
            <div className="admin-user">
              {user.avatarUrl && <img src={user.avatarUrl} alt="" className="admin-avatar" />}
              <span>{user.login}</span>
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
            <Link to="/descent/admin" className="admin-tab-link">
              CV Admin
            </Link>
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
      )}
    </AdminAuthGate>
  );
}
