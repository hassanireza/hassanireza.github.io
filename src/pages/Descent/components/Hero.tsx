import { useTextScramble } from "../hooks/useTextScramble";

export function Hero() {
  const title = useTextScramble("The Descent", 900);

  return (
    <section className="hero wrap">
      <svg
        className="origin-mark"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="draw"
          cx="50"
          cy="50"
          r="46"
          stroke="currentColor"
          strokeOpacity="0.5"
          style={{ color: "var(--text-3)" }}
        />
        <circle
          className="draw"
          cx="50"
          cy="50"
          r="32"
          stroke="currentColor"
          strokeOpacity="0.35"
          style={{ color: "var(--text-3)" }}
        />
        <circle
          className="draw"
          cx="50"
          cy="50"
          r="18"
          stroke="currentColor"
          strokeOpacity="0.2"
          style={{ color: "var(--text-3)" }}
        />
        <line
          className="draw"
          x1="50"
          y1="4"
          x2="50"
          y2="96"
          stroke="currentColor"
          strokeOpacity="0.25"
          style={{ color: "var(--text-3)" }}
        />
        <line
          className="draw"
          x1="4"
          y1="50"
          x2="96"
          y2="50"
          stroke="currentColor"
          strokeOpacity="0.25"
          style={{ color: "var(--text-3)" }}
        />
      </svg>

      <p className="eyebrow">A Field Record &middot; Reza Hassani</p>
      <h1>
        <span className="scramble-title" aria-label="The Descent">
          {title}
        </span>
      </h1>
      <p className="lede">
        Every career reads like a dive log. Light gives way to motion, motion
        gives way to structure, and structure learns to respond. This is the
        water column I moved through, from flat composition, to timed
        animation, to the engineered logic of the interface, to systems that
        answer back in real time.
      </p>
      <div className="scroll-cue">
        <div className="line" />
        Begin the descent
      </div>
    </section>
  );
}
