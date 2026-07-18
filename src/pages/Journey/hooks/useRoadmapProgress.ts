import { useCallback, useEffect, useMemo, useState } from "react";
import { roadmapTrack } from "../data/roadmapData";
import { ProgressService } from "../services/ProgressService";
import type { ProgressPayload } from "../services/ProgressService";

const service = ProgressService.getInstance();

export function useRoadmapProgress() {
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [meta, setMeta] = useState<ProgressPayload["meta"] | null>(null);
  const [sourceNote, setSourceNote] = useState<string>("Loading progress data...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const baseline = await service.loadBaseline();
      const local = service.readLocal();

      if (cancelled) return;

      setMeta(baseline.meta);

      if (local) {
        setCompletedIds(local);
        setSourceNote(
          "Showing progress saved in this browser. Export progress.json and commit it to make this the permanent baseline."
        );
      } else {
        setCompletedIds(baseline.completedPhases);
        setSourceNote("Loaded starting progress from the committed progress.json baseline.");
        service.persistLocal(baseline.completedPhases);
      }
      setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  const stats = useMemo(() => roadmapTrack.computeStats(completedSet), [completedSet]);

  const completePhase = useCallback(
    (phaseId: number) => {
      const phase = roadmapTrack.findPhase(phaseId);
      if (!phase) return;
      if (completedSet.has(phaseId)) return;
      if (!phase.isUnlockedFor(completedSet)) return;

      const next = [...completedIds, phaseId];
      setCompletedIds(next);
      service.persistLocal(next);
    },
    [completedIds, completedSet]
  );

  const resetProgress = useCallback(() => {
    setCompletedIds([]);
    service.clearLocal();
  }, []);

  const exportProgress = useCallback(() => {
    if (!meta) return;
    const currentPhase = roadmapTrack.defaultFocusId(completedSet);
    const payload = service.buildExportPayload(meta, completedIds, currentPhase);
    service.downloadAsFile(payload);
  }, [meta, completedIds, completedSet]);

  return {
    ready,
    completedIds,
    completedSet,
    stats,
    sourceNote,
    completePhase,
    resetProgress,
    exportProgress,
    defaultFocusId: roadmapTrack.defaultFocusId(completedSet),
  };
}
