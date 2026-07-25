import { useMemo } from "react";
import { useProgress } from "../hooks/useProgress";

const FATHOM_TO_METERS = 1.8288;
const MAX_FATHOM = 3000; // matches DepthGauge / Footer
const TOTAL_DEPTH_M = MAX_FATHOM * FATHOM_TO_METERS; // ≈ 5486 m

/**
 * Beer-Lambert light attenuation: I(z) = I0 * e^(-k*z). The coefficient
 * is chosen so intensity is ~1% at 200 m, the conventional euphotic-zone
 * limit for clear open ocean water (Jerlov Type I-II): 0.01 = e^(-k*200)
 * => k = ln(100) / 200 ≈ 0.023 per metre. Real oceans lose roughly 99% of
 * surface irradiance by that depth; past it you're in the disphotic
 * ("twilight") zone, and by ~1000 m no surface sunlight reaches at all
 * (the aphotic/"midnight" zone).
 */
const ATTENUATION_K = Math.log(100) / 200;
const VISIBILITY_FLOOR = 0.004;

const BEAMS = [
  { left: "16%", rotate: -15, width: 70, delay: 0 },
  { left: "32%", rotate: -6, width: 46, delay: 1.4 },
  { left: "50%", rotate: 2, width: 96, delay: 0.6 },
  { left: "66%", rotate: 8, width: 54, delay: 2.1 },
  { left: "83%", rotate: 16, width: 66, delay: 0.9 },
];

export function SunRays() {
  const progress = useProgress();
  const intensity = useMemo(() => {
    const depthMeters = progress * TOTAL_DEPTH_M;
    const raw = Math.exp(-ATTENUATION_K * depthMeters);
    return raw < VISIBILITY_FLOOR ? 0 : raw;
  }, [progress]);

  return (
    <div
      id="sun-rays"
      aria-hidden="true"
      style={{ opacity: intensity * 0.85 }}
    >
      {intensity > 0 && (
        <>
          <div className="sun-core" />
          {BEAMS.map((beam) => (
            <div
              key={beam.left}
              className="sun-beam"
              style={{
                left: beam.left,
                width: `${beam.width}px`,
                transform: `rotate(${beam.rotate}deg)`,
                animationDelay: `${beam.delay}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
