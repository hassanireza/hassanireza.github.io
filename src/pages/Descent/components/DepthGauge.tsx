import { useMemo } from "react";
import { useProgress } from "../hooks/useProgress";

const MAX_FATHOM = 3000;
const MAJOR_STEP = 500;
const TICK_STEP = 100;

export function DepthGauge() {
  const progress = useProgress();
  const ticks = useMemo(() => {
    const items: { pct: number; major: boolean; fathom: number }[] = [];
    for (let f = 0; f <= MAX_FATHOM; f += TICK_STEP) {
      items.push({
        pct: (f / MAX_FATHOM) * 100,
        major: f % MAJOR_STEP === 0,
        fathom: f,
      });
    }
    return items;
  }, []);

  const markerPct = progress * 100;
  const fathoms = Math.round(progress * MAX_FATHOM);

  return (
    <nav id="gauge" aria-hidden="true">
      <div className="rail">
        {ticks.map((t) => (
          <div key={t.fathom} className={`tick${t.major ? " major" : ""}`} style={{ top: `${t.pct}%` }}>
            {t.major && (
              <span className="tick-label">
                {t.fathom}
                {t.fathom === 0 ? " ftm" : ""}
              </span>
            )}
          </div>
        ))}
        <div className="marker" style={{ top: `${markerPct}%` }} />
        <div className="marker-label" style={{ top: `${markerPct}%` }}>
          {fathoms} ftm
        </div>
      </div>
    </nav>
  );
}
