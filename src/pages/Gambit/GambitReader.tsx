import { useCallback, useEffect, useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LEVEL_LABEL, TOPICS, chapterOf, getTopic, plainMath, topicToMarkdown } from "./data";
import type { Topic } from "./data";
import CopyButton from "./CopyButton";
import Tex from "./Tex";
import { IconArrow, IconGrid } from "./Icons";

interface ReaderProps {
  topic: Topic;
  copy: (key: string, text: string, message: string) => void;
  copiedKey: string | null;
}

const SWIPE_MIN = 70;

export default function GambitReader({ topic, copy, copiedKey }: ReaderProps) {
  const navigate = useNavigate();
  const idx = topic.number - 1;
  const prev = idx > 0 ? TOPICS[idx - 1] : undefined;
  const next = idx < TOPICS.length - 1 ? TOPICS[idx + 1] : undefined;
  const chapter = chapterOf(topic.chapter);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((t: Topic | undefined) => {
    if (t) navigate(`/gambit/${t.slug}`);
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "ArrowRight") go(next);
      else if (e.key === "Escape") navigate("/gambit");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next, navigate]);

  const onTouchStart = (e: ReactTouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".gb-math-scroll")) {
      touch.current = null;
      return;
    }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 2) go(dx < 0 ? next : prev);
  };

  const url = `${window.location.origin}/gambit/${topic.slug}`;
  const related = topic.related.map((s) => getTopic(s)).filter((t): t is Topic => Boolean(t));

  return (
    <>
      <article className="gb-reader" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <nav className="gb-crumbs" aria-label="Breadcrumb">
          <Link to="/gambit">Index</Link>
          <span aria-hidden="true">/</span>
          <span>
            Chapter {chapter.numeral} &nbsp;&middot;&nbsp; {chapter.title}
          </span>
        </nav>

        <header className="gb-r-head">
          <p className="gb-r-no">
            Entry {String(topic.number).padStart(3, "0")} of {TOPICS.length}
          </p>
          <h1 className="gb-r-title">{topic.name}</h1>
          {topic.fa && (
            <p className="gb-fa gb-fa-lg" lang="fa" dir="rtl">
              {topic.fa}
            </p>
          )}
          <p className="gb-r-idea">{topic.idea}</p>
          <div className="gb-r-meta">
            <span>{LEVEL_LABEL[topic.level]}</span>
            <span>{topic.minutes} min read</span>
            {topic.tags.slice(0, 3).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="gb-r-actions">
            <CopyButton
              label="Copy entry"
              copied={copiedKey === `topic:${topic.slug}`}
              onCopy={() => copy(`topic:${topic.slug}`, topicToMarkdown(topic), `Copied "${topic.name}" as Markdown`)}
            />
            <CopyButton
              icon="link"
              label="Copy link"
              copied={copiedKey === `link:${topic.slug}`}
              onCopy={() => copy(`link:${topic.slug}`, url, "Link copied")}
            />
          </div>
        </header>

        <section className="gb-sec">
          <h2 className="gb-sec-label">In depth</h2>
          {topic.body.map((p, i) => (
            <p className="gb-p" key={i}>
              {p}
            </p>
          ))}
        </section>

        {topic.math.length > 0 && (
          <section className="gb-sec">
            <h2 className="gb-sec-label">The math</h2>
            <ul className="gb-math-list">
              {topic.math.map((m, i) => {
                const key = `math:${topic.slug}:${i}`;
                return (
                  <li className="gb-math" key={i}>
                    {m.label && <span className="gb-math-label">{m.label}</span>}
                    <div className="gb-math-row">
                      <div className="gb-math-scroll" tabIndex={0}>
                        <Tex tex={m.tex} />
                      </div>
                      <CopyButton
                        compact
                        label={`Copy formula: ${m.label || m.tex}`}
                        copied={copiedKey === key}
                        onCopy={() =>
                          copy(key, m.label ? `${m.label}: ${plainMath(m.tex)}` : plainMath(m.tex), "Formula copied")
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="gb-sec">
          <h2 className="gb-sec-label">Worked example</h2>
          <aside className="gb-example">
            <p>{topic.example}</p>
          </aside>
        </section>

        <section className="gb-sec">
          <h2 className="gb-sec-label">In games and design</h2>
          <p className="gb-p">{topic.use}</p>
        </section>

        <section className="gb-sec">
          <h2 className="gb-sec-label">Origin and reading</h2>
          <p className="gb-p gb-origin">{topic.origin}</p>
        </section>

        {related.length > 0 && (
          <section className="gb-sec">
            <h2 className="gb-sec-label">Related</h2>
            <ul className="gb-related">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={`/gambit/${r.slug}`} className="gb-related-link">
                    <span className="gb-related-no">{String(r.number).padStart(3, "0")}</span>
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="gb-pager" aria-label="Previous and next entry">
          {prev ? (
            <Link to={`/gambit/${prev.slug}`} className="gb-pager-link is-prev" rel="prev">
              <span className="gb-pager-dir">
                <IconArrow dir="left" /> Previous
              </span>
              <span className="gb-pager-name">{prev.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/gambit/${next.slug}`} className="gb-pager-link is-next" rel="next">
              <span className="gb-pager-dir">
                Next <IconArrow dir="right" />
              </span>
              <span className="gb-pager-name">{next.name}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <div className="gb-dock" role="navigation" aria-label="Reader controls">
        <div className="gb-dock-inner">
          <button type="button" className="gb-dock-btn" onClick={() => go(prev)} disabled={!prev} aria-label="Previous entry">
            <IconArrow dir="left" />
            <span className="gb-dock-text">Prev</span>
          </button>
          <Link to="/gambit" className="gb-dock-btn" aria-label="Back to index">
            <IconGrid />
            <span className="gb-dock-text">Index</span>
          </Link>
          <CopyButton
            className="gb-dock-copy"
            label="Copy"
            copied={copiedKey === `topic:${topic.slug}`}
            onCopy={() => copy(`topic:${topic.slug}`, topicToMarkdown(topic), `Copied "${topic.name}" as Markdown`)}
          />
          <button type="button" className="gb-dock-btn" onClick={() => go(next)} disabled={!next} aria-label="Next entry">
            <span className="gb-dock-text">Next</span>
            <IconArrow dir="right" />
          </button>
        </div>
      </div>
    </>
  );
}
