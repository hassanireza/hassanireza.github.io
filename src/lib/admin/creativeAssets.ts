import { deleteFile, listDir } from "./githubApi";
import { commit } from "./commitMessages";

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

/**
 * Makes a work's folder match exactly what the work references: every other
 * file in it is deleted (an old video, a renamed code file, a retired preview
 * loop). Pass no `keep` paths to clear the folder entirely, which is what
 * deleting a work does. Best effort like removeCreativePaths: the JSON is
 * already saved, so a failure leaves a stray file but never a broken site.
 */
export async function pruneWorkDir(
  token: string,
  id: string,
  keep: Array<string | undefined | null>,
  title: string,
): Promise<{ removed: string[]; failed: string[] }> {
  const result = { removed: [] as string[], failed: [] as string[] };
  const keepSet = new Set(keep.filter((p): p is string => !!p).map(repoPath));
  let entries;
  try {
    entries = await listDir(token, `${CREATIVE_DIR}/${id}`);
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (entry.type !== "file" || keepSet.has(entry.path)) continue;
    try {
      const existed = await deleteFile(token, entry.path, commit.fileCleanup(entry.name, title), entry.sha);
      if (existed) result.removed.push(entry.name);
    } catch {
      result.failed.push(entry.name);
    }
  }
  return result;
}
