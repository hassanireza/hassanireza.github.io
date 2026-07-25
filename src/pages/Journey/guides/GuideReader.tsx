import { useEffect, useState } from "react";
import type { CheatSheet } from "../domain/CheatSheet";
import { guideRegistry, type GuideModule } from "./registry";
import "./GuideReader.css";

interface GuideReaderProps {
  sheet: CheatSheet;
}

export function GuideReader({ sheet }: GuideReaderProps) {
  const [guide, setGuide] = useState<GuideModule | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setGuide(null);
    setError(false);

    const load = guideRegistry[sheet.slug];
    if (!load) {
      setError(true);
      return;
    }

    load()
      .then((module) => {
        if (!cancelled) setGuide(module);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sheet.slug]);

  if (error) {
    return <div className="guide-reader-status">This guide could not be loaded.</div>;
  }

  if (!guide) {
    return <div className="guide-reader-status">Loading guide...</div>;
  }

  return (
    <div className="guide-reader">
      <div className={`guide-reader-inner${guide.toc.length === 0 ? " no-toc" : ""}`}>
        {guide.toc.length > 0 && (
          <nav className="guide-toc" aria-label="On this page">
            <span className="guide-toc-label">On this page</span>
            <ul>
              {guide.toc.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`}>{entry.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="guide-main">
          <article className="guide-hero">
            <span className="guide-hero-category">{sheet.category}</span>
            <h1>{sheet.title}</h1>
            <p>{sheet.description}</p>
            <div className="guide-hero-tags">
              {sheet.tags.map((tag) => (
                <span key={tag} className="guide-hero-tag">
                  {tag}
                </span>
              ))}
            </div>
          </article>

          {/* Guide content was migrated from a static HTML document and is
              rendered from a sanitized, build-time-generated string (see
              guides/content/<slug>.ts) - there is no user input here. */}
          <article className="guide-content" dangerouslySetInnerHTML={{ __html: guide.html }} />
        </div>
      </div>
    </div>
  );
}
