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

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
  if (!res.ok) throw new GitHubApiError("Could not verify GitHub identity.", res.status);
  return res.json();
}

interface GetFileResult {
  content: string; // decoded text
  sha: string; // required to overwrite the file
}

export async function getFile(token: string, path: string): Promise<GetFileResult | null> {
  const res = await fetch(`${API_ROOT}/contents/${path}?ref=${BRANCH}`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubApiError(`Failed to read ${path}`, res.status);
  const data = await res.json();
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { content, sha: data.sha };
}

/** Writes (creates or updates) a text file, committing directly to BRANCH. */
export async function putTextFile(
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const res = await fetch(`${API_ROOT}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: encoded, branch: BRANCH, sha }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitHubApiError(body.message || `Failed to write ${path}`, res.status);
  }
}

/** Writes a binary file (an uploaded/converted image) from a base64 payload (no data: prefix). */
export async function putBinaryFile(
  token: string,
  path: string,
  base64Content: string,
  message: string,
): Promise<void> {
  const res = await fetch(`${API_ROOT}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64Content, branch: BRANCH }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitHubApiError(body.message || `Failed to upload ${path}`, res.status);
  }
}
