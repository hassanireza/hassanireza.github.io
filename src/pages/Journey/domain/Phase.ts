/**
 * Domain model representing a single phase in a learning roadmap.
 * Encapsulates state derivation logic (locked / active / completed)
 * so consuming components never compute status themselves.
 */
export interface PhaseData {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  xp: number;
  skills: string[];
  projects: string[];
}

export type PhaseStatus = "locked" | "active" | "completed";

export class Phase {
  public readonly id: number;
  public readonly title: string;
  public readonly subtitle: string;
  public readonly icon: string;
  public readonly xp: number;
  public readonly skills: ReadonlyArray<string>;
  public readonly projects: ReadonlyArray<string>;

  constructor(data: PhaseData) {
    this.id = data.id;
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.icon = data.icon;
    this.xp = data.xp;
    this.skills = Object.freeze([...data.skills]);
    this.projects = Object.freeze([...data.projects]);
  }

  public statusFor(completedIds: ReadonlySet<number>): PhaseStatus {
    if (completedIds.has(this.id)) return "completed";
    const isUnlocked = this.id === 0 || completedIds.has(this.id - 1);
    return isUnlocked ? "active" : "locked";
  }

  public isUnlockedFor(completedIds: ReadonlySet<number>): boolean {
    return this.statusFor(completedIds) !== "locked";
  }

  public skillCount(): number {
    return this.skills.length;
  }

  public projectCount(): number {
    return this.projects.length;
  }
}
