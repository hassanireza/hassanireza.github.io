import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubAuth } from "../../../lib/admin/useGitHubAuth";
import { GitHubApiError, getFile, putTextFile } from "../../../lib/admin/githubApi";
import AdminAuthGate from "../../../lib/admin/AdminAuthGate";
import ProjectList from "./ProjectList";
import ProjectForm from "./ProjectForm";
import SiteSettingsForm from "./SiteSettingsForm";
import CreativeForm from "./CreativeForm";
import CreativeList from "./CreativeList";
import { removeOrphanedAssets } from "../../../lib/admin/projectAssets";
import { CREATIVE_DATA_PATH, pruneWorkDir } from "../../../lib/admin/creativeAssets";
import { commit } from "../../../lib/admin/commitMessages";
import { FALLBACK_CREATIVE, type CreativeCollection, type CreativeWork } from "../../../types/creative";
import type { Category, Project, SiteConfig } from "../../../types/project";
import "../../../lib/admin/admin-shared.css";
import "./Admin.css";

type Tab = "projects" | "creative" | "settings";

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
  const [creativeFile, setCreativeFile] = useState<RepoFile<CreativeCollection> | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [editingWork, setEditingWork] = useState<CreativeWork | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [p, c, s, cc] = await Promise.all([
        getFile(token, "public/data/projects.json"),
        getFile(token, "public/data/categories.json"),
        getFile(token, "public/data/site-config.json"),
        getFile(token, CREATIVE_DATA_PATH),
      ]);
      setCreativeFile(
        cc
          ? { data: normalizeCreative(JSON.parse(cc.content)), sha: cc.sha }
          : { data: FALLBACK_CREATIVE, sha: "" },
      );
      if (p) setProjectsFile({ data: JSON.parse(p.content), sha: p.sha });
      if (c) setCategoriesFile({ data: JSON.parse(c.content), sha: c.sha });
      if (s) setConfigFile({ data: JSON.parse(s.content), sha: s.sha });
    } catch {
      setLoadError("Could not load site data from the repo. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const sectionLabel = (categoryId: string) =>
    categoriesFile?.data.find((c) => c.id === categoryId)?.label ?? categoryId;
  const titleOf = (id: string) => projectsFile?.data.find((p) => p.id === id)?.title ?? id;
  const workTitleOf = (id: string) => creativeFile?.data.works.find((w) => w.id === id)?.title ?? id;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setSaveError(`Couldn't save your changes. ${message}`);
      throw err;
    }
  }

  /**
   * Same pattern as saveProjects: re-fetch the live creative-coding.json,
   * apply the change to that, write it back with that file's sha. A missing
   * file (first ever save) is created from the defaults.
   */
  async function saveCreative(updater: (current: CreativeCollection) => CreativeCollection, commitMessage: string) {
    const token = getToken();
    if (!token) return;
    setSaveError(null);
    try {
      const latest = await getFile(token, CREATIVE_DATA_PATH);
      const current = latest ? normalizeCreative(JSON.parse(latest.content)) : FALLBACK_CREATIVE;
      const next = updater(current);
      await putTextFile(token, CREATIVE_DATA_PATH, JSON.stringify(next, null, 2) + "\n", commitMessage, latest?.sha);
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Couldn't save your changes. ${message}`);
      throw err;
    }
  }

  async function submitWork(work: CreativeWork) {
    setNotice(null);
    const previous = creativeFile?.data.works.find((w) => w.id === work.id);
    await saveCreative(
      (current) => {
        const exists = current.works.some((w) => w.id === work.id);
        // Newest first: a new work goes to the top of the list, and of the site.
        return {
          ...current,
          works: exists ? current.works.map((w) => (w.id === work.id ? work : w)) : [work, ...current.works],
        };
      },
      previous ? commit.workUpdated(work.title) : commit.workAdded(work.title),
    );
    // Keep the work's folder identical to what it references: a replaced
    // video, a renamed code file or a retired preview loop never lingers.
    const token = getToken();
    let tidied = 0;
    if (token) {
      const { removed, failed } = await pruneWorkDir(token, work.id, [work.video, work.poster, work.code.src], work.title);
      tidied = removed.length;
      reportCleanup(removed, failed, previous ? null : "");
    }
    setNotice(
      previous
        ? `Saved "${work.title}".${tidied ? ` Removed ${tidied} outdated ${tidied === 1 ? "file" : "files"} from the repo.` : ""} The live site updates in about a minute.`
        : `Published "${work.title}" at the top of Creative Coding. The live site updates in about a minute.`,
    );
    setEditingWork(null);
  }

  async function deleteWork(id: string) {
    setNotice(null);
    const token = getToken();
    const title = workTitleOf(id);
    await saveCreative(
      (current) => ({ ...current, works: current.works.filter((w) => w.id !== id) }),
      commit.workRemoved(title),
    );
    // Delete the video, poster and code from the repo, like any other dashboard delete.
    if (token) {
      const { removed, failed } = await pruneWorkDir(token, id, [], title);
      if (failed.length > 0) reportCleanup(removed, failed, null);
      else setNotice(`Deleted "${title}" and its ${removed.length} ${removed.length === 1 ? "file" : "files"} from the repo.`);
    }
  }

  async function moveWork(id: string, direction: "up" | "down") {
    await saveCreative((current) => {
      const i = current.works.findIndex((w) => w.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= current.works.length) return current;
      const works = [...current.works];
      [works[i], works[j]] = [works[j], works[i]];
      return { ...current, works };
    }, commit.workReordered(workTitleOf(id)));
  }

  /** Drag and drop: put `id` before `beforeId`, or at the end when null. */
  async function reorderWork(id: string, beforeId: string | null) {
    await saveCreative((current) => {
      const from = current.works.findIndex((w) => w.id === id);
      if (from === -1 || id === beforeId) return current;
      const works = [...current.works];
      const [moved] = works.splice(from, 1);
      const to = beforeId === null ? works.length : works.findIndex((w) => w.id === beforeId);
      works.splice(to === -1 ? works.length : to, 0, moved);
      return { ...current, works };
    }, commit.workReordered(workTitleOf(id)));
  }

  async function saveCreativeText(title: string, blurb: string) {
    await saveCreative((current) => ({ ...current, title, blurb }), commit.workHeading());
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
      setSaveError(`Couldn't save your changes. ${message}`);
      throw err;
    }
  }

  /**
   * Moves a category to a new position. Category order in categories.json is
   * the section order on the live portfolio page. Like saveProjects, this
   * re-fetches the live file first so a stale local copy cannot overwrite it.
   */
  async function moveCategory(id: string, target: "top" | "up" | "down" | "bottom") {
    const token = getToken();
    if (!token) return;
    setSaveError(null);
    try {
      const latest = await getFile(token, "public/data/categories.json");
      const current: Category[] = latest ? JSON.parse(latest.content) : categoriesFile?.data ?? [];
      const sha = latest?.sha ?? categoriesFile?.sha;
      const from = current.findIndex((c) => c.id === id);
      if (from === -1) return;
      const to =
        target === "top" ? 0 : target === "bottom" ? current.length - 1 : target === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= current.length || to === from) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      await putTextFile(
        token,
        "public/data/categories.json",
        JSON.stringify(next, null, 2),
        commit.sectionMoved(moved.label, target === "top" ? "to the top" : target === "bottom" ? "to the bottom" : target),
        sha,
      );
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Couldn't save your changes. ${message}`);
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
        commit.siteSettings(),
        configFile.sha,
      );
      await loadData();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Check your connection and try again.";
      setSaveError(`Couldn't save your changes. ${message}`);
      throw err;
    }
  }

  /**
   * Reports the outcome of an asset cleanup. A failed cleanup is not a failed
   * save: the project is already gone from projects.json, so the site is
   * consistent; there is just a stray file left to remove by hand.
   */
  function reportCleanup(removed: string[], failed: string[], quiet: string | null = "") {
    if (failed.length > 0) {
      setSaveError(
        `Saved, but ${failed.length === 1 ? "one file" : `${failed.length} files`} could not be removed from the repo (${failed.join(", ")}). You can delete ${failed.length === 1 ? "it" : "them"} on GitHub.`,
      );
    }
    if (quiet === "" && removed.length > 0) {
      setNotice(`Saved. Also removed from the repo: ${removed.join(", ")}.`);
    }
  }

  /**
   * Deleting a project also deletes its thumbnail (and motion video, if any)
   * from public/assets/images, unless another project still uses the file.
   * Order matters: projects.json is saved first, so the live site never
   * points at a file that is already gone.
   */
  async function deleteProject(id: string) {
    const token = getToken();
    setNotice(null);
    let removedProject: Project | undefined;
    let remaining: Project[] = [];
    const removedTitle = titleOf(id);
    const removedSection = sectionLabel(projectsFile?.data.find((p) => p.id === id)?.category ?? "");
    await saveProjects((current) => {
      removedProject = current.find((p) => p.id === id);
      remaining = current.filter((p) => p.id !== id);
      return remaining;
    }, commit.projectRemoved(removedTitle, removedSection));

    if (token && removedProject) {
      const { removed, failed } = await removeOrphanedAssets(
        token,
        [removedProject.img, removedProject.video],
        remaining,
        removedTitle,
      );
      reportCleanup(removed, failed);
    }
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
    }, commit.projectReordered(titleOf(id), sectionLabel(projectsFile?.data.find((p) => p.id === id)?.category ?? "")));
  }

  /** Reassigns a project to a different category. */
  async function moveProjectToCategory(id: string, categoryId: string) {
    await saveProjects(
      (current) => current.map((p) => (p.id === id ? { ...p, category: categoryId } : p)),
      commit.projectMoved(titleOf(id), sectionLabel(categoryId)),
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
    }, targetCategoryId !== projectsFile?.data.find((p) => p.id === id)?.category
      ? commit.projectMoved(titleOf(id), sectionLabel(targetCategoryId))
      : commit.projectReordered(titleOf(id), sectionLabel(targetCategoryId)));
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
            <button type="button" className={tab === "creative" ? "active" : ""} onClick={() => setTab("creative")}>
              Creative Coding
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
          {notice && <p className="admin-success" role="status">{notice}</p>}

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
                  await saveCategories(next, commit.sectionAdded(cat.label));
                }}
                onSubmit={async (project) => {
                  setNotice(null);
                  const previous = (projectsFile?.data ?? []).find((p) => p.id === project.id);
                  const exists = previous !== undefined;
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
                    exists
                      ? commit.projectUpdated(project.title, sectionLabel(project.category))
                      : commit.projectAdded(project.title, sectionLabel(project.category)),
                  );
                  // Replacing a legacy image uploads under a new filename, which
                  // would strand the old file in the repo. Clean it up.
                  const token = getToken();
                  if (token && previous && previous.img !== project.img) {
                    const { removed, failed } = await removeOrphanedAssets(
                      token,
                      [previous.img],
                      [...(projectsFile?.data ?? []).filter((p) => p.id !== project.id), project],
                      project.title,
                    );
                    reportCleanup(removed, failed);
                  }
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
                onMoveCategory={moveCategory}
              />
            </div>
          ) : tab === "creative" ? (
            <div className="admin-grid admin-grid-creative">
              <CreativeForm
                works={creativeFile?.data.works ?? []}
                editing={editingWork}
                onCancelEdit={() => setEditingWork(null)}
                onSubmit={submitWork}
              />
              <CreativeList
                collection={creativeFile?.data ?? null}
                onEdit={(w) => {
                  setEditingWork(w);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={deleteWork}
                onMove={moveWork}
                onReorder={reorderWork}
                onSaveText={saveCreativeText}
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

/** Guards against a hand-edited or partial creative-coding.json. */
function normalizeCreative(raw: Partial<CreativeCollection> | null): CreativeCollection {
  return {
    title: raw?.title || FALLBACK_CREATIVE.title,
    blurb: raw?.blurb ?? FALLBACK_CREATIVE.blurb,
    works: Array.isArray(raw?.works) ? raw.works : [],
  };
}
