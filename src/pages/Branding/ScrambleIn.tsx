import { useTextScramble } from "../Descent/hooks/useTextScramble";

/**
 * Wraps the existing Descent text-scramble hook so it only starts once
 * `active` flips true, instead of on mount. Mounting this component for
 * the first time is what starts the resolve animation, so callers should
 * render it conditionally on their own `visible` / `in-view` state.
 */
export function ScrambleIn({ text, active, durationMs = 900 }: { text: string; active: boolean; durationMs?: number }) {
  const display = useTextScramble(active ? text : "", durationMs);
  return <>{active ? display : "\u00A0"}</>;
}
