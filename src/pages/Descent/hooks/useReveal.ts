import { useEffect, useRef, useState } from "react";

/**
 * Attaches an IntersectionObserver to the returned ref and flips `visible`
 * to true the first time the element enters the viewport. Used to drive
 * the reveal-on-scroll fade/rise transitions throughout the page.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/**
 * Same as useReveal, but toggles visibility both ways, used for elements
 * (like an entire chamber) that should re-dim when scrolled past.
 *
 * Deliberately NOT threshold-based (% of the element's own height that's
 * visible): on a short mobile viewport, a tall section can cross the
 * whole screen without ever satisfying a 35%-of-itself ratio, so content
 * kept flickering back to its dimmed state mid-scroll. Instead this
 * triggers off a fixed band in the middle of the viewport - independent
 * of how tall the element or the viewport is - so behavior is consistent
 * across section lengths and screen sizes.
 */
export function useActiveInView<T extends HTMLElement>(bandFraction = 0.35) {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const band = Math.min(45, Math.max(5, bandFraction * 100));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setActive(entry.isIntersecting));
      },
      { threshold: 0, rootMargin: `-${band}% 0px -${band}% 0px` }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [bandFraction]);

  return { ref, active };
}
