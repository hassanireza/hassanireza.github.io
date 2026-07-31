import { useRef, useState, type DragEvent } from "react";
import type { Category, Project } from "../../../types/project";

interface ProjectListProps {
  projects: Project[];
  categories: Category[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
  onMoveToCategory: (id: string, categoryId: string) => Promise<void>;
  onReorder: (id: string, targetCategoryId: string, beforeId: string | null) => Promise<void>;
}

interface DropTarget {
  /** id of the row the pointer is currently over */
  overId: string;
  /** which half of that row the pointer is in - decides insert-before vs insert-after */
  edge: "before" | "after";
}

const AUTOSCROLL_ZONE_PX = 56;
const AUTOSCROLL_SPEED_PX = 14;

/**
 * Grouped by category, in the same order categories appear in
 * categories.json - the same grouping the live portfolio page uses for its
 * sections. This is what makes "where did my new/reordered project end up"
 * legible: a project always renders under its actual section heading, not
 * wherever its raw index in projects.json happens to place it in a flat
 * list.
 *
 * Dragging shows an insertion line above/below the row the pointer is over
 * (not a filled highlight on the row itself) so it's clear you're placing
 * the card between two others, not replacing one. The scroll container
 * also auto-scrolls when the pointer nears its top/bottom edge while
 * dragging, since the list can be taller than the viewport.
 */
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
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  function clearDragState() {
    setDraggingId(null);
    setDropTarget(null);
    setDragOverSection(null);
  }

  /** Auto-scrolls the list container when dragging near its top/bottom edge. */
  function autoScrollIfNearEdge(clientY: number) {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (clientY - rect.top < AUTOSCROLL_ZONE_PX) {
      el.scrollTop -= AUTOSCROLL_SPEED_PX;
    } else if (rect.bottom - clientY < AUTOSCROLL_ZONE_PX) {
      el.scrollTop += AUTOSCROLL_SPEED_PX;
    }
  }

  function handleRowDragOver(e: DragEvent<HTMLLIElement>, id: string) {
    e.preventDefault();
    autoScrollIfNearEdge(e.clientY);
    if (id === draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const edge: DropTarget["edge"] = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget((current) => (current?.overId === id && current.edge === edge ? current : { overId: id, edge }));
  }

  function handleRowDragLeave(id: string) {
    setDropTarget((current) => (current?.overId === id ? null : current));
  }

  async function handleRowDrop(e: DragEvent<HTMLLIElement>, categoryId: string, inCategory: Project[]) {
    e.preventDefault();
    e.stopPropagation();
    const id = draggingId;
    const target = dropTarget;
    clearDragState();
    if (!id || !target || target.overId === id) return;

    const overIndex = inCategory.findIndex((p) => p.id === target.overId);
    if (overIndex === -1) return;

    // "before" -> insert ahead of the hovered row. "after" -> insert ahead
    // of whatever currently follows the hovered row (or at the end of the
    // section if the hovered row is last).
    const beforeId = target.edge === "before" ? inCategory[overIndex].id : inCategory[overIndex + 1]?.id ?? null;

    setBusy(id);
    try {
      await onReorder(id, categoryId, beforeId);
    } finally {
      setBusy(null);
    }
  }

  function handleSectionDragOver(e: DragEvent<HTMLUListElement>, categoryId: string) {
    e.preventDefault();
    autoScrollIfNearEdge(e.clientY);
    setDragOverSection(categoryId);
  }

  async function handleSectionDrop(e: DragEvent<HTMLUListElement>, categoryId: string) {
    e.preventDefault();
    const id = draggingId;
    clearDragState();
    if (!id) return;
    setBusy(id);
    try {
      // Dropped on empty section space (not on a specific row) - send to
      // the end of that category's group.
      await onReorder(id, categoryId, null);
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

      <div className="admin-project-sections" ref={scrollRef}>
        {categories.map((cat) => {
          const inCategory = projects.filter((p) => p.category === cat.id);
          return (
            <div className="admin-project-section" key={cat.id}>
              <div className="admin-project-section-head">
                <h3>{cat.label}</h3>
                <span className="admin-hint">{inCategory.length}</span>
              </div>

              <ul
                className={`admin-project-list${dragOverSection === cat.id ? " is-section-drag-over" : ""}`}
                onDragOver={(e) => handleSectionDragOver(e, cat.id)}
                onDragLeave={() => setDragOverSection((current) => (current === cat.id ? null : current))}
                onDrop={(e) => handleSectionDrop(e, cat.id)}
              >
                {inCategory.length === 0 && (
                  <li className="admin-project-empty admin-hint">Drag a project here to move it into this category.</li>
                )}
                {inCategory.map((p, index) => (
                  <li
                    key={p.id}
                    className={[
                      "admin-project-row",
                      draggingId === p.id ? "is-dragging" : "",
                      dropTarget?.overId === p.id ? `drop-${dropTarget.edge}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(e) => handleRowDragOver(e, p.id)}
                    onDragLeave={() => handleRowDragLeave(p.id)}
                    onDrop={(e) => handleRowDrop(e, cat.id, inCategory)}
                  >
                    <div
                      className="admin-drag-handle"
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragEnd={clearDragState}
                      role="button"
                      tabIndex={-1}
                      aria-label={`Drag to reorder ${p.title}`}
                      title="Drag to reorder or drop into another section"
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
                        disabled={busy === p.id || index === inCategory.length - 1}
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
        })}
      </div>
    </div>
  );
}

function resolveImg(img: string): string {
  const base = import.meta.env.BASE_URL;
  const path = img.includes("/") ? img : `assets/images/${img}`;
  return `${base}${path}`;
}
