import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AssetResolver } from "../../lib/asset";
import type { CreativeWork } from "../../types/creative";
import "./CreativeStudio.css";

/** Monaco lives behind this boundary, so the editor chunk loads on demand. */
const CodeViewer = lazy(() => import("../CodeViewer/CodeViewer"));

type View = "split" | "watch" | "code";

interface CreativeStudioProps {
  works: CreativeWork[];
  /** Id of the open work, or null when the studio is closed. */
  activeId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const WIDE_QUERY = "(min-width: 960px)";

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const update = () => setWide(mq.matches);
    mq.addEventListener("change", update);
    update();
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const pad = (n: number) => String(n).padStart(2, "0");

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

const Icon = {
  close: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.34 3.28a.75.75 0 0 0-1.06 1.06L6.94 8l-3.66 3.66a.75.75 0 1 0 1.06 1.06L8 9.06l3.66 3.66a.75.75 0 1 0 1.06-1.06L9.06 8l3.66-3.66a.75.75 0 0 0-1.06-1.06L8 6.94 4.34 3.28Z" />
    </svg>
  ),
  prev: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.28 3.22a.75.75 0 0 1 0 1.06L6.56 8l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.72 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.44 8 5.72 4.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  ),
};

/**
 * Full-screen viewer for one creative work: the output on one side, the
 * source on the other. The player is sized from the work's own aspect ratio
 * (a square, a portrait reel and an ultra-wide banner all fit without
 * cropping), and the code pane is mounted only once it is first shown.
 *
 *   >= 960px  Split, Watch and Code views; Split is the default
 *   <  960px  Watch and Code views as tabs, one full-height pane at a time
 */
export default function CreativeStudio({ works, activeId, onClose, onNavigate }: CreativeStudioProps) {
  const index = works.findIndex((w) => w.id === activeId);
  const work = index >= 0 ? works[index] : null;
  const open = work !== null;

  const wide = useWide();
  const [view, setView] = useState<View>("split");
  const [codeShown, setCodeShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [copiedRun, setCopiedRun] = useState(false);

  const effective: View = wide ? view : view === "split" ? "watch" : view;
  const showCode = effective !== "watch";

  // Code mounts the first time it becomes visible, and stays mounted after.
  const mountCode = codeShown || showCode;
  useEffect(() => {
    if (showCode && !codeShown) setCodeShown(true);
  }, [showCode, codeShown]);

  // Reset the transient state whenever a different work opens.
  const workId = work?.id;
  useEffect(() => {
    setCopiedRun(false);
  }, [workId]);

  // Scroll lock, focus in, focus restore.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      const el = openerRef.current;
      if (el instanceof HTMLElement && document.contains(el)) el.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
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
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (works.length < 2 || index < 0) return;
      onNavigate(works[(index + dir + works.length) % works.length].id);
    },
    [works, index, onNavigate],
  );

  const copyRun = useCallback(async () => {
    if (!work?.run) return;
    try {
      await navigator.clipboard.writeText(work.run);
      setCopiedRun(true);
      window.setTimeout(() => setCopiedRun(false), 1700);
    } catch {
      /* clipboard unavailable; the command stays selectable on screen */
    }
  }, [work]);

  if (!work) return null;

  const ratio = work.width / work.height;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tabs: { id: View; label: string }[] = wide
    ? [
        { id: "split", label: "Split" },
        { id: "watch", label: "Watch" },
        { id: "code", label: "Code" },
      ]
    : [
        { id: "watch", label: "Watch" },
        { id: "code", label: "Code" },
      ];

  return (
    <div className="cs-root" role="dialog" aria-modal="true" aria-labelledby="cs-title">
      <div className="cs-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="cs-panel" ref={panelRef}>
        <header className="cs-bar">
          <div className="cs-heading">
            <span className="cs-count">
              {pad(index + 1)} / {pad(works.length)}
            </span>
            <h2 id="cs-title" className="cs-title">
              {work.title}
            </h2>
          </div>

          <div className="cs-tabs" role="group" aria-label="View">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cs-tab${effective === t.id ? " is-active" : ""}`}
                aria-pressed={effective === t.id}
                onClick={() => setView(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="cs-nav">
            {works.length > 1 && (
              <>
                <button type="button" className="cs-icon" onClick={() => step(-1)} aria-label="Previous work">
                  {Icon.prev}
                </button>
                <button type="button" className="cs-icon" onClick={() => step(1)} aria-label="Next work">
                  {Icon.next}
                </button>
              </>
            )}
            <button ref={closeRef} type="button" className="cs-icon cs-close" onClick={onClose} aria-label="Close">
              {Icon.close}
            </button>
          </div>
        </header>

        <div className="cs-body" data-view={effective}>
          <section
            className="cs-media-pane"
            aria-label="Output"
            style={{ ["--cs-ar" as string]: `${work.width} / ${work.height}`, ["--cs-ratio" as string]: ratio }}
          >
            <div className="cs-player">
              <video
                key={work.id}
                className="cs-video"
                src={AssetResolver.resolve(work.video)}
                poster={AssetResolver.resolve(work.poster)}
                width={work.width}
                height={work.height}
                controls
                loop
                muted
                playsInline
                autoPlay={!reduced}
                preload="auto"
                aria-label={`${work.title}, video output`}
              />
            </div>

            <div className="cs-info">
              <p className="cs-desc">{work.desc}</p>

              {work.tags && work.tags.length > 0 && (
                <ul className="cs-tags" aria-label="Tags">
                  {work.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}

              {work.about?.map((p, i) => (
                <p key={i} className="cs-about">
                  {p}
                </p>
              ))}

              {work.specs && work.specs.length > 0 && (
                <dl className="cs-specs">
                  {work.specs.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {work.run && (
                <div className="cs-run">
                  <span className="cs-run-label">Run it</span>
                  <code>{work.run}</code>
                  <button type="button" onClick={copyRun}>
                    <span aria-live="polite">{copiedRun ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="cs-code-pane" aria-label="Source code">
            {mountCode && (
              <Suspense
                fallback={
                  <div className="cs-code-loading" role="status">
                    Loading editor
                  </div>
                }
              >
                <CodeViewer key={work.id} code={work.code} />
              </Suspense>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
