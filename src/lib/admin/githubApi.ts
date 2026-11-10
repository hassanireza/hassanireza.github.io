/**
 * Thin wrapper around the GitHub REST Contents API. Every "save" in the
 * admin dashboard is a real git commit to this repo, made with the
 * logged-in user's own OAuth token - there's no separate database.
 * GitHub itself is the CMS backend: it already has auth, versioning,
 * and (via the existing Actions workflow) a deploy pipeline.
 */

const OWNER = "hassanireza";
const REPO = "hassanireza.github.io";
const BRANCH = "main";
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;

/** Fired when GitHub rejects the sign-in token, so the dashboard can ask to sign in again. */
export const AUTH_EXPIRED_EVENT = "gh-admin-auth-expired";

export const SESSION_EXPIRED_MESSAGE = "Your GitHub session has expired. Sign in again to keep editing.";

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Builds the error for a failed response; a 401 also tells the dashboard to sign out. */
async function failure(res: Response, fallback: string): Promise<GitHubApiError> {
  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    return new GitHubApiError(SESSION_EXPIRED_MESSAGE, 401);
  }
  const body = await res.json().catch(() => ({}));
  return new GitHubApiError(body.message || fallback, res.status);
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Confirms the token actually belongs to the repo owner, not just any GitHub user. */
export async function getAuthenticatedUser(token: string): Promise<{ login: string; avatar_url: string }> {
  const res = await fetch("https://api.github.com/user", { headers: authHeaders(token) });
  if (!res.ok) throw await failure(res, "Could not verify your GitHub identity.");
  return res.json();
}

/** Cheap check that the token still works, run before a long upload so it cannot fail halfway. */
export async function assertSignedIn(token: string): Promise<void> {
  await getAuthenticatedUser(token);
}

export interface RepoEntry {
  name: string;
  path: string;
  sha: string;
  type: string;
}

/** Lists a folder in the repo. A folder that does not exist yet is an empty list. */
export async function listDir(token: string, path: string): Promise<RepoEntry[]> {
  const res = await fetch(`${API_ROOT}/contents/${path}?ref=${BRANCH}`, { headers: authHeaders(token) });
  if (res.status === 404) return [];
  if (!res.ok) throw await failure(res, `Could not read the ${path} folder.`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

interface GetFileResult {
  content: string; // decoded text
  sha: string; // required to overwrite the file
}

export async function getFile(token: string, path: string): Promise<GetFileResult | null> {
  const res = await fetch(`${API_ROOT}/contents/${path}?ref=${BRANCH}`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw await failure(res, `Could not read ${path}.`);
  const data = await res.json();
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { content, sha: data.sha };
}

/**
 * Looks up just the sha of a file without trying to decode its content as
 * UTF-8 text - safe to call on binary files (images), unlike getFile().
 * Returns null if the file doesn't exist yet, so callers can tell "create"
 * apart from "update" and avoid a 422 ("path already exists") or a 409
 * (stale sha) when overwriting an image at the same deterministic path.
 */
export async function getFileSha(token: string, path: string): Promise<string | null> {
  const res = await fetch(`${API_ROOT}/contents/${path}?ref=${BRANCH}`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw await failure(res, `Could not check ${path}.`);
  const data = await res.json();
  return data.sha ?? null;
}

/**
 * Writes (creates or updates) a text file, committing directly to BRANCH.
 * A 409 means our in-memory sha is stale (a previous save actually landed
 * on GitHub even though the response was lost to a network hiccup, or
 * another save happened in between) - we refetch the current sha and
 * retry exactly once with it, instead of surfacing a confusing "save
 * failed" for something that's really just a stale local copy.
 */
export async function putTextFile(
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const write = (withSha?: string) =>
    fetch(`${API_ROOT}/contents/${path}`, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: encoded, branch: BRANCH, sha: withSha }),
    });

  let res = await write(sha);

  if (res.status === 409) {
    const freshSha = await getFileSha(token, path);
    res = await write(freshSha ?? undefined);
  }

  if (!res.ok) throw await failure(res, `Could not save ${path}.`);
}

/**
 * Writes a binary file (an uploaded/converted image) from a base64 payload
 * (no data: prefix). Pass `sha` when overwriting an existing file at this
 * exact path (e.g. replacing a project's image, which reuses the same
 * deterministic filename) - without it GitHub rejects the write with a 422
 * because the path already exists.
 */
export async function putBinaryFile(
  token: string,
  path: string,
  base64Content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const res = await fetch(`${API_ROOT}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64Content, branch: BRANCH, sha }),
  });
  if (!res.ok) throw await failure(res, `Could not upload ${path}.`);
}

/**
 * Deletes a file from BRANCH (a real commit). Resolves to false when the
 * file is already gone (404), so callers can treat "already deleted" as
 * success. GitHub requires the blob sha of the file being removed.
 */
export async function deleteFile(token: string, path: string, message: string, knownSha?: string): Promise<boolean> {
  const sha = knownSha ?? (await getFileSha(token, path));
  if (!sha) return false;
  const res = await fetch(`${API_ROOT}/contents/${path}`, {
    method: "DELETE",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (res.status === 404) return false;
  if (!res.ok) throw await failure(res, `Could not delete ${path}.`);
  return true;
}
