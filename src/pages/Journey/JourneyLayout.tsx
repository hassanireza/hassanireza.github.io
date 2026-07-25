import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import "./Journey.css";

const tabs = [
  { to: "/journey", label: "Overview", end: true },
  { to: "/journey/roadmap", label: "Roadmap" },
  { to: "/journey/cheatsheets", label: "Cheat Sheets" },
];

export default function JourneyLayout() {
  const location = useLocation();
  const isDetailView = location.pathname.startsWith("/journey/cheatsheets/");

  return (
    <div className="journey-page">
      <header className="journey-topbar">
        <div className="journey-topbar-inner">
          <Link to="/" className="journey-back">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
            </svg>
            hassanireza.github.io
          </Link>

          <nav className="journey-tabs" aria-label="My Journey">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => "journey-tab" + (isActive ? " active" : "")}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="journey-main">
        <Outlet />
      </main>

      {!isDetailView && (
        <footer className="journey-footer">
          <div className="journey-footer-inner">
            <p>My Journey - a live, self-graded roadmap and reference library, tracked in public.</p>
            <p className="journey-footer-meta">Part of hassanireza.github.io</p>
          </div>
        </footer>
      )}
    </div>
  );
}
