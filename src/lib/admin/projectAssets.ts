import { deleteFile } from "./githubApi";
import type { Project } from "../../types/project";

/** Repo folder that holds every project thumbnail (and motion video). */
export const ASSET_DIR = "public/assets/images";

/**
 * Which asset files become orphans when a project goes away or changes its
 * image. Pure so it can be reasoned about (and tested) on its own.
 *
 * A file is only returned when ALL of these hold:
 *  - it is a bare filename (managed under ASSET_DIR, never a path or URL),
 *  - no remaining project still references it as `img` or `video`.
 *
 * The second rule protects shared files: two projects pointing at one
 * image will not lose it when only one of them is deleted.
 */
export function findOrphanedAssets(
  candidates: Array<string | undefined | null>,
  remaining: Project[],
): string[] {
  const inUse = new Set<string>();
  for (const p of remaining) {
    if (p.img) inUse.add(p.img);
    if (p.video) inUse.add(p.video);
  }
  const unique = new Set<string>();
  for (const name of candidates) {
    if (!name) continue;
    if (name.includes("/") || name.includes("\\") || name.includes("..")) continue;
    if (inUse.has(name)) continue;
    unique.add(name);
  }
  return [...unique];
}

export interface CleanupResult {
  removed: string[];
  failed: string[];
}

/**
 * Deletes orphaned asset files from the repo, one commit each. Best effort:
 * the project list has already been saved by the time this runs, so a
 * failure here leaves a stray file but never a broken site. Failures are
 * reported back rather than thrown.
 */
export async function removeOrphanedAssets(
  token: string,
  candidates: Array<string | undefined | null>,
  remaining: Project[],
  reason: string,
): Promise<CleanupResult> {
  const result: CleanupResult = { removed: [], failed: [] };
  for (const name of findOrphanedAssets(candidates, remaining)) {
    try {
      const existed = await deleteFile(token, `${ASSET_DIR}/${name}`, `Remove asset ${name} (${reason})`);
      if (existed) result.removed.push(name);
    } catch {
      result.failed.push(name);
    }
  }
  return result;
}
