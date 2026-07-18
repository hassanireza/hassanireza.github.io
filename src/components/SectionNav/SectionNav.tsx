import type { ReactNode } from "react";
import { useScrollSpy } from "../../hooks/useReveal";
import "./SectionNav.css";

export interface SectionNavItem {
  id: string;
  label: string;
  icon: "code" | "layout" | "play";
}

interface SectionNavProps {
  items: SectionNavItem[];
}

const ICONS: Record<SectionNavItem["icon"], ReactNode> = {
  code: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.7 3.9 1.6 8l4.1 4.1 1.1-1.1L3.9 8l2.9-2.9-1.1-1.2Zm4.6 0-1.1 1.2L12.1 8l-2.9 2.9 1.1 1.1L14.4 8 10.3 3.9Z" />
    </svg>
  ),
  layout: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2h12v3H2V2Zm0 4.5h5.5V14H2V6.5Zm7 0H14V14H9V6.5Z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5v11l10-5.5-10-5.5Z" />
    </svg>
  ),
};

export default function SectionNav({ items }: SectionNavProps) {
  const activeId = useScrollSpy(items.map((i) => i.id));

  function goTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="section-nav" aria-label="Portfolio sections">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`section-nav-item${activeId === item.id ? " active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              <span className="section-nav-icon">{ICONS[item.icon]}</span>
              <span className="section-nav-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
