import { useEffect, useState, type FormEvent } from "react";
import { coverOf, type CreativeCollection, type CreativeWork } from "../../../types/creative";

interface CreativeListProps {
  collection: CreativeCollection | null;
  onEdit: (work: CreativeWork) => void;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
  onSaveText: (title: string, blurb: string) => Promise<void>;
}

const ARROW_UP = "M8 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 6.06V12a.75.75 0 0 1-1.5 0V6.06L4.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.5Z";
const ARROW_DOWN = "M8 12.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.94a.75.75 0 0 1 1.5 0v5.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z";

export default function CreativeList({ collection, onEdit, onDelete, onMove, onSaveText }: CreativeListProps) {
  const works = collection?.works ?? [];
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [savingText, setSavingText] = useState(false);
  const [textSaved, setTextSaved] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (collection) {
      setTitle(collection.title);
      setBlurb(collection.blurb ?? "");
    }
  }, [collection]);

  async function saveText(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSavingText(true);
    setTextSaved(false);
    try {
      await onSaveText(title.trim(), blurb.trim());
      setTextSaved(true);
    } catch {
      /* the dashboard shows the error */
    } finally {
      setSavingText(false);
    }
  }

  async function move(id: string, dir: "up" | "down") {
    setBusy(id);
    try {
      await onMove(id, dir);
    } catch {
      /* the dashboard shows the error */
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await onDelete(id);
    } catch {
      /* the dashboard shows the error */
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  const base = import.meta.env.BASE_URL;

  return (
    <div className="admin-card admin-creative-list">
      <div className="admin-card-head">
        <h2>Creative Coding</h2>
        <span className="admin-hint">
          {works.length} {works.length === 1 ? "work" : "works"}
        </span>
      </div>

      <form className="admin-subcard admin-form" onSubmit={saveText}>
        <div className="admin-subcard-head">
          <span>Section heading</span>
        </div>
        <label className="admin-field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Blurb</span>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2} />
        </label>
        <div className="admin-field-row">
          <button type="submit" className="admin-btn admin-btn-sm" disabled={savingText || !collection}>
            {savingText ? "Saving…" : "Save heading"}
          </button>
          {textSaved && !savingText && <span className="admin-success">Saved.</span>}
        </div>
      </form>

      {works.length === 0 ? (
        <p className="admin-hint admin-project-empty">No creative works yet. Add the first one with the form.</p>
      ) : (
        <ul className="admin-project-list">
          {works.map((w, i) => (
            <li key={w.id} className="admin-project-row admin-creative-row">
              <img src={`${base}${w.poster}`} alt="" className="admin-creative-thumb" />

              <div className="admin-project-meta">
                <p className="admin-project-title">{w.title}</p>
                <p className="admin-project-desc">{w.desc}</p>
                <p className="admin-creative-badges">
                  <span>{coverOf(w) === "square" ? "1:1" : "16:9"} tile</span>
                  <span>
                    {w.width}&times;{w.height}
                  </span>
                  <span>{w.code.filename}</span>
                </p>
              </div>

              <div className="admin-project-order">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-icon"
                  onClick={() => move(w.id, "up")}
                  disabled={busy === w.id || i === 0}
                  aria-label={`Move ${w.title} up`}
                  title="Move up"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d={ARROW_UP} />
                  </svg>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-icon"
                  onClick={() => move(w.id, "down")}
                  disabled={busy === w.id || i === works.length - 1}
                  aria-label={`Move ${w.title} down`}
                  title="Move down"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d={ARROW_DOWN} />
                  </svg>
                </button>
              </div>

              <div className="admin-project-actions">
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => onEdit(w)}>
                  Edit
                </button>
                {confirming === w.id ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => remove(w.id)}
                    disabled={deleting === w.id}
                    title="Deletes the work and its video, poster and code from the repo"
                  >
                    {deleting === w.id ? "…" : "Confirm"}
                  </button>
                ) : (
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(w.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
