import { Link } from "react-router-dom";
import { useProgress } from "../hooks/useProgress";

const MAX_FATHOM = 3000;
const ZONE_NAMES = [
  "SUNLIT SURFACE",
  "TWILIGHT ZONE",
  "MIDNIGHT ZONE",
  "THE UNDERCURRENT",
  "THE ABYSS",
];

export function Footer() {
  const progress = useProgress();
  const fathoms = Math.round(progress * MAX_FATHOM);
  const zoneIndex = Math.min(
    ZONE_NAMES.length - 1,
    Math.floor(progress * ZONE_NAMES.length)
  );

  function scrollToTop() {
    // The page never really scrolls here - useDepthScrollPhysics owns a
    // virtual target and drives everything via transform. window.scrollTo
    // would do nothing, so this asks the physics hook to reset its
    // target instead; the existing damped chase then animates it back up
    // smoothly, same as any wheel/touch input would.
    window.dispatchEvent(new Event("descent:scroll-to-top"));
  }

  return (
    <footer className="wrap">
      <button type="button" className="back-to-top" onClick={scrollToTop}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M8 12.5V3.5M3.5 8 8 3.5 12.5 8" />
        </svg>
        Back to surface
      </button>

      <div className="foot-row">
        <span className="foot-note">
          REZA HASSANI &middot; FRONT-END DEVELOPER &middot; UI/UX DESIGNER
          &middot; CREATIVE TECHNOLOGIST
        </span>
        <Link to="/descent/cv" className="foot-note foot-link">
          CURRICULUM VITAE &nbsp;&rarr;
        </Link>
        <span className="foot-note" id="depth-readout">
          {ZONE_NAMES[zoneIndex]} &middot; {fathoms} FTM
        </span>
      </div>
    </footer>
  );
}
