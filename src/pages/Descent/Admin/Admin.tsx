import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubAuth } from "../../../lib/admin/useGitHubAuth";
import { getFile, putTextFile } from "../../../lib/admin/githubApi";
import AdminAuthGate from "../../../lib/admin/AdminAuthGate";
import CVForm from "./CVForm";
import type { CVData } from "../../../types/cv";
import "../../../lib/admin/admin-shared.css";
import "./Admin.css";

interface RepoFile<T> {
  data: T;
  sha: string;
}

export default function Admin() {
  const { state, signIn, signOut, getToken } = useGitHubAuth();
  const [cvFile, setCvFile] = useState<RepoFile<CVData> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const cv = await getFile(token, "public/data/cv.json");
      if (cv) setCvFile({ data: JSON.parse(cv.content), sha: cv.sha });
    } catch {
      setLoadError("Could not load CV data from the repo. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (state.status === "signed-in") loadData();
  }, [state.status, loadData]);

  async function saveCv(next: CVData) {
    const token = getToken();
    if (!token || !cvFile) return;
    await putTextFile(token, "public/data/cv.json", JSON.stringify(next, null, 2), "Update CV via admin dashboard", cvFile.sha);
    await loadData();
  }

  return (
    <AdminAuthGate title="CV Admin" backTo="/descent/cv" backLabel="CV" state={state} signIn={signIn}>
      {(user) => (
        <div className="admin-shell">
          <header className="admin-header">
            <div>
              <p className="admin-eyebrow">CV Admin</p>
              <h1>Curriculum Vitae</h1>
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
            <Link to="/portfolio/admin" className="admin-tab-link">
              Portfolio Admin
            </Link>
            <Link to="/descent/cv" className="admin-tab-link" style={{ marginLeft: 0 }}>
              View live CV
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4.25 3.5a.75.75 0 0 0 0 1.5h5.19L2.97 11.47a.75.75 0 1 0 1.06 1.06L11.5 5.06v5.19a.75.75 0 0 0 1.5 0v-7a.75.75 0 0 0-.75-.75h-8Z" />
              </svg>
            </Link>
          </nav>

          {loadError && <p className="admin-error">{loadError}</p>}

          {loading && !cvFile ? (
            <p className="admin-status">Loading CV data&hellip;</p>
          ) : (
            <CVForm data={cvFile?.data ?? null} onSubmit={saveCv} />
          )}
        </div>
      )}
    </AdminAuthGate>
  );
}
