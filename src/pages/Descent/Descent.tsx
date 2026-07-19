import { useRef } from "react";
import { chambers } from "./data/chambers";
import { useDepthScrollPhysics } from "./hooks/useDepthScrollPhysics";
import { DepthGauge } from "./components/DepthGauge";
import { DepthMask } from "./components/DepthMask";
import { ParticleField } from "./components/ParticleField";
import { OceanTexture } from "./components/OceanTexture";
import { WaterDistortion } from "./components/WaterDistortion";
import { SunRays } from "./components/SunRays";
import { Hero } from "./components/Hero";
import { Chamber } from "./components/Chamber";
import { Thread } from "./components/Thread";
import { Surface } from "./components/Surface";
import { Footer } from "./components/Footer";
import { HomeLink } from "./components/HomeLink";
import "./Descent.css";

export default function Descent() {
  const rigRef = useRef<HTMLDivElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);

  // Note: progress is intentionally NOT held in React state at this
  // level. It's written to an external store (state/progressStore.ts)
  // on every scroll-physics tick and read directly by the few leaf
  // components that need it (SunRays, DepthMask, DepthGauge, Footer)
  // via useProgress(). Wiring it through state/props here would
  // re-render this entire tree - Hero, every Chamber, Thread, and
  // Surface - 60+ times a second.
  useDepthScrollPhysics({
    rigRef,
    turbulenceRef,
    displacementRef,
  });

  return (
    <div className="descent-page">
      <WaterDistortion turbulenceRef={turbulenceRef} displacementRef={displacementRef} />

      <SunRays />
      <OceanTexture />
      <ParticleField />
      <div id="depth-gradient" aria-hidden="true" />
      <DepthMask />
      <HomeLink />
      <DepthGauge />

      {/* Physics rig: the document no longer scrolls at all
          (useDepthScrollPhysics owns wheel/touch/keyboard input and sets
          html/body to overflow:hidden). OceanTexture stays outside this
          wrapper, fixed to the viewport like the darkening mask above it
          - it's ambient atmosphere, not page content, so it doesn't need
          to physically scroll away, and #depth-mask (already correctly
          bound to real-time progress) stays the single source of truth
          for darkening rather than fighting a second one. */}
      <div className="scroll-rig" ref={rigRef}>
        <main>
          <Hero />

          {chambers.map((chamber, i) => (
            <div key={chamber.id}>
              <Thread />
              <Chamber chamber={chamber} />
              {i === chambers.length - 1 && <Thread />}
            </div>
          ))}

          <Surface />
          <Footer />
        </main>
      </div>
    </div>
  );
}
