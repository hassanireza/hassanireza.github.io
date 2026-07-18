import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReveal } from "../hooks/useReveal";

interface Target {
  id: number;
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Every other chamber animation on this page is a scripted playback:
 * it resolves the same way whether or not anyone is watching. That's
 * the wrong idea for the one chamber whose entire subject is "structure
 * that has to respond in real time," so this is the one animation on
 * the page actually driven by the visitor's own pointer, not a timer.
 *
 * A HUD reticle tracks the cursor inside a bounded viewport. Targets
 * spawn on an interval and can be clicked; hits tick the score. An FPS
 * readout jitters in a plausible range to read as a live process rather
 * than a static number. None of this borrows the terminal/typewriter
 * language used for the frontend or backend chambers on purpose, a
 * HUD reads as "running", not "written".
 */
export function GameLoopReticle() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const viewportRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const reduceMotion = useRef(false);

  const [pos, setPos] = useState({ x: 50, y: 42 });
  const [tracking, setTracking] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!visible) return;

    const spawn = () => {
      nextId.current += 1;
      setTargets((prev) => [
        ...prev.slice(-2),
        { id: nextId.current, x: 18 + Math.random() * 64, y: 20 + Math.random() * 60 },
      ]);
    };
    spawn();
    const spawnTimer = window.setInterval(spawn, 2200);

    const fpsTimer = reduceMotion.current
      ? null
      : window.setInterval(() => setFps(58 + Math.round(Math.random() * 3)), 850);

    return () => {
      window.clearInterval(spawnTimer);
      if (fpsTimer) window.clearInterval(fpsTimer);
    };
  }, [visible]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTracking(true);
    setPos({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 2, 98),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98),
    });
  }

  function handleHit(id: number) {
    setScore((s) => s + 1);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="game-loop" ref={ref}>
      <div className="game-hud" aria-hidden="true">
        <span>FPS {fps}</span>
        <span>SCORE {String(score).padStart(2, "0")}</span>
        <span className={`game-hud-live${visible ? " on" : ""}`}>
          <i /> {tracking ? "TRACKING" : "IDLE"}
        </span>
      </div>

      <div
        className="game-viewport"
        ref={viewportRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTracking(false)}
      >
        <span className="game-crosshair game-crosshair-h" />
        <span className="game-crosshair game-crosshair-v" />

        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            className="game-target"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            onClick={() => handleHit(t.id)}
            aria-label="Target"
          />
        ))}

        <div
          className={`game-reticle${tracking ? " tracking" : ""}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
      </div>

      <span className="game-caption">Move inside the frame. Click a target.</span>
    </div>
  );
}
