import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useGitHubAuth } from "./useGitHubAuth";
import { putBinaryFile } from "./githubApi";
import { convertToWebp, slugifyFilename, slugifyId, type ConvertedImage } from "./imageToWebp";
import type { Category, Project } from "../../../types/project";

const DESC_LIMIT = 50;
const UPLOAD_DIR = "public/portfolio-uploads";

interface ProjectFormProps {
  categories: Category[];
  editing: Project | null;
  onCancelEdit: () => void;
  onSubmit: (project: Project) => Promise<void>;
  onSaveCategory: (category: Category, mode: "add") => Promise<void>;
}

export default function ProjectForm({ categories, editing, onCancelEdit, onSubmit, onSaveCategory }: ProjectFormProps) {
  const { getToken } = useGitHubAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [href, setHref] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");

  const [image, setImage] = useState<ConvertedImage | null>(null);
  const [existingImg, setExistingImg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDesc(editing.desc);
      setHref(editing.href ?? "");
      setCategoryId(editing.category);
      setExistingImg(editing.img);
      setImage(null);
    } else {
      setTitle("");
      setDesc("");
      setHref("");
      setExistingImg(null);
      setImage(null);
    }
    setError(null);
  }, [editing]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError("Please drop a PNG, JPG, or WebP image.");
      return;
    }
    setError(null);
    setConverting(true);
    try {
      const converted = await convertToWebp(file);
      setImage(converted);
    } catch {
      setError("Couldn't process that image. Try a different file.");
    } finally {
      setConverting(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Give the project a name.");
    if (!desc.trim()) return setError("Add a short description.");
    if (!categoryId) return setError("Choose a category.");
    if (!image && !existingImg) return setError("Add a 16:9 project image.");

    const token = getToken();
    if (!token) return setError("Your session expired - sign in again.");

    setSaving(true);
    try {
      let imgPath = existingImg ?? "";

      if (image) {
        const filename = `${slugifyFilename(title)}.webp`;
        imgPath = `portfolio-uploads/${filename}`;
        await putBinaryFile(token, `${UPLOAD_DIR}/${filename}`, image.base64, `Upload image for project: ${title}`);
      }

      const id = editing?.id ?? slugifyId(title);

      const project: Project = {
        id,
        title: title.trim(),
        desc: desc.trim(),
        img: imgPath,
        category: categoryId,
        ...(href.trim() ? { href: href.trim() } : {}),
      };

      await onSubmit(project);
      if (!editing) {
        setTitle("");
        setDesc("");
        setHref("");
        setImage(null);
        setExistingImg(null);
      }
    } catch {
      setError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryLabel.trim()) return;
    const id = newCategoryLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (categories.some((c) => c.id === id)) {
      setError("A category with that name already exists.");
      return;
    }
    setSaving(true);
    try {
      await onSaveCategory({ id, label: newCategoryLabel.trim(), icon: "layout" }, "add");
      setCategoryId(id);
      setNewCategoryLabel("");
      setAddingCategory(false);
    } catch {
      setError("Couldn't add that category - try again.");
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = image?.previewUrl ?? (existingImg ? resolveExisting(existingImg) : null);

  return (
    <form className="admin-card admin-form" onSubmit={handleSubmit}>
      <div className="admin-card-head">
        <h2>{editing ? "Edit Project" : "Add New Project"}</h2>
        {editing && (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onCancelEdit}>
            Cancel edit
          </button>
        )}
      </div>

      <label className="admin-field">
        <span>Project name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aetheros Cosmos" maxLength={80} />
      </label>

      <label className="admin-field">
        <span>
          Short description <em>({desc.length}/{DESC_LIMIT})</em>
        </span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, DESC_LIMIT))}
          placeholder="One line, around 50 characters"
          rows={2}
          maxLength={DESC_LIMIT}
        />
      </label>

      <label className="admin-field">
        <span>Project URL <em>(optional)</em></span>
        <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://&hellip;" type="url" />
      </label>

      <label className="admin-field">
        <span>Category</span>
        {!addingCategory ? (
          <div className="admin-field-row">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAddingCategory(true)}>
              + New
            </button>
          </div>
        ) : (
          <div className="admin-field-row">
            <input
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="New category name"
              autoFocus
            />
            <button type="button" className="admin-btn admin-btn-sm" onClick={handleAddCategory} disabled={saving}>
              Add
            </button>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAddingCategory(false)}>
              Cancel
            </button>
          </div>
        )}
      </label>

      <div className="admin-field">
        <span>Project image (16:9)</span>
        <div
          className={`admin-dropzone${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" className="admin-dropzone-preview" />
          ) : (
            <div className="admin-dropzone-empty">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1.5a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5ZM2 12.5a.75.75 0 0 1 .75.75v.25c0 .28.22.5.5.5h9.5a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0v.25A2 2 0 0 1 12.75 15h-9.5A2 2 0 0 1 1.25 13v-.25a.75.75 0 0 1 .75-.75Z" />
              </svg>
              <p>Drag &amp; drop an image, or click to browse</p>
              <p className="admin-hint">PNG or JPG - auto-converted to WebP and cropped to 16:9</p>
            </div>
          )}
          {converting && <div className="admin-dropzone-loading">Converting&hellip;</div>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || converting}>
        {saving ? "Saving\u2026" : editing ? "Save Changes" : "Publish Project"}
      </button>
    </form>
  );
}

function resolveExisting(img: string): string {
  const base = import.meta.env.BASE_URL;
  const path = img.includes("/") ? img : `assets/images/${img}`;
  return `${base}${path}`;
}
