import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ScrollProgress from "../../components/ScrollProgress/ScrollProgress";
import GambitIndex from "./GambitIndex";
import type { ChapterFilter, LevelFilter } from "./GambitIndex";
import GambitReader from "./GambitReader";
import { TOPICS, getTopic } from "./data";
import { useClipboard } from "./useClipboard";
import { IconBack } from "./Icons";
import "./Gambit.css";

const FA_FONT_ID = "gambit-fa-font";

/**
 * The Gambit: game theory and algorithms library.
 * One route (/gambit/*) renders both the masonry index and the reader, so the
 * filters and the index scroll position survive opening and closing an entry.
 */
export default function Gambit() {
  const params = useParams();
  const slug = (params["*"] ?? "").replace(/\/+$/, "") || undefined;
  const topic = getTopic(slug);

  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<ChapterFilter>("all");
  const [level, setLevel] = useState<LevelFilter>(0);
  const savedScroll = useRef(0);
  const { copy, copiedKey, toast } = useClipboard();

  // Persian names get a proper Persian face, loaded only on this route.
  useEffect(() => {
    if (document.getElementById(FA_FONT_ID)) return;
    const link = document.createElement("link");
    link.id = FA_FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = topic ? `${topic.name} · The Gambit` : "The Gambit · Reza Hassani";
    return () => {
      document.title = previous;
    };
  }, [topic]);

  // Restore the index scroll position after coming back from an entry.
  useEffect(() => {
    if (slug) return;
    const y = savedScroll.current;
    if (!y) return;
    const jump = () => window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
    const t = window.setTimeout(jump, 0);
    const raf = requestAnimationFrame(jump);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [slug]);

  return (
    <div className="gb-page">
      <ScrollProgress />
      <header className="gb-top">
        <div className="gb-top-inner">
          <Link to="/" className="gb-back">
            <IconBack />
            <span>hassanireza.github.io</span>
          </Link>
          {topic ? (
            <Link to="/gambit" className="gb-top-label">
              The Gambit
            </Link>
          ) : (
            <span className="gb-top-label">{TOPICS.length} entries</span>
          )}
        </div>
      </header>

      <main className="gb-main" id="gambit-main">
        {slug && !topic ? (
          <div className="gb-reader gb-missing">
            <h1 className="gb-r-title">Entry not found</h1>
            <p className="gb-p">That entry does not exist, or the link was changed.</p>
            <Link to="/gambit" className="gb-btn">
              Back to the index
            </Link>
          </div>
        ) : topic ? (
          <GambitReader key={topic.slug} topic={topic} copy={copy} copiedKey={copiedKey} />
        ) : (
          <GambitIndex
            query={query}
            setQuery={setQuery}
            chapter={chapter}
            setChapter={setChapter}
            level={level}
            setLevel={setLevel}
            onOpen={() => {
              savedScroll.current = window.scrollY;
            }}
            copy={copy}
            copiedKey={copiedKey}
          />
        )}
      </main>

      {!topic && (
        <footer className="gb-foot">
          <p>
            A field guide to strategy. References point to starting places; verify figures and dates before citing
            them in formal work.
          </p>
          <p className="gb-foot-meta">Part of hassanireza.github.io</p>
        </footer>
      )}

      <div className={`gb-toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
