export function IconCopy() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" />
      <path d="M10.5 3.5v-1a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1" fill="none" stroke="currentColor" />
    </svg>
  );
}
export function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon">
      <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function IconLink() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon">
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.8-.8" fill="none" stroke="currentColor" />
    </svg>
  );
}
export function IconArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon">
      <path
        d={dir === "left" ? "M13 8H3.5M7.5 3.5L3 8l4.5 4.5" : "M3 8h9.5M8.5 3.5L13 8l-4.5 4.5"}
        fill="none"
        stroke="currentColor"
      />
    </svg>
  );
}
export function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon">
      <rect x="2" y="2" width="5" height="5" fill="none" stroke="currentColor" />
      <rect x="9" y="2" width="5" height="5" fill="none" stroke="currentColor" />
      <rect x="2" y="9" width="5" height="5" fill="none" stroke="currentColor" />
      <rect x="9" y="9" width="5" height="5" fill="currentColor" fillOpacity="0.55" stroke="currentColor" />
    </svg>
  );
}
export function IconBack() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="gb-icon-fill">
      <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
    </svg>
  );
}
