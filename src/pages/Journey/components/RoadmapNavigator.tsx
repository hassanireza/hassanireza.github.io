import { Phase } from "../domain/Phase";
import "./RoadmapNavigator.css";

interface RoadmapNavigatorProps {
  phases: ReadonlyArray<Phase>;
  focusId: number;
  onNavigate: (phaseId: number) => void;
}

export function RoadmapNavigator({ phases, focusId, onNavigate }: RoadmapNavigatorProps) {
  const currentPhase = phases.find((phase) => phase.id === focusId);
  const canGoPrev = focusId > 0;
  const canGoNext = focusId < phases.length - 1;

  return (
    <nav className="roadmap-navigator" aria-label="Phase navigation">
      <button
        className="nav-btn"
        disabled={!canGoPrev}
        onClick={() => onNavigate(focusId - 1)}
        aria-label="Go to previous phase"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
        </svg>
        Prev
      </button>
      <div className="nav-status">
        <span>
          Phase {focusId + 1} of {phases.length}
        </span>
        <strong>{currentPhase?.title}</strong>
      </div>
      <button
        className="nav-btn"
        disabled={!canGoNext}
        onClick={() => onNavigate(focusId + 1)}
        aria-label="Go to next phase"
      >
        Next
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 7.25a.75.75 0 0 0 0 1.5h8.44l-3.72 3.72a.75.75 0 1 0 1.06 1.06l5-5a.75.75 0 0 0 0-1.06l-5-5a.75.75 0 1 0-1.06 1.06l3.72 3.72H3z" />
        </svg>
      </button>
    </nav>
  );
}
