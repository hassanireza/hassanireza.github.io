import { useMemo } from "react";
import CreativeCard from "./CreativeCard";
import { useGridColumns } from "../../hooks/useGridColumns";
import { useReveal } from "../../hooks/useReveal";
import { useSquareColumns } from "../../hooks/useSquareColumns";
import { planSquareRows } from "../../lib/creativeLayout";
import { GRID_TRACKS, planCells } from "../../lib/portfolioLayout";
import { coverOf, CREATIVE_SECTION_ID, type CreativeCover, type CreativeWork } from "../../types/creative";
import "../ProjectGrid/ProjectGrid.css";
import "./CreativeSection.css";

interface CreativeSectionProps {
  /** Two digit chapter number, e.g. "01". */
  index: string;
  title: string;
  blurb?: string;
  works: CreativeWork[];
  onOpen: (work: CreativeWork) => void;
}

interface RunItem {
  work: CreativeWork;
  /** Position in the whole section, for the two digit number. */
  n: number;
}

interface Run {
  cover: CreativeCover;
  items: RunItem[];
}

const num = (n: number) => String(n + 1).padStart(2, "0");

/** 16:9 covers: the same count-aware row plan as every other chapter. */
function WideRun({ items, onOpen }: { items: RunItem[]; onOpen: (w: CreativeWork) => void }) {
  const columns = useGridColumns();
  const cells = useMemo(() => planCells(items.length, columns), [items.length, columns]);
  return (
    <div className="pf-grid cc-run" style={{ ["--pf-tracks" as string]: GRID_TRACKS }}>
      {items.map(({ work, n }, i) => (
        <div className="pf-cell" key={work.id} style={{ gridColumn: `span ${cells[i].span}` }}>
          <CreativeCard
            work={work}
            number={num(n)}
            cover="wide"
            feature={cells[i].feature}
            stagger={cells[i].col}
            onOpen={onOpen}
          />
        </div>
      ))}
    </div>
  );
}

/** 1:1 covers: up to 5 per row, with the same count-aware plan as the wide grid. */
function SquareRun({ items, onOpen }: { items: RunItem[]; onOpen: (w: CreativeWork) => void }) {
  const columns = useSquareColumns();
  const rows = useMemo(() => {
    const out: RunItem[][] = [];
    let at = 0;
    for (const size of planSquareRows(items.length, columns)) {
      out.push(items.slice(at, at + size));
      at += size;
    }
    return out;
  }, [items, columns]);

  return (
    <div className="cc-squares cc-run">
      {rows.map((row, r) => (
        <div
          className="cc-row"
          key={row[0].work.id}
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          data-row-size={row.length}
        >
          {row.map(({ work, n }, col) => (
            <div className="cc-cell" key={work.id}>
              <CreativeCard
                work={work}
                number={num(n)}
                cover="square"
                feature={row.length === 1}
                stagger={col + (r % 2)}
                onOpen={onOpen}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The Creative Coding chapter. Works keep their order and share one grid,
 * so wide and square covers can be mixed freely. Tiles open the studio (video plus source) instead of linking out.
 */
export default function CreativeSection({ index, title, blurb, works, onOpen }: CreativeSectionProps) {
  const { ref: headRef, visible } = useReveal<HTMLElement>(0.3);
  const count = String(works.length).padStart(2, "0");

  // One flow. A set of only wide covers uses the 3-column wide plan; as soon
  // as square covers are present, every work shares one compact grid (up to 5
  // across) so a handful of mixed works sit together in a single row instead
  // of each style forming its own row.
  const runs = useMemo(() => {
    const items = works.map((work, n) => ({ work, n }));
    const allWide = works.every((w) => coverOf(w) === "wide");
    const out: Run[] = items.length ? [{ cover: allWide ? "wide" : "square", items }] : [];
    return out;
  }, [works]);

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

      {runs.map((run, i) =>
        run.cover === "square" ? (
          <SquareRun key={i} items={run.items} onOpen={onOpen} />
        ) : (
          <WideRun key={i} items={run.items} onOpen={onOpen} />
        ),
      )}
    </section>
  );
}
