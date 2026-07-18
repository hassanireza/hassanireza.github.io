import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Each route gets its own tab icon — a small mark drawn from the same
 * brand mark-system as the rest of the site (see docs/brand/brandbook.html),
 * so the browser tab reflects the mood of the page you're on.
 *
 * The "Add to Home Screen" app icon is separate and stays fixed (see
 * public/site.webmanifest + apple-touch-icon) since OS install icons
 * are set once at install time, not per-route.
 */
const FAVICON_BY_ROUTE: Record<string, string> = {
  "/": "home",
  "/portfolio": "portfolio",
  "/branding": "branding",
  "/contact": "contact",
  "/descent": "descent",
  "/descent/cv": "descent",
  "/journey": "journey",
};

function faviconNameForPath(pathname: string): string {
  if (FAVICON_BY_ROUTE[pathname]) return FAVICON_BY_ROUTE[pathname];
  if (pathname.startsWith("/descent")) return "descent";
  if (pathname.startsWith("/journey")) return "journey";
  return "notfound";
}

export function useRouteFavicon() {
  const { pathname } = useLocation();

  useEffect(() => {
    const name = faviconNameForPath(pathname);
    const base = `${import.meta.env.BASE_URL}assets/favicons/${name}`;

    const updates: Array<[string, string]> = [
      ["favicon-svg", `${base}.svg`],
      ["favicon-ico", `${base}.ico`],
      ["favicon-32", `${base}-32.png`],
      ["favicon-192", `${base}-192.png`],
      ["favicon-512", `${base}-512.png`],
    ];

    for (const [id, href] of updates) {
      const el = document.getElementById(id) as HTMLLinkElement | null;
      if (el) el.href = href;
    }
  }, [pathname]);
}
