import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import ProjectGrid from "../../components/ProjectGrid/ProjectGrid";
import VideoModal from "../../components/VideoModal/VideoModal";
import ScrollProgress from "../../components/ScrollProgress/ScrollProgress";
import PortfolioBackdrop from "../../components/PortfolioBackdrop/PortfolioBackdrop";
import SectionNav, { type SectionNavItem } from "../../components/SectionNav/SectionNav";
import type { Category, Project, SiteConfig } from "../../types/project";
import "./Portfolio.css";

const FALLBACK_CONFIG: SiteConfig = {
  portfolioTitle: "Reza Hassani\u2019s Portfolio",
  portfolioTagline:
    "Front-end engineering and motion design: selected builds, from full-stack Django apps to hand-animated interaction work.",
};

/**
 * Projects, categories, and the title/tagline above all live in
 * /public/data/*.json and are fetched at runtime rather than imported
 * as source - that's what lets the admin dashboard (/portfolio/admin)
 * publish a new project or edit the tagline by committing a JSON file
 * through the GitHub API, with the change visible on next page load
 * and no rebuild required.
 */
export default function Portfolio() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [config, setConfig] = useState<SiteConfig>(FALLBACK_CONFIG);
  const [playing, setPlaying] = useState<Project | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;

    Promise.all([
      fetch(`${base}data/projects.json`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${base}data/categories.json`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${base}data/site-config.json`).then((r) => (r.ok ? r.json() : FALLBACK_CONFIG)),
    ])
      .then(([projectsData, categoriesData, configData]) => {
        if (cancelled) return;
        setProjects(projectsData);
        setCategories(categoriesData);
        setConfig({ ...FALLBACK_CONFIG, ...configData });
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    if (!projects || !categories) return [];
    return categories.map((cat, i) => ({
      id: cat.id,
      index: String(i + 1).padStart(2, "0"),
      navLabel: cat.label,
      navIcon: cat.icon,
      title: cat.label,
      projects: projects.filter((p) => p.category === cat.id),
    }));
  }, [projects, categories]);

  function handlePlay(project: Project) {
    setPlaying(project);
  }

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".hero-eyebrow",
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.8 },
      )
        .fromTo(
          ".hero-title-line",
          { autoAlpha: 0, y: 34, filter: "blur(6px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.12 },
          "-=0.45",
        )
        .fromTo(
          ".hero-sub",
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.9 },
          "-=0.6",
        )
        .fromTo(
          ".hero-meta",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.8 },
          "-=0.55",
        );
    }, hero);

    return () => ctx.revert();
  }, [config]);

  const [titleStart, titleEm] = useMemo(() => {
    const idx = config.portfolioTitle.lastIndexOf(" ");
    if (idx === -1) return [config.portfolioTitle, ""];
    return [config.portfolioTitle.slice(0, idx + 1), config.portfolioTitle.slice(idx + 1)];
  }, [config.portfolioTitle]);

  return (
    <>
      <ScrollProgress />
      <PortfolioBackdrop />
      <VideoModal project={playing} onClose={() => setPlaying(null)} />

      <div className="container">
        <Link to="/" className="back-link">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Home
        </Link>

        <header ref={heroRef} className="hero">
          <span className="hero-eyebrow">Selected Works</span>
          <h1>
            <span className="hero-title-line">
              {titleStart}
              <em>{titleEm}</em>
            </span>
          </h1>
          <p className="hero-sub">{config.portfolioTagline}</p>
          <div className="hero-meta">
            <span>{(projects ?? []).length} projects</span>
            <span className="dot" />
            <span>{sections.length} disciplines</span>
            <span className="dot" />
            <a href="https://hassanireza.github.io/descent" target="_blank" rel="noopener noreferrer">
              The Descent &middot; Career Roadmap
            </a>
          </div>
        </header>

        <SectionNav
          items={sections.map((s) => ({ id: s.id, label: s.navLabel, icon: s.navIcon as SectionNavItem["icon"] }))}
        />

        {sections.map((section) => (
          <ProjectGrid
            key={section.id}
            id={section.id}
            index={section.index}
            title={section.title}
            projects={section.projects}
            onPlay={handlePlay}
          />
        ))}

        <footer className="site-footer">
          <p className="footer-line">Open to front-end and UI/UX collaborations.</p>
          <nav className="footer-links">
            <Link to="/contact">Contact</Link>
            <Link to="/branding">Branding</Link>
            <a href="mailto:hassanireza@att.net">Email</a>
            <a href="https://github.com/hassanireza" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </footer>
      </div>
    </>
  );
}
