/**
 * External store for the real-time (0..1) depth-scroll progress value.
 *
 * Why this exists: `useDepthScrollPhysics` used to hold `progress` in
 * React state and update it via `setProgress` on every single
 * `gsap.ticker` tick (60-120Hz). That state lived in `<App>`, so every
 * tick re-rendered the *entire* app tree - all chambers, threads, and
 * the surface section included - even though none of them read
 * `progress`. That extra reconciliation work each frame was the actual
 * source of the reported lag/jank, not the SVG filter updates (those
 * were already throttled).
 *
 * The fix: move the value outside React entirely. The physics hook
 * pushes updates into this plain module-level store, and only the
 * handful of components that actually render `progress` (DepthGauge,
 * SunRays, Footer, the depth-mask div) subscribe to it via
 * `useProgress()` / `useSyncExternalStore`. Everything else - Hero,
 * Chamber, Thread, Surface, the chambers list - never re-renders
 * because of scroll, at all.
 */

type Listener = () => void;

let value = 0;
const listeners = new Set<Listener>();

export function setProgress(next: number): void {
  if (next === value) return;
  value = next;
  listeners.forEach((listener) => listener());
}

export function getProgress(): number {
  return value;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
