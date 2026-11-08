import { useEffect, useMemo, useRef, useState } from "react";
import "./PortfolioMap.css";

export type MapWorkKind = "link" | "motion" | "creative";

export interface MapWork {
  id: string;
  title: string;
  kind: MapWorkKind;
}

export interface MapChapter {
  id: string;
  index: string;
  title: string;
  works: MapWork[];
}

interface PortfolioMapProps {
  open: boolean;
  chapters: MapChapter[];
  activeId: string;
  onClose: () => void;
  onChapter: (chapterId: string) => void;
  onWork: (work: MapWork) => void;
  onTop: () => void;
}

const KIND_LABEL: Record<MapWorkKind, string> = {
  link: "Live site",
  motion: "Motion",
  creative: "Video + code",
};

const KIND_GLYPH: Record<MapWorkKind, string> = {
  link: "↗",
  motion: "▶",
  creative: "</>",
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A searchable map of the whole page: every chapter and every work in it on
 * one screen. It is the escape hatch for a long page; open it from the rail
 * (or press M), type a few letters, press Enter, and you are there.
 */
export default function PortfolioMap({ open, chapters, activeId, onClose, onChapter, onWork, onTop }: PortfolioMapProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setQuery("");
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      const el = openerRef.current;
      if (el instanceof HTMLElement && document.contains(el)) el.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return chapters;
    return chapters
      .map((c) => {
        const chapterHit = c.title.toLowerCase().includes(needle);
        const works = chapterHit ? c.works : c.works.filter((w) => w.title.toLowerCase().includes(needle));
        return { ...c, works };
      })
      .filter((c) => c.works.length > 0);
  }, [chapters, needle]);

  const firstHit = filtered[0]?.works[0];
  const matchCount = filtered.reduce((n, c) => n + c.works.length, 0);

  if (!open) return null;

  return (
    <div className="pm-root" role="dialog" aria-modal="true" aria-label="Portfolio map">
      <div className="pm-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="pm-panel" ref={panelRef}>
        <div className="pm-head">
          <label className="pm-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6.5 1a5.5 5.5 0 1 0 3.4 9.82l3.64 3.64a.75.75 0 1 0 1.06-1.06l-3.64-3.64A5.5 5.5 0 0 0 6.5 1Zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
            </svg>
            <span className="pm-sr">Search works and chapters</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              placeholder="Jump to a work or chapter"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && firstHit) onWork(firstHit);
              }}
            />
          </label>
          <button type="button" className="pm-close" onClick={onClose}>
            Close <kbd>Esc</kbd>
          </button>
        </div>

        <div className="pm-body">
          {filtered.length === 0 && <p className="pm-empty">Nothing matches &ldquo;{query}&rdquo;.</p>}

          <div className="pm-grid">
            {filtered.map((c) => (
              <section key={c.id} className={`pm-chapter${activeId === c.id ? " is-current" : ""}`}>
                <button type="button" className="pm-chapter-head" onClick={() => onChapter(c.id)}>
                  <span className="pm-num">{c.index}</span>
                  <span className="pm-chapter-title">{c.title}</span>
                  <span className="pm-count">{String(c.works.length).padStart(2, "0")}</span>
                </button>
                <ul>
                  {c.works.map((w) => (
                    <li key={w.id}>
                      <button type="button" className="pm-work" onClick={() => onWork(w)}>
                        <span className="pm-glyph" aria-hidden="true" data-kind={w.kind}>
                          {KIND_GLYPH[w.kind]}
                        </span>
                        <span className="pm-work-title">{w.title}</span>
                        <span className="pm-kind">{KIND_LABEL[w.kind]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="pm-foot">
          <span aria-live="polite">
            {needle ? `${matchCount} ${matchCount === 1 ? "match" : "matches"}` : `${chapters.length} chapters`}
          </span>
          <button type="button" className="pm-top" onClick={onTop}>
            Back to top
          </button>
          <span className="pm-hint">
            Press <kbd>M</kbd> anywhere to open
          </span>
        </div>
      </div>
    </div>
  );
}
