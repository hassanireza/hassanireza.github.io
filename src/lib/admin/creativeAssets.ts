import { deleteFile } from "./githubApi";

/** Repo folder holding one sub-folder per creative work. */
export const CREATIVE_DIR = "public/assets/creative";
export const CREATIVE_DATA_PATH = "public/data/creative-coding.json";

/** Site-relative asset path (as stored in the JSON) -> repo path. */
export const repoPath = (assetPath: string) => `public/${assetPath}`;

/** Folder a work's files live in, as a site-relative path. */
export const workDir = (id: string) => `assets/creative/${id}`;

/**
 * Deletes the given site-relative asset paths from the repo, one commit each.
 * Best effort, like removeOrphanedAssets: by the time this runs the JSON has
 * already been saved, so a failure leaves a stray file but never a broken
 * site. Only paths inside assets/creative/ are ever touched.
 */
export async function removeCreativePaths(
  token: string,
  paths: Array<string | undefined | null>,
  reason: string,
): Promise<{ removed: string[]; failed: string[] }> {
  const result = { removed: [] as string[], failed: [] as string[] };
  const unique = new Set<string>();
  for (const p of paths) {
    if (!p || !p.startsWith("assets/creative/") || p.includes("..")) continue;
    unique.add(p);
  }
  for (const p of unique) {
    try {
      const existed = await deleteFile(token, repoPath(p), `Remove ${p} (${reason})`);
      if (existed) result.removed.push(p);
    } catch {
      result.failed.push(p);
    }
  }
  return result;
}
