import { useReveal } from "../hooks/useReveal";

const PHASES = ["Structure", "Style", "Interaction"];

/**
 * The old version of this animation typed a snippet once, over about a
 * second, and stopped, easy to miss entirely on a page that scrolls at
 * its own pace. This one runs on a slow nine-second loop for as long as
 * the chamber is in view, so there's no window to miss.
 *
 * The direction is different too: rather than code turning into a UI
 * element, this is the browser's own rendering pipeline acting on one
 * small page, structure first (bare outlines, the DOM), then style
 * (fills, radius, elevation, the CSSOM applied), then interaction (a
 * cursor arrives and presses the button), then it resets and does it
 * again. It's the actual three-stage story of what "frontend" means,
 * playing on repeat rather than a single scripted beat.
 */
export function RenderPasses() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);

  return (
    <div className={`render-passes${visible ? " playing" : ""}`} ref={ref}>
      <div className="render-frame">
        <div className="render-frame-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="render-stage" aria-hidden="true">
          <div className="render-block render-block-media" />
          <div className="render-block render-block-title" />
          <div className="render-block render-block-text" />
          <div className="render-block render-block-text render-block-text-short" />
          <div className="render-block render-block-button">
            <span>Enter</span>
          </div>
          <div className="render-cursor" />
        </div>
      </div>

      <div className="render-phase-row" aria-hidden="true">
        {PHASES.map((phase, i) => (
          <span className={`render-phase render-phase-${i + 1}`} key={phase}>
            {phase}
          </span>
        ))}
      </div>
    </div>
  );
}
