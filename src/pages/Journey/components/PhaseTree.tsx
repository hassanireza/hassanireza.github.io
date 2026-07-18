import { Phase } from "../domain/Phase";
import { PhaseNode } from "./PhaseNode";
import "./PhaseTree.css";

interface PhaseTreeProps {
  phases: ReadonlyArray<Phase>;
  completedIds: ReadonlySet<number>;
  focusId: number;
  onComplete: (phaseId: number) => void;
  onFocus: (phaseId: number) => void;
}

export function PhaseTree({ phases, completedIds, focusId, onComplete, onFocus }: PhaseTreeProps) {
  return (
    <section className="phase-tree" aria-label="Skill tree phases">
      {phases.map((phase, index) => {
        const status = phase.statusFor(completedIds);
        return (
          <div className="phase-row" key={phase.id}>
            <div className="connector">
              {index > 0 && <div className={`conn-line${status !== "locked" ? " done" : ""}`} />}
              <div className={`conn-dot${status === "completed" ? " done" : ""}`} />
              {index < phases.length - 1 && <div className="conn-line conn-line-next" />}
            </div>
            <PhaseNode
              phase={phase}
              status={status}
              isFocused={focusId === phase.id}
              onComplete={onComplete}
              onFocus={onFocus}
            />
          </div>
        );
      })}
    </section>
  );
}
