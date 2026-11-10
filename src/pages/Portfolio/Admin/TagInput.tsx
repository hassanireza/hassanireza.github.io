import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used elsewhere, offered as one-tap chips. */
  suggestions?: string[];
  max?: number;
  placeholder?: string;
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 28);

/**
 * Tag entry in the style of GitHub topics: type and press Enter or comma to
 * make a chip, Backspace removes the last one, pasting a comma separated list
 * adds them all, and tags already used on other works are one tap away.
 */
export default function TagInput({ value, onChange, suggestions = [], max = 8, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const full = value.length >= max;
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());

  function add(raw: string | string[]) {
    const next = [...value];
    for (const part of Array.isArray(raw) ? raw : [raw]) {
      const t = clean(part);
      if (t && next.length < max && !next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[,\n]/.test(text)) {
      e.preventDefault();
      add(text.split(/[,\n]/));
    }
  }

  const offered = suggestions.filter((t) => !has(t)).slice(0, 8);

  return (
    <div className="admin-tags">
      <div className="admin-tags-box" onClick={() => input.current?.focus()}>
        {value.map((t) => (
          <span key={t} className="admin-tag">
            {t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== t));
              }}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={full ? "" : value.length === 0 ? (placeholder ?? "Add a tag") : "Add another"}
          disabled={full}
          aria-describedby={hintId}
          aria-label="Add a tag"
        />
      </div>
      <p className="admin-hint" id={hintId}>
        {full ? `That's the maximum of ${max} tags.` : "Press Enter or comma to add a tag."}
      </p>
      {offered.length > 0 && !full && (
        <div className="admin-tag-suggest" aria-label="Tags used on other works">
          {offered.map((t) => (
            <button key={t} type="button" onClick={() => add(t)}>
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
