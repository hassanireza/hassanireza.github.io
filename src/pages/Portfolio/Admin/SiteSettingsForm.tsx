import { useEffect, useState, type FormEvent } from "react";
import type { SiteConfig } from "../../../types/project";

interface SiteSettingsFormProps {
  config: SiteConfig | null;
  onSubmit: (config: SiteConfig) => Promise<void>;
}

export default function SiteSettingsForm({ config, onSubmit }: SiteSettingsFormProps) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setTitle(config.portfolioTitle);
      setTagline(config.portfolioTagline);
    }
  }, [config]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !tagline.trim()) {
      setError("Both fields are required.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await onSubmit({ portfolioTitle: title.trim(), portfolioTagline: tagline.trim() });
      setSaved(true);
    } catch {
      setError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-card admin-form admin-settings" onSubmit={handleSubmit}>
      <div className="admin-card-head">
        <h2>Portfolio Page Title</h2>
      </div>
      <p className="admin-hint">
        This is the headline and tagline shown at the top of <code>/portfolio</code>. The last word of the title
        renders in italic, matching the rest of the site's type system.
      </p>

      <label className="admin-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reza Hassani&rsquo;s Portfolio" />
      </label>

      <label className="admin-field">
        <span>Tagline</span>
        <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={3} />
      </label>

      <div className="admin-preview">
        <p className="admin-hint">Preview</p>
        <div className="admin-preview-box">
          <h3>
            {title.slice(0, title.lastIndexOf(" ") + 1)}
            <em>{title.slice(title.lastIndexOf(" ") + 1)}</em>
          </h3>
          <p>{tagline}</p>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {saved && !saving && <p className="admin-success">Saved.</p>}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
        {saving ? "Saving\u2026" : "Save Changes"}
      </button>
    </form>
  );
}
