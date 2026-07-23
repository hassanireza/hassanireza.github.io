import { useEffect, useState } from "react";
import type { CVData, CVJob, CVSkillGroup } from "../../../types/cv";

interface CVFormProps {
  data: CVData | null;
  onSubmit: (data: CVData) => Promise<void>;
}

const EMPTY_JOB: CVJob = { role: "", company: "", period: "", location: "", bullets: [] };
const EMPTY_SKILL_GROUP: CVSkillGroup = { label: "", skills: [] };

export default function CVForm({ data, onSubmit }: CVFormProps) {
  const [form, setForm] = useState<CVData | null>(data);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(data);
  }, [data]);

  if (!form) return <p className="admin-status">Loading CV data&hellip;</p>;

  function update<K extends keyof CVData>(key: K, value: CVData[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  function updateJob(index: number, patch: Partial<CVJob>) {
    update(
      "jobs",
      form!.jobs.map((j, i) => (i === index ? { ...j, ...patch } : j)),
    );
  }

  function updateSkillGroup(index: number, patch: Partial<CVSkillGroup>) {
    update(
      "skillGroups",
      form!.skillGroups.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    );
  }

  async function handleSubmit() {
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      await onSubmit(form);
      setSaved(true);
    } catch {
      setError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-cv-form">
      {/* ---- Identity & contact ---- */}
      <section className="admin-card admin-form">
        <div className="admin-card-head">
          <h2>Header</h2>
        </div>

        <label className="admin-field">
          <span>Role line</span>
          <input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="Frontend Developer &middot; Animator" />
        </label>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Site label</span>
            <input
              value={form.contact.siteLabel}
              onChange={(e) => update("contact", { ...form.contact, siteLabel: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Email</span>
            <input
              value={form.contact.email}
              onChange={(e) => update("contact", { ...form.contact, email: e.target.value })}
              type="email"
            />
          </label>
          <label className="admin-field">
            <span>GitHub username</span>
            <input
              value={form.contact.githubUsername}
              onChange={(e) => update("contact", { ...form.contact, githubUsername: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* ---- Summary ---- */}
      <section className="admin-card admin-form">
        <div className="admin-card-head">
          <h2>Summary</h2>
        </div>
        <label className="admin-field">
          <textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} rows={5} />
        </label>
      </section>

      {/* ---- Experience ---- */}
      <section className="admin-card admin-form">
        <div className="admin-card-head">
          <h2>Experience</h2>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => update("jobs", [EMPTY_JOB, ...form.jobs])}
          >
            + Add role
          </button>
        </div>

        <div className="admin-subcard-list">
          {form.jobs.map((job, i) => (
            <JobEditor
              key={i}
              job={job}
              onChange={(patch) => updateJob(i, patch)}
              onRemove={() => update("jobs", form.jobs.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      </section>

      {/* ---- Tech stacks ---- */}
      <section className="admin-card admin-form">
        <div className="admin-card-head">
          <h2>Tech Stacks</h2>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => update("skillGroups", [...form.skillGroups, EMPTY_SKILL_GROUP])}
          >
            + Add group
          </button>
        </div>

        <div className="admin-subcard-list">
          {form.skillGroups.map((group, i) => (
            <SkillGroupEditor
              key={i}
              group={group}
              onChange={(patch) => updateSkillGroup(i, patch)}
              onRemove={() => update("skillGroups", form.skillGroups.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      </section>

      {/* ---- Languages ---- */}
      <section className="admin-card admin-form">
        <div className="admin-card-head">
          <h2>Languages</h2>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => update("languages", [...form.languages, { name: "", level: "" }])}
          >
            + Add language
          </button>
        </div>

        <div className="admin-subcard-list">
          {form.languages.map((lang, i) => (
            <div className="admin-field-row" key={i}>
              <input
                value={lang.name}
                placeholder="Language"
                onChange={(e) =>
                  update(
                    "languages",
                    form.languages.map((l, idx) => (idx === i ? { ...l, name: e.target.value } : l)),
                  )
                }
              />
              <input
                value={lang.level}
                placeholder="Proficiency"
                onChange={(e) =>
                  update(
                    "languages",
                    form.languages.map((l, idx) => (idx === i ? { ...l, level: e.target.value } : l)),
                  )
                }
              />
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => update("languages", form.languages.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="admin-error">{error}</p>}
      {saved && !saving && <p className="admin-success">Saved.</p>}

      <div className="admin-save-bar">
        <button type="button" className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function JobEditor({
  job,
  onChange,
  onRemove,
}: {
  job: CVJob;
  onChange: (patch: Partial<CVJob>) => void;
  onRemove: () => void;
}) {
  const [newBullet, setNewBullet] = useState("");

  function addBullet() {
    if (!newBullet.trim()) return;
    onChange({ bullets: [...job.bullets, newBullet.trim()] });
    setNewBullet("");
  }

  return (
    <div className="admin-subcard">
      <div className="admin-subcard-head">
        <span>{job.role || "New role"}</span>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="admin-field-row">
        <input value={job.role} placeholder="Role" onChange={(e) => onChange({ role: e.target.value })} />
        <input value={job.company} placeholder="Company" onChange={(e) => onChange({ company: e.target.value })} />
      </div>
      <div className="admin-field-row">
        <input value={job.period} placeholder="Period (e.g. 2024 - Present)" onChange={(e) => onChange({ period: e.target.value })} />
        <input value={job.location} placeholder="Location" onChange={(e) => onChange({ location: e.target.value })} />
      </div>

      <div className="admin-bullet-list">
        {job.bullets.map((bullet, i) => (
          <div className="admin-bullet-row" key={i}>
            <textarea
              value={bullet}
              rows={2}
              onChange={(e) =>
                onChange({ bullets: job.bullets.map((b, idx) => (idx === i ? e.target.value : b)) })
              }
            />
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={() => onChange({ bullets: job.bullets.filter((_, idx) => idx !== i) })}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="admin-inline-add">
        <input
          value={newBullet}
          placeholder="Add a bullet point&hellip;"
          onChange={(e) => setNewBullet(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addBullet();
            }
          }}
        />
        <button type="button" className="admin-btn admin-btn-sm" onClick={addBullet}>
          Add
        </button>
      </div>
    </div>
  );
}

function SkillGroupEditor({
  group,
  onChange,
  onRemove,
}: {
  group: CVSkillGroup;
  onChange: (patch: Partial<CVSkillGroup>) => void;
  onRemove: () => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  function addSkill() {
    if (!newSkill.trim()) return;
    onChange({ skills: [...group.skills, newSkill.trim()] });
    setNewSkill("");
  }

  return (
    <div className="admin-subcard">
      <div className="admin-subcard-head">
        <span>{group.label || "New group"}</span>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onRemove}>
          Remove
        </button>
      </div>

      <input value={group.label} placeholder="Group label (e.g. Frontend)" onChange={(e) => onChange({ label: e.target.value })} />

      <div className="admin-chip-row">
        {group.skills.map((skill, i) => (
          <span className="admin-chip" key={i}>
            {skill}
            <button
              type="button"
              onClick={() => onChange({ skills: group.skills.filter((_, idx) => idx !== i) })}
              aria-label={`Remove ${skill}`}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4.34 3.28a.75.75 0 0 0-1.06 1.06L6.94 8l-3.66 3.66a.75.75 0 1 0 1.06 1.06L8 9.06l3.66 3.66a.75.75 0 1 0 1.06-1.06L9.06 8l3.66-3.66a.75.75 0 0 0-1.06-1.06L8 6.94 4.34 3.28Z" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      <div className="admin-inline-add">
        <input
          value={newSkill}
          placeholder="Add a skill&hellip;"
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
        />
        <button type="button" className="admin-btn admin-btn-sm" onClick={addSkill}>
          Add
        </button>
      </div>
    </div>
  );
}
