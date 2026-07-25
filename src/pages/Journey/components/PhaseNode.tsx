import { useState } from "react";
import { Phase } from "../domain/Phase";
import type { PhaseStatus } from "../domain/Phase";
import { JourneyIcon, type JourneyIconName } from "./JourneyIcon";
import "./PhaseNode.css";

interface PhaseNodeProps {
  phase: Phase;
  status: PhaseStatus;
  isFocused: boolean;
  onComplete: (phaseId: number) => void;
  onFocus: (phaseId: number) => void;
}

const statusLabel: Record<PhaseStatus, string> = {
  completed: "Done",
  active: "In Progress",
  locked: "Locked",
};

export function PhaseNode({ phase, status, isFocused, onComplete, onFocus }: PhaseNodeProps) {
  const [open, setOpen] = useState(isFocused);

  function toggle() {
    setOpen((value) => !value);
    onFocus(phase.id);
  }

  return (
    <div className={`phase-node phase-${status}${isFocused ? " focused" : ""}`} id={`phase-${phase.id}`}>
      <div
        className="phase-node-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <div className={`phase-icon icon-${status}`} aria-hidden="true">
          <JourneyIcon name={phase.icon as JourneyIconName} />
        </div>
        <div className="phase-meta">
          <div className="phase-title">{phase.title}</div>
          <div className="phase-subtitle">{phase.subtitle}</div>
        </div>
        <span className="phase-xp">+{phase.xp}</span>
        <span className={`phase-tag tag-${status}`}>{statusLabel[status]}</span>
      </div>

      {open && (
        <div className="phase-body">
          <div className="phase-section">
            <h4>Skills</h4>
            <div className="skills-wrap">
              {phase.skills.map((skill) => (
                <span key={skill} className={`skill-pill${status === "completed" ? " learned" : ""}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="phase-section">
            <h4>Applied Projects</h4>
            <div className="projects-list">
              {phase.projects.map((project) => (
                <div key={project} className={`project-item${status === "completed" ? " done" : ""}`}>
                  <span className="proj-icon" aria-hidden="true" />
                  {project}
                </div>
              ))}
            </div>
          </div>

          {status === "completed" && (
            <button className="complete-btn done-btn" disabled>
              Phase complete
            </button>
          )}
          {status === "active" && (
            <button
              className="complete-btn"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(phase.id);
              }}
            >
              Mark phase complete
            </button>
          )}
          {status === "locked" && (
            <div className="locked-msg">Complete the previous phase to unlock</div>
          )}
        </div>
      )}
    </div>
  );
}
