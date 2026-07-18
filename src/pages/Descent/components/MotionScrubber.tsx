import { useEffect, useRef } from "react";

/**
 * A scroll-scrubbed canvas animation: as the user scrolls through this
 * chamber, a ball plays through a squash-and-stretch bounce cycle keyed
 * directly to scroll position, the same "scrub the timeline by hand"
 * technique used for the motion-graphics showreel on the main site,
 * rebuilt here from primitives instead of a video file. It's a working
 * demonstration of animation principles (anticipation, squash & stretch,
 * ease-in/ease-out) expressed as code rather than as a rendered clip.
 */
export function MotionScrubber() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(lastProgress);
    };

    // easeOutBounce: classic animation-curve math, driven by hand instead
    // of a library, mirrors the timing sense from After Effects graph editor
    const easeOutBounce = (t: number): number => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) {
        const t2 = t - 1.5 / d1;
        return n1 * t2 * t2 + 0.75;
      }
      if (t < 2.5 / d1) {
        const t2 = t - 2.25 / d1;
        return n1 * t2 * t2 + 0.9375;
      }
      const t2 = t - 2.625 / d1;
      return n1 * t2 * t2 + 0.984375;
    };

    let lastProgress = 0;

    const draw = (progress: number) => {
      lastProgress = progress;
      ctx.clearRect(0, 0, width, height);

      const groundY = height * 0.78;
      const radius = Math.min(width, height) * 0.09;

      // three bounce cycles across the scrub range, each one shorter/lower
      const cycles = [
        { start: 0.0, end: 0.42, peak: 0.62 },
        { start: 0.42, end: 0.72, peak: 0.3 },
        { start: 0.72, end: 1.0, peak: 0.12 },
      ];

      let cycle = cycles[cycles.length - 1];
      for (const c of cycles) {
        if (progress >= c.start && progress <= c.end) {
          cycle = c;
          break;
        }
      }

      const localT = Math.min(
        1,
        Math.max(0, (progress - cycle.start) / (cycle.end - cycle.start))
      );

      const bounced = easeOutBounce(localT);
      const arc = Math.sin(localT * Math.PI);
      const y = groundY - arc * cycle.peak * height * (1 - localT * 0.15);
      const isImpact = arc < 0.06;

      const squashX = isImpact ? 1.35 : 1 - arc * 0.18;
      const squashY = isImpact ? 0.62 : 1 + arc * 0.14;

      const x = width * (0.18 + progress * 0.64);

      // ground line
      ctx.strokeStyle = "rgba(233,228,218,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // contact shadow, widens on impact
      const shadowScale = isImpact ? 1.3 : 1 - arc * 0.5;
      ctx.beginPath();
      ctx.ellipse(
        x,
        groundY + 4,
        radius * 1.1 * shadowScale,
        radius * 0.28 * shadowScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      // the ball, squash & stretch applied on the ellipse radii
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        radius * squashX,
        radius * squashY,
        0,
        0,
        Math.PI * 2
      );
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.3,
        radius * 0.1,
        x,
        y,
        radius * 1.4
      );
      gradient.addColorStop(0, "rgba(159,201,178,0.95)");
      gradient.addColorStop(1, "rgba(60,75,70,0.85)");
      ctx.fillStyle = gradient;
      ctx.fill();

      void bounced;
    };

    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // progress = 0 when the wrap enters the bottom of the viewport,
      // 1 when it exits the top, i.e. scrubbed purely by scroll position
      const total = rect.height + viewportH;
      const traveled = viewportH - rect.top;
      const progress = Math.min(1, Math.max(0, traveled / total));
      draw(progress);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // Polled via rAF rather than a native "scroll" event: the roadmap
    // page fully virtualizes scrolling (see useDepthScrollPhysics), so
    // the document itself never actually scrolls and never dispatches
    // scroll events. getBoundingClientRect() still correctly reflects
    // the physics rig's transform every frame, so polling it directly
    // works regardless of how scrolling is implemented.
    let rafId = 0;
    const frame = () => {
      onScroll();
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="motion-scrubber" ref={wrapRef}>
      <canvas ref={canvasRef} />
      <span className="motion-scrubber-caption">
        scroll-scrubbed &middot; squash &amp; stretch, coded by hand
      </span>
    </div>
  );
}
