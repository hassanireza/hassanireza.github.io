import type { RefObject } from "react";

interface WaterDistortionProps {
  turbulenceRef: RefObject<SVGFETurbulenceElement | null>;
  displacementRef: RefObject<SVGFEDisplacementMapElement | null>;
}

/**
 * Hidden SVG filter definition. feTurbulence generates an organic noise
 * field; feDisplacementMap uses it to warp the content underneath, which
 * reads as refraction through moving water rather than a blur. Its
 * attributes are animated at runtime by useDepthScrollPhysics, tied to
 * scroll depth (ambient pressure) and scroll speed (disturbance).
 */
export function WaterDistortion({
  turbulenceRef,
  displacementRef,
}: WaterDistortionProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <filter id="water-distortion" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          ref={turbulenceRef}
          type="fractalNoise"
          baseFrequency="0.006 0.012"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feDisplacementMap
          ref={displacementRef}
          in="SourceGraphic"
          in2="noise"
          scale={2}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
