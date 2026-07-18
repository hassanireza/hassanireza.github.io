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

  return (
    <footer className="wrap">
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
