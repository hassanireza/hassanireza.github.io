import type { Chamber as ChamberData } from "../data/chambers";
import { useActiveInView, useReveal } from "../hooks/useReveal";
import { SpecimenSvgIcon } from "./SpecimenIcon";
import { MotionScrubber } from "./MotionScrubber";
import { RenderPasses } from "./RenderPasses";
import { PipelineFlow } from "./PipelineFlow";
import { GameLoopReticle } from "./GameLoopReticle";

interface ChamberProps {
  chamber: ChamberData;
}

export function Chamber({ chamber }: ChamberProps) {
  const { ref: sectionRef, active } = useActiveInView<HTMLElement>(0.35);
  const head = useReveal<HTMLDivElement>();
  const title = useReveal<HTMLHeadingElement>();
  const body = useReveal<HTMLParagraphElement>();
  const specimens = useReveal<HTMLDivElement>();

  return (
    <section
      className={`chamber wrap${active ? " active" : ""}`}
      ref={sectionRef}
      id={chamber.id}
    >
      <div
        className={`chamber-head reveal${head.visible ? " visible" : ""}`}
        ref={head.ref}
      >
        <span className="chamber-index">{chamber.index}</span>
        <span className="chamber-zone">{chamber.zoneLabel}</span>
      </div>

      <h2
        className={`reveal d1${title.visible ? " visible" : ""}`}
        ref={title.ref}
      >
        {chamber.title}
      </h2>
      <span className="years">{chamber.subtitle}</span>

      <p
        className={`body-copy reveal d2${body.visible ? " visible" : ""}`}
        ref={body.ref}
      >
        {chamber.body}
      </p>

      {chamber.id === "motion-animation" && <MotionScrubber />}

      <div
        className={`specimens reveal d3${specimens.visible ? " visible" : ""}`}
        ref={specimens.ref}
      >
        {chamber.specimens.map((s) => (
          <div className="specimen" key={s.label}>
            <SpecimenSvgIcon icon={s.icon} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {chamber.id === "frontend" && <RenderPasses />}
      {chamber.id === "backend" && <PipelineFlow />}
      {chamber.id === "game-development" && <GameLoopReticle />}

      <p className={`artifact reveal d3${specimens.visible ? " visible" : ""}`}>
        &ldquo;{chamber.artifact}&rdquo;
      </p>
    </section>
  );
}
