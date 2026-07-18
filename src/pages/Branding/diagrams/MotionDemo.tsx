import { useEffect, useState } from "react";
import { useReveal } from "../../../hooks/useReveal";

interface MotionDemoProps {
  name: string;
  curve: string;
  usage: string;
}

/**
 * Shows the easing curve doing its actual job, not a plotted graph of it.
 *
 * A marker travels the track using the exact cubic-bezier value from the
 * design token, so "Liturgy Ease" visibly settles the way it settles
 * everywhere else on the site. Plays once the row scrolls into view, and
 * again on demand via Replay, so it can be compared curve to curve.
 */
export function MotionDemo({ name, curve, usage }: MotionDemoProps) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const [replayKey, setReplayKey] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRunning(false);
    const raf = window.requestAnimationFrame(() => setRunning(true));
    return () => window.cancelAnimationFrame(raf);
  }, [visible, replayKey]);

  return (
    <div className="motion-demo" ref={ref}>
      <div className="motion-demo-head">
        <strong>{name}</strong>
        <button
          type="button"
          className="motion-replay"
          onClick={() => setReplayKey((key) => key + 1)}
          aria-label={`Replay the ${name} motion`}
        >
          Replay
        </button>
      </div>

      <div className="motion-track">
        <span className="motion-track-start" />
        <span className="motion-track-end" />
        <div
          className={`motion-marker${running ? " run" : ""}`}
          style={{ transitionTimingFunction: curve }}
        />
      </div>

      <div className="motion-meta">
        <span className="mono-cell">{curve}</span>
        <span className="motion-usage">{usage}</span>
      </div>
    </div>
  );
}
