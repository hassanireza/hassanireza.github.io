import { useProgress } from "../hooks/useProgress";

/**
 * Fixed darkening overlay whose opacity tracks scroll depth. Split out
 * of App so this is the only thing that re-renders on scroll here,
 * instead of `progress` living in App state and re-rendering the whole
 * tree every frame.
 */
export function DepthMask() {
  const progress = useProgress();
  return (
    <div
      id="depth-mask"
      aria-hidden="true"
      style={{ opacity: Math.min(progress * 0.94, 0.94) }}
    />
  );
}
