import type { ReactNode } from "react";
import { useScrollSpy } from "../../hooks/useReveal";
import "./SectionNav.css";

export interface SectionNavItem {
  id: string;
  label: string;
  icon: "code" | "layout" | "play" | "manifesto" | "palette" | "type" | "marks" | "discipline";
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
  manifesto: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2h10v12H3V2Zm2 3h6v1H5V5Zm0 2.5h6v1H5v-1Zm0 2.5h4v1H5v-1Z" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2a6 6 0 1 0 0 12c.9 0 1.4-.5 1.4-1.1 0-.3-.1-.5-.3-.7-.2-.2-.3-.4-.3-.7 0-.6.5-1 1.1-1H11a3 3 0 0 0 3-3c0-3-2.7-5.5-6-5.5Zm-3.3 5.8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm2-3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm2.3 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  ),
  type: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.5h11v2h-1.2c-.2-.7-.5-1-1.2-1H8.9v8.3c0 .6.2.9 1.2.9v.8H5.9v-.8c1 0 1.2-.3 1.2-.9V4.5H4.9c-.7 0-1 .3-1.2 1H2.5v-2Z" />
    </svg>
  ),
  marks: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 14.5 8 8 14.5 1.5 8 8 1.5Zm0 3.2L4.7 8 8 11.3 11.3 8 8 4.7Z" />
    </svg>
  ),
  discipline: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.3 13.5 3v4.4c0 3.6-2.3 6.4-5.5 7.3-3.2-.9-5.5-3.7-5.5-7.3V3L8 1.3Zm0 1.6L4 4.3v3.1c0 2.7 1.6 4.9 4 5.6 2.4-.7 4-2.9 4-5.6V4.3L8 2.9Z" />
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
