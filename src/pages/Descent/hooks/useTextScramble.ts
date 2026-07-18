import { useEffect, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#________";

/**
 * Resolves a target string from random glyphs into the final text, once,
 * on mount. A small flourish that shows animation-timing sense translated
 * directly into code rather than a canned CSS keyframe.
 */
export function useTextScramble(target: string, durationMs = 900): string {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    let raf = 0;
    const totalFrames = Math.max(24, Math.round(durationMs / 16));

    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * target.length);

      let next = "";
      for (let i = 0; i < target.length; i++) {
        const char = target[i];
        if (char === " ") {
          next += " ";
        } else if (i < revealCount) {
          next += char;
        } else {
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setDisplay(next);

      if (frame < totalFrames) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}
