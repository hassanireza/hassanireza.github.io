import { useState, type DragEvent } from "react";
import type { Category, Project } from "../../../types/project";

interface ProjectListProps {
  projects: Project[];
  categories: Category[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
  onMoveToCategory: (id: string, categoryId: string) => Promise<void>;
  onReorder: (id: string, beforeId: string | null) => Promise<void>;
}

export default function ProjectList({
  projects,
  categories,
  onEdit,
  onDelete,
  onMove,
  onMoveToCategory,
  onReorder,
}: ProjectListProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setBusy(id);
    try {
      await onMove(id, direction);
    } finally {
      setBusy(null);
    }
  }

  async function handleCategoryChange(id: string, categoryId: string) {
    setBusy(id);
    try {
      await onMoveToCategory(id, categoryId);
    } finally {
      setBusy(null);
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires data to be set for drag to actually start.
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: DragEvent<HTMLLIElement>, id: string) {
    e.preventDefault();
    if (id !== draggingId) setDragOverId(id);
  }

  function handleDragLeave(id: string) {
    setDragOverId((current) => (current === id ? null : current));
  }

  async function handleDrop(e: DragEvent<HTMLLIElement>, targetId: string) {
    e.preventDefault();
    const id = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!id || id === targetId) return;
    setBusy(id);
    try {
      await onReorder(id, targetId);
    } finally {
      setBusy(null);
    }
  }

  async function handleDropAtEnd(e: DragEvent<HTMLUListElement>) {
    e.preventDefault();
    const id = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!id) return;
    setBusy(id);
    try {
      await onReorder(id, null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-card admin-list">
      <div className="admin-card-head">
        <h2>Live Projects</h2>
        <span className="admin-hint">{projects.length} total &middot; drag the handle to reorder</span>
      </div>

      {projects.length === 0 && <p className="admin-hint">No projects yet.</p>}

      <ul className="admin-project-list" onDragOver={(e) => e.preventDefault()} onDrop={handleDropAtEnd}>
        {projects.map((p, index) => (
          <li
            key={p.id}
            className={[
              "admin-project-row",
              draggingId === p.id ? "is-dragging" : "",
              dragOverId === p.id ? "is-drag-over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => handleDragOver(e, p.id)}
            onDragLeave={() => handleDragLeave(p.id)}
            onDrop={(e) => handleDrop(e, p.id)}
          >
            <div
              className="admin-drag-handle"
              draggable
              onDragStart={(e) => handleDragStart(e, p.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              role="button"
              tabIndex={-1}
              aria-label={`Drag to reorder ${p.title}`}
              title="Drag to reorder"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
              </svg>
            </div>

            <img src={resolveImg(p.img)} alt="" className="admin-project-thumb" />

            <div className="admin-project-meta">
              <p className="admin-project-title">{p.title}</p>
              <p className="admin-project-desc">{p.desc}</p>
              <select
                className="admin-project-category-select"
                value={p.category}
                disabled={busy === p.id}
                onChange={(e) => handleCategoryChange(p.id, e.target.value)}
                aria-label={`Change category for ${p.title}`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-project-order">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-icon"
                onClick={() => handleMove(p.id, "up")}
                disabled={busy === p.id || index === 0}
                aria-label={`Move ${p.title} up`}
                title="Move up"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 6.06V12a.75.75 0 0 1-1.5 0V6.06L4.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.5Z" />
                </svg>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-icon"
                onClick={() => handleMove(p.id, "down")}
                disabled={busy === p.id || index === projects.length - 1}
                aria-label={`Move ${p.title} down`}
                title="Move down"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 12.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.94a.75.75 0 0 1 1.5 0v5.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" />
                </svg>
              </button>
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
