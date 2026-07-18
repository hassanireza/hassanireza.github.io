import type { ReactElement } from "react";
import type { SpecimenIcon as IconKey } from "../data/chambers";

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const paths: Record<IconKey, ReactElement> = {
  illustrator: (
    <path d="M12 2l2.5 7.5H21l-6 4.5 2.3 7L12 16.8 6.7 21l2.3-7-6-4.5h6.5L12 2z" />
  ),
  photoshop: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5-9 9" />
    </>
  ),
  layout: (
    <>
      <path d="M4 19V5a1 1 0 0 1 1-1h9l6 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M14 4v5h6" />
    </>
  ),
  color: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18z" opacity={0.5} />
      <path d="M3 12h18" />
    </>
  ),
  afterEffects: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="1" />
      <path d="M3 9h18M8 4v14" />
    </>
  ),
  premiere: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1" />
      <path d="M9 9l6 3-6 3V9z" />
    </>
  ),
  easing: <path d="M3 12c3-6 6-6 9 0s6 6 9 0" />,
  frames: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  html: (
    <>
      <path d="M4 3l1.5 17L12 22l6.5-2L20 3H4z" />
      <path d="M12 8v10M8 8h8" />
    </>
  ),
  css: (
    <>
      <path d="M4 3l1.5 17L12 22l6.5-2L20 3H4z" />
      <path d="M8 8h8l-.5 8-3.5 1-3.5-1-.2-2.5" />
    </>
  ),
  javascript: (
    <>
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
    </>
  ),
  typescript: (
    <>
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </>
  ),
  react: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </>
  ),
  vite: (
    <>
      <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
      <path d="M12 22V12M21 7l-9 5-9-5" />
    </>
  ),
  django: (
    <>
      <path d="M4 4h8a8 8 0 0 1 0 16H4V4z" />
      <path d="M9 4v16" />
    </>
  ),
  postgres: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  python: (
    <>
      <path d="M9 3h4a3 3 0 0 1 3 3v3H9a3 3 0 0 0-3 3v3H4a2 2 0 0 1-2-2V9a6 6 0 0 1 6-6h1z" />
      <path d="M15 21h-4a3 3 0 0 1-3-3v-3h7a3 3 0 0 0 3-3V9h3a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-2z" />
      <circle cx="8" cy="6.3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17.7" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  api: (
    <>
      <polyline points="8 4 4 8 8 12" />
      <polyline points="16 12 20 16 16 20" />
      <path d="M4 8h9M11 16h9" />
    </>
  ),
  docker: (
    <>
      <rect x="3" y="10" width="4" height="4" />
      <rect x="8" y="10" width="4" height="4" />
      <rect x="13" y="10" width="4" height="4" />
      <rect x="8" y="5" width="4" height="4" />
      <path d="M1 14c0 4 4.5 6 11 6s11-2 11-6" />
    </>
  ),
  git: (
    <>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="6" cy="18" r="2.3" />
      <path d="M6 8.3v7.4M8.3 6H15a3 3 0 0 1 3 3v6.7" />
    </>
  ),
  unity: (
    <>
      <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" />
      <path d="M12 2v20M4 6.5l16 11M20 6.5L4 17.5" />
    </>
  ),
  unreal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 13c2-5 4-6 7-6s5 1 7 6c-3 1-4 5-7 5s-4-4-7-5z" />
    </>
  ),
  blender: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8 15l-3 6M16 15l3 6M9 21h6" />
    </>
  ),
  csharp: (
    <>
      <polyline points="8 6 3 12 8 18" />
      <path d="M14 9h4M14 15h4M17 7v4M17 13v4" />
    </>
  ),
  gamedesign: (
    <>
      <rect x="2" y="8" width="20" height="10" rx="4" />
      <path d="M7 11v4M5 13h4" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="18.5" cy="14.5" r="1" />
    </>
  ),
};

export function SpecimenSvgIcon({ icon }: { icon: IconKey }) {
  return (
    <svg {...commonProps} aria-hidden="true">
      {paths[icon]}
    </svg>
  );
}
