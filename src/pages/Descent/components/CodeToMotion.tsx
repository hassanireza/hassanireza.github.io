import { useEffect, useRef, useState } from "react";
import { useReveal } from "../hooks/useReveal";

const SNIPPET = [
  "const ease = cubicBezier(.16, .4, .15, 1);",
  "",
  "el.animate([",
  "  { transform: 'translateY(18px)', opacity: 0 },",
  "  { transform: 'translateY(0)',    opacity: 1 }",
  "], { duration: 900, easing: ease });",
];

/**
 * Types out a real animation snippet character by character, then plays
 * the exact motion it describes on a live element beside it. The point
 * isn't the code, it's making the translation from "timing on a graph
 * editor" to "timing in a keyframe array" visible and literal.
 */
export function CodeToMotion() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const [typedLines, setTypedLines] = useState<string[]>(
    SNIPPET.map(() => "")
  );
  const [activeLine, setActiveLine] = useState(0);
  const [demoKey, setDemoKey] = useState(0);
  const hasTyped = useRef(false);

  useEffect(() => {
    if (!visible || hasTyped.current) return;
    hasTyped.current = true;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setTypedLines(SNIPPET);
      setActiveLine(-1);
      setDemoKey((k) => k + 1);
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let raf = 0;
    let lastTime = 0;
    const msPerChar = 14;

    const tick = (time: number) => {
      if (time - lastTime >= msPerChar) {
        lastTime = time;
        if (lineIndex < SNIPPET.length) {
          const line = SNIPPET[lineIndex];
          charIndex++;
          setActiveLine(lineIndex);
          setTypedLines((prev) => {
            const next = [...prev];
            next[lineIndex] = line.slice(0, charIndex);
            return next;
          });
          if (charIndex >= line.length) {
            lineIndex++;
            charIndex = 0;
          }
        }
      }
      if (lineIndex < SNIPPET.length) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setActiveLine(-1);
        setDemoKey((k) => k + 1);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <div className="code-to-motion" ref={ref}>
      <pre className="code-panel" aria-hidden="true">
        <code>
          {typedLines.map((line, i) => (
            <div className="code-line" key={i}>
              <span className="code-line-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{line}</span>
              {i === activeLine && <span className="caret" />}
            </div>
          ))}
        </code>
      </pre>
      <div className="motion-panel">
        <div className="motion-target" key={demoKey}>
          <span>renders</span>
        </div>
      </div>
    </div>
  );
}
