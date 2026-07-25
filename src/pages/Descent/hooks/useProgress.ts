import { useSyncExternalStore } from "react";
import { getProgress, subscribe } from "../state/progressStore";

/**
 * Subscribes the calling component to the real-time depth-scroll
 * progress (0..1). Only components that call this re-render when
 * progress changes - the rest of the tree is unaffected. See
 * `state/progressStore.ts` for why this isn't plain React state.
 */
export function useProgress(): number {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}
