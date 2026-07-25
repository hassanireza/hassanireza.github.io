import { useState } from "react";
import type { Category, Project } from "../../../types/project";

interface ProjectListProps {
  projects: Project[];
  categories: Category[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function ProjectList({ projects, categories, onEdit, onDelete }: ProjectListProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const labelFor = (categoryId: string) => categories.find((c) => c.id === categoryId)?.label ?? categoryId;

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  return (
    <div className="admin-card admin-list">
      <div className="admin-card-head">
        <h2>Live Projects</h2>
        <span className="admin-hint">{projects.length} total</span>
      </div>

      {projects.length === 0 && <p className="admin-hint">No projects yet.</p>}

      <ul className="admin-project-list">
        {projects.map((p) => (
          <li key={p.id} className="admin-project-row">
            <img src={resolveImg(p.img)} alt="" className="admin-project-thumb" />
            <div className="admin-project-meta">
              <p className="admin-project-title">{p.title}</p>
              <p className="admin-project-desc">{p.desc}</p>
              <span className="admin-project-tag">{labelFor(p.category)}</span>
            </div>
            <div className="admin-project-actions">
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => onEdit(p)}>
                Edit
              </button>
              {confirming === p.id ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                >
                  {deleting === p.id ? "\u2026" : "Confirm"}
                </button>
              ) : (
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(p.id)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function resolveImg(img: string): string {
  const base = import.meta.env.BASE_URL;
  const path = img.includes("/") ? img : `assets/images/${img}`;
  return `${base}${path}`;
}
