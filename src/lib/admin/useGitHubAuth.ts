import { useCallback, useEffect, useState } from "react";
import { getAuthenticatedUser, GitHubApiError } from "./githubApi";

/**
 * GitHub OAuth, shared by every admin dashboard on this site (Portfolio
 * at /portfolio/admin, the CV manager at /descent/admin, and any future
 * one) - one login flow, one registered OAuth App, used everywhere.
 *
 * GitHub Pages serves static files only - there's no server here to
 * hold a client secret. Exchanging the OAuth "code" GitHub sends back
 * for an actual access token requires that secret, so that one step is
 * delegated to a tiny external proxy (see ADMIN_SETUP.md for the
 * Cloudflare Worker code and setup). Everything else - the dashboards,
 * the login redirect, every commit - runs entirely client-side.
 *
 * GitHub OAuth Apps only support ONE registered callback URL (see
 * ADMIN_SETUP.md - registered as /portfolio/admin). Since multiple
 * dashboards need to log in, every one of them redirects to that same
 * fixed callback path regardless of where the user actually started,
 * carrying the real starting path in the OAuth `state` param. Once the
 * token exchange completes there, if the user didn't start on
 * /portfolio/admin, this does one client-side redirect back to wherever
 * they actually came from - their session (in sessionStorage) is
 * already in place by then, so the destination dashboard picks it up
 * immediately without a second login round-trip.
 *
 * The token is kept in sessionStorage only (cleared when the tab
 * closes), never localStorage, since it grants write access to the repo.
 */

const CLIENT_ID = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as string | undefined;
const PROXY_URL = import.meta.env.VITE_OAUTH_PROXY_URL as string | undefined;
const STORAGE_KEY = "gh_admin_token";
const REPO_OWNER = "hassanireza";
// Must exactly match the single "Authorization callback URL" registered
// on the GitHub OAuth App (see ADMIN_SETUP.md).
const OAUTH_CALLBACK_PATH = "/portfolio/admin";

interface AuthState {
  status: "checking" | "signed-out" | "authorizing" | "signed-in" | "unauthorized" | "error";
  login?: string;
  avatarUrl?: string;
  error?: string;
}

export function useGitHubAuth() {
  const [state, setState] = useState<AuthState>({ status: "checking" });

  const verify = useCallback(async (token: string) => {
    try {
      const user = await getAuthenticatedUser(token);
      if (user.login.toLowerCase() !== REPO_OWNER.toLowerCase()) {
        sessionStorage.removeItem(STORAGE_KEY);
        setState({ status: "unauthorized", login: user.login });
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, token);
      setState({ status: "signed-in", login: user.login, avatarUrl: user.avatar_url });
    } catch (err) {
      sessionStorage.removeItem(STORAGE_KEY);
      const message = err instanceof GitHubApiError ? err.message : "Could not verify GitHub session.";
      setState({ status: "error", error: message });
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const returnTo = url.searchParams.get("state");

    if (code) {
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());

      if (!PROXY_URL) {
        setState({ status: "error", error: "OAuth proxy URL is not configured (VITE_OAUTH_PROXY_URL)." });
        return;
      }

      setState({ status: "authorizing" });
      fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (!data.access_token) throw new Error(data.error_description || "No token returned.");
          await verify(data.access_token);
          // Bounce back to wherever the user actually started, if that
          // wasn't the fixed OAuth callback path itself. The token is
          // already in sessionStorage by this point, so the destination
          // dashboard's own useGitHubAuth() finds it on mount and skips
          // straight to signed-in - no second login required.
          if (returnTo && returnTo !== window.location.pathname) {
            window.location.href = returnTo;
          }
        })
        .catch((err) => setState({ status: "error", error: err.message }));
      return;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      verify(stored);
    } else {
      setState({ status: "signed-out" });
    }
  }, [verify]);

  const signIn = useCallback(() => {
    if (!CLIENT_ID) {
      setState({ status: "error", error: "GitHub OAuth client ID is not configured (VITE_GITHUB_OAUTH_CLIENT_ID)." });
      return;
    }
    const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "repo",
      state: window.location.pathname,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({ status: "signed-out" });
  }, []);

  const getToken = useCallback(() => sessionStorage.getItem(STORAGE_KEY), []);

  return { state, signIn, signOut, getToken };
}
