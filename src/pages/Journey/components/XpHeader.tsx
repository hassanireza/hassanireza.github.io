import type { RoadmapStats } from "../domain/RoadmapTrack";
import "./XpHeader.css";

interface XpHeaderProps {
  trackName: string;
  stats: RoadmapStats;
}

export function XpHeader({ trackName, stats }: XpHeaderProps) {
  return (
    <div className="xp-header">
      <div className="xp-header-top">
        <div>
          <p className="eyebrow">My Journey</p>
          <h1 className="xp-title">Skill Tree Roadmap</h1>
          <p className="xp-subtitle">{trackName}</p>
        </div>
        <div className="level-badge">Stage {stats.level}</div>
      </div>

      <div className="xp-track-row">
        <span className="xp-label">
          {stats.xpEarned} / {stats.xpTotal} points
        </span>
        <div
          className="xp-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={stats.xpTotal}
          aria-valuenow={stats.xpEarned}
        >
          <div className="xp-fill" style={{ width: `${stats.progressPercent}%` }} />
        </div>
        <span className="xp-count">{stats.progressPercent}%</span>
      </div>
    </div>
  );
}
