import { Link } from "react-router-dom";
import { roadmapTrack } from "./data/roadmapData";
import { cheatSheetCatalog } from "./data/cheatSheetData";
import { useRoadmapProgress } from "./hooks/useRoadmapProgress";
import { HeroDiagram } from "./components/HeroDiagram";
import { JourneyIcon, type JourneyIconName } from "./components/JourneyIcon";
import "./Overview.css";

export default function Overview() {
  const { stats } = useRoadmapProgress();
  const phases = roadmapTrack.getPhases();
  const activePhase = phases[Math.min(stats.phasesCompleted, phases.length - 1)];

  return (
    <div className="overview-page">
      <section className="section hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge-pill">Full Stack Python Developer, in progress</span>
            <h1 className="hero-title">
              A live map of where I stand on the road to full stack and AI engineering.
            </h1>
            <p className="hero-lead">
              This is a single place to see the whole picture: a phase by phase roadmap I designed for
              myself, tracked in public, next to a library of the reference guides I wrote while working
              through it. No slides, no static resume, just the actual state of the skill tree.
            </p>
            <div className="hero-actions">
              <Link to="/journey/roadmap" className="btn btn-primary">
                View the roadmap
              </Link>
              <Link to="/journey/cheatsheets" className="btn">
                Browse cheat sheets
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{stats.phasesCompleted}</strong>
                <span>of {stats.phasesTotal} phases done</span>
              </div>
              <div>
                <strong>{stats.skillsLearned}</strong>
                <span>skills learned</span>
              </div>
              <div>
                <strong>{cheatSheetCatalog.count()}</strong>
                <span>reference guides</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <HeroDiagram />
          </div>
        </div>
      </section>

      <section className="section current-phase-section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Right now</span>
            <h2 className="section-title">Where I currently stand</h2>
            <p className="section-subtitle">
              The roadmap below is self designed and self graded. This is the phase currently active,
              pulled live from the same progress data that drives the full skill tree.
            </p>
          </div>
          <div className="current-phase-card">
            <div className="current-phase-icon" aria-hidden="true">
              <JourneyIcon name={activePhase.icon as JourneyIconName} />
            </div>
            <div className="current-phase-body">
              <span className="badge-pill">
                Phase {activePhase.id + 1} of {phases.length}
              </span>
              <h3>{activePhase.title}</h3>
              <p>{activePhase.subtitle}</p>
              <div className="current-phase-skills">
                {activePhase.skills.map((skill) => (
                  <span key={skill} className="skill-pill">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <Link to="/journey/roadmap" className="btn btn-primary current-phase-cta">
              See full roadmap
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Reference library</span>
            <h2 className="section-title">Cheat sheets, written while learning</h2>
            <p className="section-subtitle">
              Seventeen long form guides covering Django, PostgreSQL, React, Vue, CMS work, and
              infrastructure, kept in one searchable catalog for whenever a detail needs to be looked up
              again.
            </p>
          </div>
          <div className="home-categories">
            {cheatSheetCatalog.categories().map((category) => (
              <span key={category} className="badge-pill category-badge">
                {category}
              </span>
            ))}
          </div>
          <Link to="/journey/cheatsheets" className="btn btn-primary">
            Open the cheat sheet library
          </Link>
        </div>
      </section>
    </div>
  );
}
