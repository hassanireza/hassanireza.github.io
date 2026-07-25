import { Achievement, Milestone } from "../domain/Achievement";
import { JourneyIcon, type JourneyIconName } from "./JourneyIcon";
import "./AchievementsPanel.css";

interface AchievementsPanelProps {
  achievements: ReadonlyArray<Achievement>;
  milestones: ReadonlyArray<Milestone>;
  completedCount: number;
  completedIds: ReadonlySet<number>;
}

export function AchievementsPanel({
  achievements,
  milestones,
  completedCount,
  completedIds,
}: AchievementsPanelProps) {
  return (
    <aside className="achievements-panel" aria-label="Achievements and milestones">
      <h3 className="panel-title">Achievements</h3>
      <div className="ach-list">
        {achievements.map((achievement) => {
          const earned = achievement.isEarnedBy(completedCount, completedIds);
          return (
            <div key={achievement.id} className={`ach-item${earned ? " earned" : ""}`}>
              <div className="ach-icon" aria-hidden="true">
                <JourneyIcon name={achievement.icon as JourneyIconName} />
              </div>
              <div className="ach-name">{achievement.name}</div>
              <div className="ach-desc">{achievement.description}</div>
            </div>
          );
        })}
      </div>

      <div className="milestone-block">
        <h3 className="panel-title">Milestones</h3>
        {milestones.map((milestone) => {
          const hit = milestone.isReachedBy(completedCount);
          return (
            <div key={milestone.label} className={`milestone-item${hit ? " hit" : ""}`}>
              <div className="ms-dot" aria-hidden="true" />
              <span>
                {milestone.label}, {milestone.requiredPhases} phases
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
