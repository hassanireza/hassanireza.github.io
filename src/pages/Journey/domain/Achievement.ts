/**
 * Domain model for an unlockable achievement.
 * The requirement is expressed as a predicate over completed phase ids,
 * keeping evaluation logic colocated with the entity it describes.
 */
export interface AchievementData {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: (completedCount: number, completedIds: ReadonlySet<number>) => boolean;
}

export class Achievement {
  public readonly id: string;
  public readonly name: string;
  public readonly icon: string;
  public readonly description: string;
  private readonly requirement: AchievementData["requirement"];

  constructor(data: AchievementData) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.description = data.description;
    this.requirement = data.requirement;
  }

  public isEarnedBy(completedCount: number, completedIds: ReadonlySet<number>): boolean {
    return this.requirement(completedCount, completedIds);
  }
}

export interface MilestoneData {
  label: string;
  requiredPhases: number;
}

export class Milestone {
  public readonly label: string;
  public readonly requiredPhases: number;

  constructor(data: MilestoneData) {
    this.label = data.label;
    this.requiredPhases = data.requiredPhases;
  }

  public isReachedBy(completedCount: number): boolean {
    return completedCount >= this.requiredPhases;
  }
}
