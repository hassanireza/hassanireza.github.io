import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { Link } from "react-router-dom";
import { CHAPTERS, LEVEL_LABEL, TOPICS, chapterOf, topicToMarkdown } from "./data";
import type { ChapterId, Topic } from "./data";
import CopyButton from "./CopyButton";
import Tex from "./Tex";
import { IconArrow } from "./Icons";
import { GambitPlayButton, GambitPlayStage } from "./GambitPlay";
import "./GambitTiers.css";

export type ChapterFilter = "all" | ChapterId;
export type LevelFilter = 0 | 1 | 2 | 3;

interface IndexProps {
  query: string;
  setQuery: (q: string) => void;
  chapter: ChapterFilter;
  setChapter: (c: ChapterFilter) => void;
  level: LevelFilter;
  setLevel: (l: LevelFilter) => void;
  onOpen: () => void;
  copy: (key: string, text: string, message: string) => void;
  copiedKey: string | null;
}

const HAYSTACK = new Map(
  TOPICS.map((t) => [
    t.slug,
    [t.name, t.fa ?? "", t.tags.join(" "), t.idea, t.body.join(" "), t.example].join(" ").toLowerCase(),
  ] as const),
);

const CHAPTER_COUNT = new Map<ChapterId, number>(
  CHAPTERS.map((c) => [c.id, TOPICS.filter((t) => t.chapter === c.id).length] as const),
);

function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

function estimateHeight(t: Topic): number {
  return 190 + t.idea.length * 0.6 + (t.fa ? 22 : 0) + (t.math.length ? 70 : 0);
}

/** Column count follows the container width, so the masonry is truly mobile first. */
function useColumnCount(ref: RefObject<HTMLDivElement | null>): number {
  const [count, setCount] = useState(1);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      setCount(w < 640 ? 1 : w < 960 ? 2 : 3);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref]);
  return count;
}

/** Same order as the game: the library is read Foundations, then Core, then Advanced. */
const LEVELS = [1, 2, 3] as const;

const LEVEL_BLURB: Record<1 | 2 | 3, string> = {
  1: "Start here. The plain ideas and the classic first games, opening with the five that start Theory Gambit.",
  2: "The working toolkit. Most of what you need to analyse a real strategic situation.",
  3: "Deep and demanding ideas, ending with hypergames and metagames.",
};

/** Balance a list into columns by estimated card height. */
function distribute(items: Topic[], columns: number): Topic[][] {
  const buckets: Topic[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const t of items) {
    let k = 0;
    for (let i = 1; i < columns; i++) if (heights[i] < heights[k]) k = i;
    buckets[k].push(t);
    heights[k] += estimateHeight(t);
  }
  return buckets;
}

function LevelDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="gb-level" role="img" aria-label={`Level: ${LEVEL_LABEL[level]}`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= level ? "on" : ""} />
      ))}
    </span>
  );
}

