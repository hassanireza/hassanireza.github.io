import { Phase } from "./Phase";
import { Achievement, Milestone } from "./Achievement";

export interface RoadmapStats {
  xpEarned: number;
  xpTotal: number;
  progressPercent: number;
  level: number;
  phasesCompleted: number;
  phasesTotal: number;
  skillsLearned: number;
  projectsShipped: number;
  achievementsEarned: number;
  achievementsTotal: number;
}

/**
 * Aggregate root that owns the full roadmap definition (phases,
 * achievements, milestones) and derives every statistic the UI needs
 * from a single source of truth: the set of completed phase ids.
 *
 * Keeping this as a class (rather than scattering pure functions)
 * means the level thresholds, xp formula, and derivation rules are
 * defined exactly once and cannot drift between components.
 */
export class RoadmapTrack {
  private static readonly LEVEL_THRESHOLDS = [
    0, 100, 220, 360, 500, 660, 840, 1000, 1200, 1450, 1750, 2200,
  ];

  private readonly phases: ReadonlyArray<Phase>;
  private readonly achievements: ReadonlyArray<Achievement>;
  private readonly milestones: ReadonlyArray<Milestone>;
  public readonly trackName: string;

  constructor(
    trackName: string,
    phases: ReadonlyArray<Phase>,
    achievements: ReadonlyArray<Achievement>,
    milestones: ReadonlyArray<Milestone>
  ) {
    this.trackName = trackName;
    this.phases = phases;
    this.achievements = achievements;
    this.milestones = milestones;
  }

  public getPhases(): ReadonlyArray<Phase> {
    return this.phases;
  }

  public getAchievements(): ReadonlyArray<Achievement> {
    return this.achievements;
  }

  public getMilestones(): ReadonlyArray<Milestone> {
    return this.milestones;
  }

  public findPhase(id: number): Phase | undefined {
    return this.phases.find((phase) => phase.id === id);
  }

  public defaultFocusId(completedIds: ReadonlySet<number>): number {
    const nextPhase = this.phases.find((phase) => !completedIds.has(phase.id));
    return nextPhase ? nextPhase.id : this.phases[this.phases.length - 1].id;
  }

  private levelFor(xp: number): number {
    const thresholds = RoadmapTrack.LEVEL_THRESHOLDS;
    for (let i = thresholds.length - 1; i >= 0; i -= 1) {
      if (xp >= thresholds[i]) return i + 1;
    }
    return 1;
  }

  public computeStats(completedIds: ReadonlySet<number>): RoadmapStats {
    const completed = this.phases.filter((phase) => completedIds.has(phase.id));
    const xpEarned = completed.reduce((sum, phase) => sum + phase.xp, 0);
    const xpTotal = this.phases.reduce((sum, phase) => sum + phase.xp, 0);
    const skillsLearned = completed.reduce((sum, phase) => sum + phase.skillCount(), 0);
    const projectsShipped = completed.reduce((sum, phase) => sum + phase.projectCount(), 0);
    const achievementsEarned = this.achievements.filter((achievement) =>
      achievement.isEarnedBy(completed.length, completedIds)
    ).length;

    return {
      xpEarned,
      xpTotal,
      progressPercent: xpTotal === 0 ? 0 : Math.round((xpEarned / xpTotal) * 100),
      level: this.levelFor(xpEarned),
      phasesCompleted: completed.length,
      phasesTotal: this.phases.length,
      skillsLearned,
      projectsShipped,
      achievementsEarned,
      achievementsTotal: this.achievements.length,
    };
  }
}
