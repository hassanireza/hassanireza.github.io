const STORAGE_KEY = "journey_completed_phases_v1";

export interface ProgressPayload {
  meta: {
    track: string;
    owner?: string;
    totalPhases: number;
    lastUpdated: string;
  };
  completedPhases: number[];
  currentPhase: number;
}

/**
 * Owns all persistence concerns for roadmap progress.
 * On first load it reads the committed progress.json baseline, then
 * layers any local browser progress on top of it. Local progress can
 * be exported back to a progress.json file to become the new
 * committed baseline, mirroring the workflow of the original app.
 */
export class ProgressService {
  private static instance: ProgressService | null = null;

  private constructor() {}

  public static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  public async loadBaseline(): Promise<ProgressPayload> {
    const fallback: ProgressPayload = {
      meta: {
        track: "Full Stack Python Developer",
        totalPhases: 11,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
      completedPhases: [0],
      currentPhase: 1,
    };

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}journey/progress/progress.json`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as ProgressPayload;
        return data;
      }
    } catch {
      /* network unavailable, fall back to baseline below */
    }
    return fallback;
  }

  public readLocal(): number[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  public persistLocal(completedIds: number[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
    } catch {
      /* storage unavailable, progress simply will not persist */
    }
  }

  public clearLocal(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  public buildExportPayload(
    meta: ProgressPayload["meta"],
    completedIds: number[],
    currentPhase: number
  ): ProgressPayload {
    return {
      meta: {
        ...meta,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
      completedPhases: [...completedIds].sort((a, b) => a - b),
      currentPhase,
    };
  }

  public downloadAsFile(payload: ProgressPayload): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "progress.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
