import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router doesn't reset scroll position between route changes on its
 * own. Without this, navigating from a scrolled-down page (e.g. clicking
 * "Contact" from the Portfolio footer) lands you at the same scroll offset
 * on the new page instead of the top. Mount once near the root, inside the
 * Router.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
