import { Link } from "react-router-dom";

// The Descent page has no persistent nav of its own (unlike Portfolio /
// Branding, which use SectionNav) - it's a single long scroll with the
// document's real scrolling hijacked by useDepthScrollPhysics. Without
// this, there is no way back to the rest of the site except the
// browser's back button.
export function HomeLink() {
  return (
    <Link to="/" className="home-link" aria-label="Back to home">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12.5 8H3.5M7 4 3.5 8 7 12" />
      </svg>
      <span>Home</span>
    </Link>
  );
}
