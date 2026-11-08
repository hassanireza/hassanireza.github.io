import { useCallback, useEffect, useRef, useState } from "react";
import { AssetResolver } from "../../lib/asset";
import { useReveal } from "../../hooks/useReveal";
import { useTilt } from "../../hooks/useTilt";
import type { CreativeCover, CreativeWork } from "../../types/creative";

interface CreativeCardProps {
  work: CreativeWork;
  /** Two digit position inside the section, e.g. "01". */
  number: string;
  feature?: boolean;
  /** Cover style: 16:9 "wide" or compact 1:1 "square". */
  cover?: CreativeCover;
  stagger?: number;
  onOpen: (work: CreativeWork) => void;
}

const CodeGlyph = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5.7 3.9 1.6 8l4.1 4.1 1.1-1.1L3.9 8l2.9-2.9-1.1-1.2Zm4.6 0-1.1 1.2L12.1 8l-2.9 2.9 1.1 1.1L14.4 8 10.3 3.9Z" />
  </svg>
);

const PlayGlyph = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 2.9v10.2c0 .6.65.95 1.15.62l7.6-5.1a.75.75 0 0 0 0-1.24l-7.6-5.1A.75.75 0 0 0 5 2.9Z" />
  </svg>
);

/**
 * Grid tile for one creative work. The poster is letterboxed over a blurred
 * copy of itself, so a square, a portrait and an ultra-wide piece all sit in
 * the same frame without cropping. A silent preview loop plays on hover or
 * keyboard focus, or, on touch screens, while the tile is mostly on screen;
 * it is never fetched until then, and never plays under reduced motion.
 */
export default function CreativeCard({ work, number, feature = false, cover = "wide", stagger = 0, onOpen }: CreativeCardProps) {
  const { ref: revealRef, visible } = useReveal<HTMLElement>(0.1);
  const tiltRef = useTilt<HTMLDivElement>({ max: 2.5 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const poster = AssetResolver.resolve(work.poster);
  const preview = AssetResolver.resolve(work.preview ?? work.video);

  const activate = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    setActive(true);
  }, []);
  const deactivate = useCallback(() => setActive(false), []);

  // Touch screens have no hover: play while the tile is mostly in view.
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (!window.matchMedia("(hover: none)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? activate() : deactivate()),
      { threshold: 0.65 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activate, deactivate]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [active, armed]);

  return (
    <article
      ref={revealRef}
      id={`work-${work.id}`}
      className={`pf-card cc-card${cover === "square" ? " is-square" : ""}${feature ? " is-feature" : ""}${visible ? " is-visible" : ""}`}
      style={{ ["--pf-stagger" as string]: stagger }}
    >
      <button
        type="button"
        className="pf-link"
        onClick={() => onOpen(work)}
        onPointerEnter={(e) => e.pointerType === "mouse" && activate()}
        onPointerLeave={(e) => e.pointerType === "mouse" && deactivate()}
        onFocus={activate}
        onBlur={deactivate}
        aria-label={`${work.title}: watch the output and read the code`}
        aria-haspopup="dialog"
      >
        <div className="pf-figure" ref={tiltRef}>
          <div className="pf-frame cc-frame" ref={frameRef}>
            <span className="cc-bleed" style={{ backgroundImage: `url("${poster}")` }} aria-hidden="true" />
            <img className="cc-poster" src={poster} alt="" loading="lazy" decoding="async" />
            {armed && (
              <video
                ref={videoRef}
                className={`cc-preview${playing ? " is-playing" : ""}`}
                src={preview}
                muted
                loop
                playsInline
                preload="auto"
                tabIndex={-1}
                aria-hidden="true"
                onPlaying={() => setPlaying(true)}
              />
            )}
            <span className="pf-sheen" aria-hidden="true" />
            <span className="pf-corners" aria-hidden="true" />
            <span className="pf-badge" aria-hidden="true">
              <PlayGlyph />
              Video + Code
            </span>
          </div>
        </div>

        <div className="pf-caption">
          <div className="pf-caption-top">
            <span className="pf-number">{number}</span>
            <span className="pf-go" aria-hidden="true">
              <CodeGlyph />
            </span>
          </div>
          <h4 className="pf-title">{work.title}</h4>
          <p className="pf-desc">{work.desc}</p>
          {work.tags && work.tags.length > 0 && (
            <ul className="cc-tags" aria-label="Tags">
              {work.tags.slice(0, 4).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {feature && (
            <span className="pf-cta">
              Open the studio
              <CodeGlyph />
            </span>
          )}
        </div>
      </button>
    </article>
  );
}
