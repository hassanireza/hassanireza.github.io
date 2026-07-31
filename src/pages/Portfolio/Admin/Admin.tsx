import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubAuth } from "../../../lib/admin/useGitHubAuth";
import { GitHubApiError, getFile, putTextFile } from "../../../lib/admin/githubApi";
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

  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "signed-in") loadData();
  }, [state.status, loadData]);

  /**
   * Every project-list write goes through here. Rather than trusting the
   * `projectsFile` already sitting in React state (which can be stale if a
   * previous save actually landed on GitHub but the response never made it
   * back to the browser), this always re-fetches the live file, applies
   * `updater` to *that*, and writes it back with *that* file's sha. That's
   * what stops the "save failed, retry, and now it's duplicated / missing"
   * failure mode: a stale local copy can no longer cause a lost update or
   * a conflicting write.
   */
  async function saveProjects(updater: (current: Project[]) => Project[], commitMessage: string) {
    const token = getToken();
    if (!token) return;
    setSaveError(null);
    try {
      const latest = await getFile(token, "public/data/projects.json");
      const current: Project[] = latest ? JSON.parse(latest.content) : projectsFile?.data ?? [];
      const sha = latest?.sha ?? projectsFile?.sha;
      const next = updater(current);
      await putTextFile(token, "public/data/projects.json", JSON.stringify(next, null, 2), commitMessage, sha);
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Save failed: ${message}`);
      throw err;
    }
  }

  async function saveCategories(next: Category[], commitMessage: string) {
    const token = getToken();
    if (!token) return;
    setSaveError(null);
    try {
      const latest = await getFile(token, "public/data/categories.json");
      const sha = latest?.sha ?? categoriesFile?.sha;
      await putTextFile(token, "public/data/categories.json", JSON.stringify(next, null, 2), commitMessage, sha);
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Save failed: ${message}`);
      throw err;
    }
  }

  async function saveConfig(next: SiteConfig) {
    const token = getToken();
    if (!token || !configFile) return;
    setSaveError(null);
    try {
      await putTextFile(
        token,
        "public/data/site-config.json",
        JSON.stringify(next, null, 2),
        "Update portfolio title/tagline via admin dashboard",
        configFile.sha,
      );
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Save failed: ${message}`);
      throw err;
    }
  }

  async function deleteProject(id: string) {
    await saveProjects((current) => current.filter((p) => p.id !== id), `Remove project: ${id}`);
  }

  /** Moves a project up/down among its own category's projects (i.e. within its section on the live site). */
  async function moveProject(id: string, direction: "up" | "down") {
    await saveProjects((current) => {
      const index = current.findIndex((p) => p.id === id);
      if (index === -1) return current;
      const category = current[index].category;
      const sameCategoryIndices = current
        .map((p, i) => (p.category === category ? i : -1))
        .filter((i) => i !== -1);
      const posInGroup = sameCategoryIndices.indexOf(index);
      const swapPos = direction === "up" ? posInGroup - 1 : posInGroup + 1;
      if (swapPos < 0 || swapPos >= sameCategoryIndices.length) return current;
      const swapWith = sameCategoryIndices[swapPos];
      const next = [...current];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    }, `Reorder project: ${id}`);
  }

  /** Reassigns a project to a different category. */
  async function moveProjectToCategory(id: string, categoryId: string) {
    await saveProjects(
      (current) => current.map((p) => (p.id === id ? { ...p, category: categoryId } : p)),
      `Move project ${id} to category: ${categoryId}`,
    );
  }

  /**
   * Drops a project into a specific category group at a new position, e.g.
   * from drag-and-drop. If dropped into a different section than it
   * started in, this also re-categorizes it - one commit instead of two.
   */
  async function reorderProject(id: string, targetCategoryId: string, beforeId: string | null) {
    await saveProjects((current) => {
      const index = current.findIndex((p) => p.id === id);
      if (index === -1) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      const updated = { ...moved, category: targetCategoryId };

      if (beforeId) {
        const targetIndex = next.findIndex((p) => p.id === beforeId);
        if (targetIndex === -1) {
          next.push(updated);
        } else {
          next.splice(targetIndex, 0, updated);
        }
        return next;
      }

      // No "before" target: dropped at the end of this category's section.
      // Insert right after the last existing project in that category so it
      // doesn't jump in front of/behind unrelated categories.
      let lastIndexInCategory = -1;
      next.forEach((p, i) => {
        if (p.category === targetCategoryId) lastIndexInCategory = i;
      });
      if (lastIndexInCategory === -1) {
        next.push(updated);
      } else {
        next.splice(lastIndexInCategory + 1, 0, updated);
      }
      return next;
    }, `Reorder project: ${id}`);
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
            <Link to="/portfolio" className="admin-tab-link">
              View live site
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4.25 3.5a.75.75 0 0 0 0 1.5h5.19L2.97 11.47a.75.75 0 1 0 1.06 1.06L11.5 5.06v5.19a.75.75 0 0 0 1.5 0v-7a.75.75 0 0 0-.75-.75h-8Z" />
              </svg>
            </Link>
          </nav>

          {loadError && <p className="admin-error">{loadError}</p>}
          {saveError && <p className="admin-error">{saveError}</p>}

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
                  const exists = (projectsFile?.data ?? []).some((p) => p.id === project.id);
                  await saveProjects(
                    (current) => {
                      const alreadyThere = current.some((p) => p.id === project.id);
                      // New projects go to the front so they show up at the
                      // top of their category section, not buried at the
                      // bottom behind everything else already there.
                      return alreadyThere
                        ? current.map((p) => (p.id === project.id ? project : p))
                        : [project, ...current];
                    },
                    exists ? `Update project: ${project.title}` : `Add project: ${project.title}`,
                  );
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
                onMove={moveProject}
                onMoveToCategory={moveProjectToCategory}
                onReorder={reorderProject}
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
