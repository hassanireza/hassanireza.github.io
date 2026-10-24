import { useMemo } from "react";
import ProjectCard from "../ProjectCard/ProjectCard";
import { useGridColumns } from "../../hooks/useGridColumns";
import { useReveal } from "../../hooks/useReveal";
import { GRID_TRACKS, planCells } from "../../lib/portfolioLayout";
import type { AnyProject } from "../../types/project";
import "./ProjectGrid.css";

interface ProjectGridProps {
  id: string;
  /** Two digit chapter number, e.g. "01". */
  index: string;
  title: string;
  blurb?: string;
  projects: AnyProject[];
  onPlay?: (project: AnyProject) => void;
}

/**
 * One chapter of the portfolio. The cards are placed from a row plan (see
 * lib/portfolioLayout) rather than CSS auto-flow, which is what guarantees
 * that every row is full no matter how many projects the section holds.
 */
export default function ProjectGrid({ id, index, title, blurb, projects, onPlay }: ProjectGridProps) {
  const columns = useGridColumns();
  const cells = useMemo(() => planCells(projects.length, columns), [projects.length, columns]);
  const { ref: headRef, visible: headVisible } = useReveal<HTMLElement>(0.3);

  const count = String(projects.length).padStart(2, "0");

  return (
    <section className="pf-section" id={id} aria-labelledby={`${id}-title`}>
      <header ref={headRef} className={`pf-section-head${headVisible ? " is-visible" : ""}`}>
        <div className="pf-section-meta">
          <span className="pf-section-index">{index}</span>
          <span className="pf-section-rule" aria-hidden="true" />
          <span className="pf-section-count">
            {count} {projects.length === 1 ? "work" : "works"}
          </span>
        </div>
        <div className="pf-section-body">
          <h3 id={`${id}-title`} className="pf-section-title">
            {title}
          </h3>
          {blurb && <p className="pf-section-blurb">{blurb}</p>}
        </div>
      </header>

      <div className="pf-grid" style={{ ["--pf-tracks" as string]: GRID_TRACKS }}>
        {projects.map((project, i) => {
          const cell = cells[i];
          return (
            <div
              className="pf-cell"
              key={project.id}
              style={{ gridColumn: `span ${cell.span}` }}
              data-row-size={cell.rowSize}
            >
              <ProjectCard
                project={project}
                number={String(i + 1).padStart(2, "0")}
                feature={cell.feature}
                stagger={cell.col}
                onPlay={onPlay}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
