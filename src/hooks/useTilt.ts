import { useEffect, useRef } from "react";

interface TiltOptions {
  /** Max rotation in degrees. */
  max?: number;
  /** How far inner layers translate on Z, scales the whole depth effect. */
  depth?: number;
}

/**
 * Pointer-driven 3D tilt. Writes CSS custom properties (--rx, --ry, --mx,
 * --my) onto the element every frame via rAF instead of touching React
 * state, so hover motion never re-renders the component tree. Consumer CSS
 * reads these vars to rotate the card and to position a spotlight/parallax
 * layers, giving the illusion of real depth without any 3D library.
 *
 * No-ops on touch devices and under prefers-reduced-motion.
 */
export function useTilt<T extends HTMLElement>({ max = 10, depth = 1 }: TiltOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    let frame = 0;
    let targetRx = 0;
    let targetRy = 0;
    let targetMx = 50;
    let targetMy = 50;
    let curRx = 0;
    let curRy = 0;
    let curMx = 50;
    let curMy = 50;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      curRx = lerp(curRx, targetRx, 0.12);
      curRy = lerp(curRy, targetRy, 0.12);
      curMx = lerp(curMx, targetMx, 0.15);
      curMy = lerp(curMy, targetMy, 0.15);

      node.style.setProperty("--rx", curRx.toFixed(3));
      node.style.setProperty("--ry", curRy.toFixed(3));
      node.style.setProperty("--mx", `${curMx.toFixed(2)}%`);
      node.style.setProperty("--my", `${curMy.toFixed(2)}%`);
      node.style.setProperty("--depth", String(depth));

      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetRy = (px - 0.5) * max * 2;
      targetRx = (0.5 - py) * max * 2;
      targetMx = px * 100;
      targetMy = py * 100;
      node.classList.add("is-tilting");
    };

    const onLeave = () => {
      targetRx = 0;
      targetRy = 0;
      targetMx = 50;
      targetMy = 50;
      node.classList.remove("is-tilting");
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [max, depth]);

  return ref;
}
