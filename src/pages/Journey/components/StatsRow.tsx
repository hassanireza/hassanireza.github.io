import type { RoadmapStats } from "../domain/RoadmapTrack";
import "./StatsRow.css";

interface StatsRowProps {
  stats: RoadmapStats;
}

export function StatsRow({ stats }: StatsRowProps) {
  const cards = [
    { label: "Phases done", value: `${stats.phasesCompleted}/${stats.phasesTotal}` },
    { label: "Skills learned", value: stats.skillsLearned },
    { label: "Projects built", value: stats.projectsShipped },
    { label: "Achievements", value: `${stats.achievementsEarned}/${stats.achievementsTotal}` },
  ];

  return (
    <section className="stats-row" aria-label="Progress summary">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </section>
  );
}
