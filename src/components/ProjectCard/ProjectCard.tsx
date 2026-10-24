import { AssetResolver } from "../../lib/asset";
import { useReveal } from "../../hooks/useReveal";
import { useTilt } from "../../hooks/useTilt";
import { isAnimationProject, type AnyProject } from "../../types/project";
import "./ProjectCard.css";

interface ProjectCardProps {
  project: AnyProject;
  /** Two digit position inside its section, e.g. "03". */
  number: string;
  /** Full-width feature treatment (image beside a larger caption). */
  feature?: boolean;
  /** Position inside its row, used to stagger the entrance. */
  stagger?: number;
  onPlay?: (project: AnyProject) => void;
}

function hostOf(href?: string): string {
  if (!href) return "";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const ArrowOut = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 3.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0V5.06l-7.22 7.22a.75.75 0 0 1-1.06-1.06l7.22-7.22H5.75A.75.75 0 0 1 5 3.25Z" />
  </svg>
);

const PlayGlyph = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 2.9v10.2c0 .6.65.95 1.15.62l7.6-5.1a.75.75 0 0 0 0-1.24l-7.6-5.1A.75.75 0 0 0 5 2.9Z" />
  </svg>
);

/**
 * One portfolio entry. The whole card is a single link (or a single button
 * for motion pieces that open the lightbox), so on touch screens the
 * entire card is the tap target instead of just the thumbnail.
 */
export default function ProjectCard({ project, number, feature = false, stagger = 0, onPlay }: ProjectCardProps) {
  const { title, desc, img } = project;
  const isMotion = isAnimationProject(project);
  const host = hostOf(project.href);
  const { ref: revealRef, visible } = useReveal<HTMLElement>(0.1);
  const tiltRef = useTilt<HTMLDivElement>({ max: 2.5 });

  const alt = isMotion ? project.alt || title : `${title} project screenshot`;

  const body = (
    <>
      <div className="pf-figure" ref={tiltRef}>
        <div className="pf-frame">
          <img src={AssetResolver.resolve(img)} alt={alt} loading="lazy" decoding="async" />
          <span className="pf-sheen" aria-hidden="true" />
          <span className="pf-corners" aria-hidden="true" />
          {isMotion && (
            <span className="pf-badge" aria-hidden="true">
              <PlayGlyph />
              Play
            </span>
          )}
        </div>
      </div>

      <div className="pf-caption">
        <div className="pf-caption-top">
          <span className="pf-number">{number}</span>
          <span className="pf-go" aria-hidden="true">
            {isMotion ? <PlayGlyph /> : <ArrowOut />}
          </span>
        </div>
        <h4 className="pf-title">{title}</h4>
        {desc && <p className="pf-desc">{desc}</p>}
        <span className="pf-meta">{isMotion ? "Motion piece" : host || "Case study"}</span>
        {feature && (
          <span className="pf-cta">
            {isMotion ? "Watch the piece" : "Open project"}
            <ArrowOut />
          </span>
        )}
      </div>
    </>
  );

  return (
    <article
      ref={revealRef}
      className={`pf-card${feature ? " is-feature" : ""}${visible ? " is-visible" : ""}`}
      style={{ ["--pf-stagger" as string]: stagger }}
    >
      {isMotion ? (
        <button type="button" className="pf-link" onClick={() => onPlay?.(project)} aria-label={`Play ${title}`}>
          {body}
        </button>
      ) : project.href ? (
        <a
          className="pf-link"
          href={project.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${title}, opens in a new tab`}
        >
          {body}
        </a>
      ) : (
        <div className="pf-link is-static">{body}</div>
      )}
    </article>
  );
}
