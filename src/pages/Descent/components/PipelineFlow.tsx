import { useEffect, useState, type CSSProperties } from "react";
import { useReveal } from "../hooks/useReveal";

const NODES = [
  { key: "request", label: "REQUEST" },
  { key: "auth", label: "AUTH" },
  { key: "query", label: "QUERY" },
  { key: "response", label: "RESPONSE" },
];

const CYCLE_SECONDS = 3.2;

/**
 * The frontend chamber is a typed snippet turning into a rendered
 * element, text becoming a UI. This chamber has no UI to become, so it
 * deliberately isn't text-based at all: it's a live pipeline diagram.
 * Two pulses are permanently in flight along the same line, request
 * traffic never actually stops, and each node lights up in sequence as
 * a pulse reaches it, timed to the same loop so the whole row reads as
 * one continuous process rather than a single request settling once.
 */
export function PipelineFlow() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const [flowing, setFlowing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 0 : 250;
    const timer = window.setTimeout(() => setFlowing(true), delay);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div className="pipeline-flow" ref={ref}>
      <div className={`pipeline-track${flowing ? " flowing" : ""}`}>
        <div className="pipeline-line" />
        <span className="pipeline-pulse" />
        <span className="pipeline-pulse pipeline-pulse-b" />
        {NODES.map((node, i) => (
          <div className="pipeline-node" key={node.key}>
            <span className="pipeline-node-dot">
              <span
                className="pipeline-node-ring"
                style={{ animationDelay: `${(i * CYCLE_SECONDS) / NODES.length}s` } as CSSProperties}
              />
            </span>
            <span className="pipeline-node-label">{node.label}</span>
          </div>
        ))}
      </div>
      <span className="current-label">Live request pipeline, always in flight</span>
    </div>
  );
}
