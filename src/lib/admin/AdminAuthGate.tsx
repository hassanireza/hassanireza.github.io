import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { useGitHubAuth } from "./useGitHubAuth";

type AuthState = ReturnType<typeof useGitHubAuth>["state"];

interface AdminAuthGateProps {
  title: string;
  backTo: string;
  backLabel: string;
  state: AuthState;
  signIn: () => void;
  children: (user: { login: string; avatarUrl?: string }) => ReactNode;
}

/**
 * Shared gate UI for every admin dashboard on this site (Portfolio,
 * The Descent's CV manager, and any future one). Every dashboard uses
 * the exact same GitHub-OAuth state machine (see useGitHubAuth) - this
 * renders the five non-signed-in states identically everywhere, so a
 * dashboard-specific component only ever has to build the actual
 * signed-in content, passed as children.
 */
export default function AdminAuthGate({ title, backTo, backLabel, state, signIn, children }: AdminAuthGateProps) {
  if (state.status === "checking" || state.status === "authorizing") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">{title}</p>
        <p className="admin-status">
          {state.status === "authorizing" ? "Signing you in…" : "Checking session…"}
        </p>
      </div>
    );
  }

  if (state.status === "unauthorized") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">{title}</p>
        <h1>Not authorized</h1>
        <p>
          Signed in as <strong>{state.login}</strong>, but this dashboard only accepts the repo owner's
          GitHub account.
        </p>
        <button type="button" className="admin-btn" onClick={signIn}>
          Try a different account
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">{title}</p>
        <h1>Something went wrong</h1>
        <p className="admin-error">{state.error}</p>
        <button type="button" className="admin-btn" onClick={signIn}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status === "signed-out") {
    return (
      <div className="admin-gate">
        <p className="admin-eyebrow">{title}</p>
        <h1>Sign in to make changes</h1>
        <p>Changes here are committed directly to the live repo, under your own GitHub account.</p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={signIn}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Continue with GitHub
        </button>
        <Link to={backTo} className="admin-back">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to {backLabel}
        </Link>
      </div>
    );
  }

  // signed-in
  return <>{children({ login: state.login ?? "", avatarUrl: state.avatarUrl })}</>;
}