export default function GambitIndex({
  query,
  setQuery,
  chapter,
  setChapter,
  level,
  setLevel,
  onOpen,
  copy,
  copiedKey,
}: IndexProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const columns = useColumnCount(gridRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return TOPICS.filter((t) => {
      if (chapter !== "all" && t.chapter !== chapter) return false;
      if (level !== 0 && t.level !== level) return false;
      if (terms.length === 0) return true;
      const hay = HAYSTACK.get(t.slug) ?? "";
      return terms.every((term) => hay.includes(term));
    });
  }, [query, chapter, level]);

  const groups = useMemo(
    () =>
      LEVELS.map((l) => {
        const items = shown.filter((t) => t.level === l);
        return { level: l, items, cols: distribute(items, columns) };
      }).filter((g) => g.items.length > 0),
    [shown, columns],
  );

  const activeChapter = chapter === "all" ? null : chapterOf(chapter);

  return (
    <>
      <header className="gb-hero">
        <div className="gb-hero-copy">
          <p className="gb-eyebrow">
            Field guide &nbsp;&middot;&nbsp; {TOPICS.length} entries &nbsp;&middot;&nbsp; {CHAPTERS.length} chapters
          </p>
          <h1 className="gb-title">The Gambit</h1>
          <p className="gb-sub">
            Game theory and algorithms, from first principles to working systems. Every entry has the plain idea, the
            math, a worked example and what it means for games and design.
          </p>
          <p className="gb-sub gb-sub-2">
            Read in order or wander. Each card opens a full entry, and every entry can be copied as Markdown.
          </p>
          <GambitPlayButton />
        </div>
        <GambitPlayStage />
      </header>

      <section className="gb-controls" aria-label="Filter entries">
        <label className="gb-search">
          <span className="gb-sr">Search entries</span>
          <input
            ref={searchRef}
            type="search"
            inputMode="search"
            placeholder="Search: nash, auction, نش, loss aversion"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>

        <div className="gb-chips" role="group" aria-label="Chapter">
          <button
            type="button"
            className={`gb-chip${chapter === "all" ? " active" : ""}`}
            aria-pressed={chapter === "all"}
            onClick={() => setChapter("all")}
          >
            All <span className="gb-chip-n">{TOPICS.length}</span>
          </button>
          {CHAPTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`gb-chip${chapter === c.id ? " active" : ""}`}
              aria-pressed={chapter === c.id}
              onClick={() => setChapter(chapter === c.id ? "all" : c.id)}
            >
              <span className="gb-chip-num">{c.numeral}</span> {c.title.replace(/^The /, "")}
              <span className="gb-chip-n">{CHAPTER_COUNT.get(c.id)}</span>
            </button>
          ))}
        </div>

        <div className="gb-row">
          <div className="gb-chips gb-chips-levels" role="group" aria-label="Level">
            {([0, 1, 2, 3] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={`gb-chip gb-chip-sm${level === l ? " active" : ""}`}
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
              >
                {l === 0 ? "Any level" : LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
          <CopyButton
            label="Copy all shown"
            copied={copiedKey === "all"}
            onCopy={() =>
              copy(
                "all",
                shown.map(topicToMarkdown).join("\n\n---\n\n"),
                `Copied ${shown.length} ${shown.length === 1 ? "entry" : "entries"} as Markdown`,
              )
            }
          />
        </div>

        {activeChapter && (
          <p className="gb-chapter-note">
            <span className="gb-chapter-num">Chapter {activeChapter.numeral}</span> {activeChapter.blurb}
          </p>
        )}
        <p className="gb-count" role="status" aria-live="polite">
          {shown.length} {shown.length === 1 ? "entry" : "entries"}
        </p>
      </section>

      <div className="gb-groups" ref={gridRef} style={vars({ "--cols": columns })}>
        {groups.map((g) => (
          <section className="gb-group" key={g.level} aria-labelledby={`gb-group-${g.level}`}>
            <header className="gb-group-head">
              <span className="gb-group-no" aria-hidden="true">
                {String(g.level).padStart(2, "0")}
              </span>
              <h2 className="gb-group-title" id={`gb-group-${g.level}`}>
                {LEVEL_LABEL[g.level]}
              </h2>
              <span className="gb-group-count">
                {g.items.length} {g.items.length === 1 ? "entry" : "entries"}
              </span>
              <p className="gb-group-blurb">{LEVEL_BLURB[g.level]}</p>
            </header>
            <div className="gb-grid">
              {g.cols.map((col, ci) => (
                <div className="gb-col" key={ci}>
                  {col.map((t, i) => (
                    <article className="gb-card" key={t.slug} style={vars({ "--i": (i + ci) % 10 })}>
                      <div className="gb-card-top">
                        <span className="gb-card-no">
                          {pad(t.number)} &nbsp;&middot;&nbsp; {chapterOf(t.chapter).numeral}
                        </span>
                        <LevelDots level={t.level} />
                      </div>
                      <h3 className="gb-card-title">
                        <Link to={`/gambit/${t.slug}`} onClick={onOpen} className="gb-card-link">
                          {t.name}
                        </Link>
                      </h3>
                      {t.fa && (
                        <p className="gb-fa" lang="fa" dir="rtl">
                          {t.fa}
                        </p>
                      )}
                      <p className="gb-card-idea">{t.idea}</p>
                      {t.math[0] && (
                        <div className="gb-card-math" aria-hidden="true">
                          <Tex tex={t.math[0].tex} />
                        </div>
                      )}
                      <div className="gb-card-foot">
                        <span className="gb-card-meta">
                          {t.tags[0]} &nbsp;&middot;&nbsp; {t.minutes} min
                        </span>
                        <span className="gb-card-actions">
                          <CopyButton
                            compact
                            label={`Copy ${t.name} as Markdown`}
                            copied={copiedKey === `topic:${t.slug}`}
                            onCopy={() => copy(`topic:${t.slug}`, topicToMarkdown(t), `Copied "${t.name}" as Markdown`)}
                          />
                          <span className="gb-card-open" aria-hidden="true">
                            <IconArrow dir="right" />
                          </span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="gb-empty">
          <p>No entry matches that search.</p>
          <button
            type="button"
            className="gb-btn"
            onClick={() => {
              setQuery("");
              setChapter("all");
              setLevel(0);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
