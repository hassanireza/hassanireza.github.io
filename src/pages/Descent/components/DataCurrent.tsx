import { useEffect, useRef, useState } from "react";
import { useReveal } from "../hooks/useReveal";

const EXCHANGE = [
  { kind: "req", text: "POST /api/sessions" },
  { kind: "req", text: '{ "user": "reza", "action": "descend" }' },
  { kind: "res", text: "200 OK \u00B7 42ms" },
  { kind: "res", text: '{ "status": "persisted" }' },
];

/**
 * The frontend chamber shows a snippet turning directly into what's on
 * screen, one visible layer becoming another. Backend has no screen to
 * land on, so this is built around the opposite idea: a request goes in,
 * and the only proof anything happened is a current that keeps moving
 * afterward, and a record that lights up once the current reaches it.
 *
 * Lines resolve in together rather than typing character by character
 * (that rhythm belongs to the frontend chamber), then the current keeps
 * flowing on a loop, decoupled from the request/response text, the same
 * way a real system keeps serving traffic long after any single request
 * finishes.
 */
export function DataCurrent() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const [settled, setSettled] = useState(false);
  const [flowing, setFlowing] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setSettled(true);
      setFlowing(true);
      return;
    }

    const settleTimer = window.setTimeout(() => setSettled(true), 650);
    const flowTimer = window.setTimeout(() => setFlowing(true), 1500);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(flowTimer);
    };
  }, [visible]);

  return (
    <div className="data-current" ref={ref}>
      <div className="exchange-panel" aria-hidden="true">
        {EXCHANGE.map((line, i) => (
          <div
            className={`exchange-line exchange-${line.kind}${settled ? " in" : ""}`}
            key={i}
            style={{ transitionDelay: `${i * 0.12}s` }}
          >
            <span className="exchange-tag">{line.kind === "req" ? "\u2192" : "\u2190"}</span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>

      <div className="current-panel">
        <div className={`current-track${flowing ? " flowing" : ""}`}>
          <span className="current-dot" style={{ animationDelay: "0s" }} />
          <span className="current-dot" style={{ animationDelay: "0.6s" }} />
          <span className="current-dot" style={{ animationDelay: "1.2s" }} />
          <div className={`db-node${flowing ? " live" : ""}`} aria-hidden="true">
            <span className="db-node-ring" />
            <span className="db-node-ring" />
            <span className="db-node-ring" />
          </div>
        </div>
        <span className="current-label">PERSISTENCE LAYER</span>
      </div>
    </div>
  );
}
