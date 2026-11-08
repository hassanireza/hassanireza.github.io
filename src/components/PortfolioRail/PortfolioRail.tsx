import { useEffect, useRef } from "react";
import "./PortfolioRail.css";

export interface PortfolioRailItem {
  id: string;
  index: string;
  label: string;
}

interface PortfolioRailProps {
  items: PortfolioRailItem[];
  activeId: string;
  /** Rail slides in once the hero's own index has scrolled out of view. */
  visible: boolean;
  onSelect: (id: string) => void;
  /** Opens the searchable map of every chapter and work. */
  onOpenMap?: () => void;
}

/**
 * Persistent chapter navigation. Floats at the top on desktop and sits in
 * the bottom thumb zone on phones (the same placement the Branding page
 * uses). Items carry a number and a label, never an icon alone, so
 * disciplines with similar subject matter stay distinguishable. On narrow
 * screens the row scrolls horizontally and keeps the active chip centered.
 */
export default function PortfolioRail({ items, activeId, visible, onSelect, onOpenMap }: PortfolioRailProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(".is-active");
    if (!active) return;
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeId, visible]);

  if (items.length < 2) return null;

  return (
    <nav className={`pf-rail${visible ? " is-visible" : ""}`} aria-label="Portfolio chapters" aria-hidden={!visible}>
      <div className="pf-rail-row">
        <ul ref={listRef}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`pf-rail-item${activeId === item.id ? " is-active" : ""}`}
                onClick={() => onSelect(item.id)}
                tabIndex={visible ? 0 : -1}
                aria-current={activeId === item.id ? "true" : undefined}
              >
                <span className="pf-rail-index">{item.index}</span>
                <span className="pf-rail-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {onOpenMap && (
          <button
            type="button"
            className="pf-rail-map"
            onClick={onOpenMap}
            tabIndex={visible ? 0 : -1}
            aria-label="Open portfolio map"
            aria-haspopup="dialog"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2.5A.5.5 0 0 1 2.5 2h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4Zm7 0a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4ZM2 9.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4Zm7 0a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4Z" />
            </svg>
            <span>Map</span>
          </button>
        )}
      </div>
    </nav>
  );
}
