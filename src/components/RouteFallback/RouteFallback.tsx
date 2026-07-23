import "./RouteFallback.css";

/**
 * Suspense fallback shown briefly while a lazy-loaded route's JS chunk
 * downloads (see App.tsx). On a fast connection this is rarely even
 * visible; on a slow one, a subtle themed mark beats a blank white/dark
 * flash. Deliberately minimal - no layout to avoid CLS from swapping to
 * the real page content.
 */
export default function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="Loading page">
      <span className="route-fallback-mark" />
    </div>
  );
}
