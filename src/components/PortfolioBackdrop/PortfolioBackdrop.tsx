import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import "./PortfolioBackdrop.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fixed, full-bleed ambient backdrop for the Portfolio page: three soft glow
 * layers drifting at different scroll-scrubbed speeds (parallax depth) plus
 * a slow idle drift so the page never feels static, even at rest. Kept
 * intentionally restrained in line with the Abyssal Liturgy identity —
 * this reads as atmosphere, not decoration.
 */
export default function PortfolioBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = root.querySelectorAll<HTMLElement>(".glow-layer");
    const ctx = gsap.context(() => {
      layers.forEach((layer, i) => {
        const speed = [0.18, 0.32, 0.5][i] ?? 0.3;
        gsap.to(layer, {
          yPercent: -30 * speed * 10,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.2,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="portfolio-backdrop" ref={rootRef} aria-hidden="true">
      <div className="glow-layer glow-a" />
      <div className="glow-layer glow-b" />
      <div className="glow-layer glow-c" />
      <div className="grain-layer" />
    </div>
  );
}
