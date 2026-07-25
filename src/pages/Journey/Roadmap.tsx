import { useEffect, useState } from "react";
import { roadmapTrack } from "./data/roadmapData";
import { useRoadmapProgress } from "./hooks/useRoadmapProgress";
import { XpHeader } from "./components/XpHeader";
import { StatsRow } from "./components/StatsRow";
import { RoadmapNavigator } from "./components/RoadmapNavigator";
import { PhaseTree } from "./components/PhaseTree";
import { AchievementsPanel } from "./components/AchievementsPanel";
import "./Roadmap.css";

export default function Roadmap() {
  const {
    ready,
    completedSet,
    stats,
    sourceNote,
    completePhase,
    resetProgress,
    exportProgress,
    defaultFocusId,
  } = useRoadmapProgress();

  const [focusId, setFocusId] = useState(0);
  const phases = roadmapTrack.getPhases();

  useEffect(() => {
    if (ready) setFocusId(defaultFocusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function handleNavigate(phaseId: number) {
    setFocusId(phaseId);
    document.getElementById(`phase-${phaseId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="roadmap-page section">
      <div className="container">
        <XpHeader trackName={roadmapTrack.trackName} stats={stats} />
        <RoadmapNavigator phases={phases} focusId={focusId} onNavigate={handleNavigate} />
        <StatsRow stats={stats} />

        <div className="roadmap-layout">
          <PhaseTree
            phases={phases}
            completedIds={completedSet}
            focusId={focusId}
            onComplete={completePhase}
            onFocus={setFocusId}
          />
          <AchievementsPanel
            achievements={roadmapTrack.getAchievements()}
            milestones={roadmapTrack.getMilestones()}
            completedCount={stats.phasesCompleted}
            completedIds={completedSet}
          />
        </div>

        <div className="roadmap-footer-actions">
          <button className="btn" onClick={exportProgress}>
            Export progress.json
          </button>
          <button className="btn btn-ghost danger" onClick={resetProgress}>
            Reset progress
          </button>
        </div>
        <p className="roadmap-source-note">{sourceNote}</p>
      </div>
    </div>
  );
}
