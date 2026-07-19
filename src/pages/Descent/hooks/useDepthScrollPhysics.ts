import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { setProgress } from "../state/progressStore";

interface DepthScrollPhysicsRefs {
  rigRef: RefObject<HTMLElement | null>;
  turbulenceRef: RefObject<SVGFETurbulenceElement | null>;
  displacementRef: RefObject<SVGFEDisplacementMapElement | null>;
}

// Visual chase: how quickly the on-screen content catches up to the
// (resistance-adjusted) virtual scroll target.
const SURFACE_DAMPING = 0.22;
const ABYSS_DAMPING = 0.05;

// Hard per-frame speed ceiling, in px. Tightens with depth so the visual
// content physically cannot move faster than this regardless of input.
const SURFACE_MAX_STEP = 130;
const ABYSS_MAX_STEP = 16;

// INPUT RESISTANCE: the actual "harder to reach bottom" mechanism. This
// is applied to the raw wheel/touch/key delta itself, before it ever
// becomes the scroll target, not just to the visual chase. At the
// surface a scroll gesture advances you its full distance; by the abyss
// the identical gesture only advances you ~12% as far, so it takes
// noticeably more scrolling effort to cover the same ground the deeper
// you are, the way swimming against real water pressure does.
const SURFACE_RESISTANCE = 1;
const ABYSS_RESISTANCE = 0.12;

const KEY_STEP = 90;
const PAGE_STEP_RATIO = 0.85;

/**
 * Fully virtualized depth-pressure scroll.
 *
 * The document itself no longer scrolls: wheel, touch, and keyboard
 * input are captured directly and accumulated into a virtual target,
 * with resistance applied to the input based on current depth. A
 * separate, faster visual "chase" smooths the on-screen position toward
 * that target (with its own depth-based damping and speed cap), so the
 * page feels both harder to move through (input resistance) and heavier
 * to settle (visual lag) the deeper you go.
 *
 * `progress` is derived from the virtual target directly (not the
 * lagged visual position), so the depth gauge always reflects your real,
 * current input in real time even while the background is still
 * catching up.
 *
 * Falls back to fully normal, native scrolling with no lag, resistance,
 * or distortion when prefers-reduced-motion is set.
 */
export function useDepthScrollPhysics({
  rigRef,
  turbulenceRef,
  displacementRef,
}: DepthScrollPhysicsRefs): void {
  const virtualTarget = useRef(0);
  const current = useRef(0);
  const velocity = useRef(0);
  const distortScale = useRef(0);
  const maxScroll = useRef(1);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      rig.style.position = "relative";
      rig.style.transform = "none";
      const mainEl = rig.querySelector("main");
      if (mainEl instanceof HTMLElement) mainEl.style.filter = "none";
      return;
    }

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // overflow:hidden alone does not stop scrolling on iOS Safari - the
    // page can still rubber-band/bounce natively. With the rig also being
    // transformed by hand every frame below, that native bounce fights
    // the virtual transform and shows up as content jumping/vanishing
    // mid-scroll on mobile. Pinning body to position:fixed removes the
    // native scroll surface entirely so only the virtual transform moves
    // anything.
    const scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    const measure = () => {
      const contentHeight = rig.getBoundingClientRect().height;
      maxScroll.current = Math.max(contentHeight - window.innerHeight, 1);
      virtualTarget.current = Math.min(virtualTarget.current, maxScroll.current);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(rig);
    window.addEventListener("resize", measure);

    const depthOf = (value: number) =>
      Math.min(1, Math.max(0, value / maxScroll.current));

    const applyDelta = (rawDelta: number) => {
      const depth = depthOf(virtualTarget.current);
      const resistance = gsap.utils.interpolate(
        SURFACE_RESISTANCE,
        ABYSS_RESISTANCE,
        depth
      );
      virtualTarget.current = Math.min(
        maxScroll.current,
        Math.max(0, virtualTarget.current + rawDelta * resistance)
      );
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      applyDelta(e.deltaY * unit);
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      const delta = touchY - y;
      touchY = y;
      e.preventDefault();
      applyDelta(delta);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          applyDelta(KEY_STEP);
          break;
        case "ArrowUp":
          e.preventDefault();
          applyDelta(-KEY_STEP);
          break;
        case " ":
        case "PageDown":
          e.preventDefault();
          applyDelta(window.innerHeight * PAGE_STEP_RATIO);
          break;
        case "PageUp":
          e.preventDefault();
          applyDelta(-window.innerHeight * PAGE_STEP_RATIO);
          break;
        case "Home":
          e.preventDefault();
          virtualTarget.current = 0;
          break;
        case "End":
          e.preventDefault();
          virtualTarget.current = maxScroll.current;
          break;
        default:
          break;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    let frameCount = 0;
    let lastWrittenScale = -1;

    const tick = () => {
      frameCount += 1;

      const depth = depthOf(current.current);
      const damping = gsap.utils.interpolate(SURFACE_DAMPING, ABYSS_DAMPING, depth);
      const maxStep = gsap.utils.interpolate(SURFACE_MAX_STEP, ABYSS_MAX_STEP, depth);

      const delta = virtualTarget.current - current.current;
      const step = Math.max(-maxStep, Math.min(maxStep, delta * damping));
      current.current += step;
      velocity.current = step;

      gsap.set(rig, { y: -current.current });

      // Progress (feeding the depth gauge) stays real-time, every frame.
      // This writes to a plain external store, not React state, so it
      // does not trigger a re-render of the whole app tree - only the
      // few components that call useProgress() (DepthGauge, SunRays,
      // Footer, the depth-mask) update.
      setProgress(depthOf(virtualTarget.current));

      // The water-distortion filter is applied via CSS to the entire
      // fixed content layer, so any attribute change on it forces the
      // browser to re-rasterize that whole (large) layer. Updating it
      // every single frame was expensive enough to drop frames, which
      // is what made the rest of the page (including the gauge) look
      // stepped/jumpy under fast scrolling. Writing it every other
      // frame, and only when the value actually moved meaningfully,
      // keeps the visual feel while roughly halving that cost.
      if (frameCount % 2 === 0) {
        const turbulence = turbulenceRef.current;
        const displace = displacementRef.current;
        if (turbulence && displace) {
          const ceiling = 6 + depth * 16;
          const targetScale = Math.min(Math.abs(velocity.current) * 2.4, ceiling);
          const rate = targetScale > distortScale.current ? 0.35 : 0.22;
          distortScale.current += (targetScale - distortScale.current) * rate;
          if (distortScale.current < 0.05) distortScale.current = 0;

          if (Math.abs(distortScale.current - lastWrittenScale) > 0.03) {
            displace.setAttribute("scale", distortScale.current.toFixed(2));
            turbulence.setAttribute(
              "baseFrequency",
              `${(0.007 + depth * 0.01).toFixed(4)} ${(0.014 + depth * 0.016).toFixed(4)}`
            );
            lastWrittenScale = distortScale.current;
          }
        }
      }
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.touchAction = prevBodyTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, [rigRef, turbulenceRef, displacementRef]);
}
