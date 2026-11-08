import { useMemo } from "react";
import CreativeCard from "./CreativeCard";
import { useGridColumns } from "../../hooks/useGridColumns";
import { useReveal } from "../../hooks/useReveal";
import { GRID_TRACKS, planCells } from "../../lib/portfolioLayout";
import { CREATIVE_SECTION_ID, type CreativeWork } from "../../types/creative";
import "../ProjectGrid/ProjectGrid.css";
import "./CreativeSection.css";

interface CreativeSectionProps {
  /** Two digit chapter number, e.g. "05". */
  index: string;
  title: string;
  blurb?: string;
  works: CreativeWork[];
  onOpen: (work: CreativeWork) => void;
}

/**
 * The Creative Coding chapter. Same editorial header and count-aware row
 * plan as every other chapter, so it reads as part of the page; the tiles
 * differ in that they open the studio (video plus source) instead of
 * linking out.
 */
export default function CreativeSection({ index, title, blurb, works, onOpen }: CreativeSectionProps) {
  const columns = useGridColumns();
  const cells = useMemo(() => planCells(works.length, columns), [works.length, columns]);
  const { ref: headRef, visible } = useReveal<HTMLElement>(0.3);
  const count = String(works.length).padStart(2, "0");

  return (
    <section className="pf-section cc-section" id={CREATIVE_SECTION_ID} aria-labelledby={`${CREATIVE_SECTION_ID}-title`}>
      <header ref={headRef} className={`pf-section-head${visible ? " is-visible" : ""}`}>
        <div className="pf-section-meta">
          <span className="pf-section-index">{index}</span>
          <span className="pf-section-rule" aria-hidden="true" />
          <span className="pf-section-count">
            {count} {works.length === 1 ? "work" : "works"}
          </span>
        </div>
        <div className="pf-section-body">
          <h3 id={`${CREATIVE_SECTION_ID}-title`} className="pf-section-title">
            {title}
          </h3>
          {blurb && <p className="pf-section-blurb">{blurb}</p>}
        </div>
      </header>

      <div className="pf-grid" style={{ ["--pf-tracks" as string]: GRID_TRACKS }}>
        {works.map((work, i) => {
          const cell = cells[i];
          return (
            <div className="pf-cell" key={work.id} style={{ gridColumn: `span ${cell.span}` }} data-row-size={cell.rowSize}>
              <CreativeCard
                work={work}
                number={String(i + 1).padStart(2, "0")}
                feature={cell.feature}
                stagger={cell.col}
                onOpen={onOpen}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
