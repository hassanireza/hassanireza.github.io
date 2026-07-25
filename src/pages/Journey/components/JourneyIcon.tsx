export type JourneyIconName =
  | "python"
  | "django"
  | "database"
  | "api"
  | "testing"
  | "frontend"
  | "jobs"
  | "containers"
  | "speed"
  | "shield"
  | "ai"
  | "mark"
  | "trophy";

const commonProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * A single, restrained line-icon vocabulary shared by phases and
 * achievements, in the same hand as the nav marks on the main site
 * (thin single stroke, currentColor, no fills, no color-coding). Each
 * glyph is an abstract stand-in for the concept, not a reproduction of
 * any product's logo.
 */
export function JourneyIcon({ name }: { name: JourneyIconName }) {
  switch (name) {
    case "python":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M8 2c-2 0-3 1-3 2.6V6h6" opacity="0.85" />
          <path d="M8 14c2 0 3-1 3-2.6V10H5" opacity="0.55" />
          <circle cx="6" cy="4" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="10" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "django":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 12V8M8 12V4M12 12V6" opacity="0.7" />
        </svg>
      );
    case "database":
      return (
        <svg {...commonProps} aria-hidden="true">
          <ellipse cx="8" cy="4" rx="5" ry="2" opacity="0.7" />
          <path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4" opacity="0.55" />
          <path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" opacity="0.4" />
        </svg>
      );
    case "api":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5.5 2v3.5M10.5 2v3.5" opacity="0.7" />
          <path d="M4 5.5h8v2.7a4 4 0 0 1-8 0V5.5z" opacity="0.55" />
          <path d="M8 12.2v1.8" opacity="0.4" />
        </svg>
      );
    case "testing":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M6.4 2h3.2M7 2v3.6l-3.2 5.8A1.3 1.3 0 0 0 4.9 13.4h6.2a1.3 1.3 0 0 0 1.1-2L9 5.6V2" opacity="0.65" />
          <path d="M5.6 9.2h4.8" opacity="0.4" />
        </svg>
      );
    case "frontend":
      return (
        <svg {...commonProps} aria-hidden="true">
          <ellipse cx="8" cy="8" rx="5.6" ry="2.2" opacity="0.65" />
          <ellipse cx="8" cy="8" rx="5.6" ry="2.2" transform="rotate(60 8 8)" opacity="0.5" />
          <ellipse cx="8" cy="8" rx="5.6" ry="2.2" transform="rotate(120 8 8)" opacity="0.35" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "jobs":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M13 8A5 5 0 1 1 8.6 2.7" opacity="0.7" />
          <path d="M13 2.6v3.2h-3.2" opacity="0.5" />
        </svg>
      );
    case "containers":
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="2" y="7" width="4.5" height="4.5" rx="0.5" opacity="0.55" />
          <rect x="9.5" y="7" width="4.5" height="4.5" rx="0.5" opacity="0.7" />
          <rect x="5.75" y="2.4" width="4.5" height="4.5" rx="0.5" opacity="0.4" />
        </svg>
      );
    case "speed":
      return (
        <svg {...commonProps} fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M8.6 1.4 3 9.4h3.6l-.8 5.2 5.2-8.4H7.6z" opacity="0.75" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M8 1.6 13 3.4v4.2c0 3.6-2.2 5.7-5 6.4-2.8-.7-5-2.8-5-6.4V3.4z" opacity="0.65" />
          <path d="M5.8 8l1.6 1.6L10.4 6" opacity="0.5" />
        </svg>
      );
    case "ai":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="3.6" cy="3.6" r="1.3" opacity="0.7" />
          <circle cx="12.4" cy="3.6" r="1.3" opacity="0.7" />
          <circle cx="8" cy="11.22" r="1.3" opacity="0.7" />
          <path d="M4.25 4.73 7.35 10.09M11.75 4.73 8.65 10.09" opacity="0.4" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4.4 2h7.2v3a3.6 3.6 0 0 1-7.2 0V2z" opacity="0.7" />
          <path d="M4.4 3.2H2.6a1.8 1.8 0 0 0 1.8 2.7M11.6 3.2h1.8a1.8 1.8 0 0 1-1.8 2.7" opacity="0.45" />
          <path d="M8 8.6V11M5.4 13.4h5.2" opacity="0.55" />
        </svg>
      );
    case "mark":
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 12 11.6 4.4" opacity="0.7" />
          <path d="M9 2.6l1.7.9.9 1.7L10.3 6.5 8 4.2z" opacity="0.5" />
        </svg>
      );
  }
}
