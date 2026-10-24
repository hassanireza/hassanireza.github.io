import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import ProjectGrid from "../../components/ProjectGrid/ProjectGrid";
import VideoModal from "../../components/VideoModal/VideoModal";
import ScrollProgress from "../../components/ScrollProgress/ScrollProgress";
import PortfolioBackdrop from "../../components/PortfolioBackdrop/PortfolioBackdrop";
import PortfolioRail from "../../components/PortfolioRail/PortfolioRail";
import { useScrollSpy } from "../../hooks/useReveal";
import type { Category, Project, SiteConfig } from "../../types/project";
import "./Portfolio.css";

const FALLBACK_CONFIG: SiteConfig = {
  portfolioTitle: "Reza Hassani’s Portfolio",
  portfolioTagline:
    "Front-end engineering and motion design: selected builds, from full-stack Django apps to hand-animated interaction work.",
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Projects, categories, and the title/tagline above all live in
 * /public/data/*.json and are fetched at runtime rather than imported
 * as source. That is what lets the admin dashboard (/portfolio/admin)
 * publish a new project or edit the tagline by committing a JSON file
 * through the GitHub API, with the change visible on next page load
 * and no rebuild required.
 */
export default function Portfolio() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [config, setConfig] = useState<SiteConfig>(FALLBACK_CONFIG);
  const [playing, setPlaying] = useState<Project | null>(null);
  const [railVisible, setRailVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLElement>(null);

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

  /**
   * Only categories that actually hold projects become chapters, numbered in
   * order. An empty category (just created in the admin, or its last project
   * deleted) therefore never renders as a hollow section.
   */
  const sections = useMemo(() => {
    if (!projects || !categories) return [];
    return categories
      .map((cat) => ({ cat, items: projects.filter((p) => p.category === cat.id) }))
      .filter((s) => s.items.length > 0)
      .map((s, i) => ({
        id: s.cat.id,
        index: pad(i + 1),
        title: s.cat.label,
        blurb: s.cat.blurb,
        projects: s.items,
      }));
  }, [projects, categories]);

  const loading = projects === null || categories === null;
  const total = sections.reduce((sum, s) => sum + s.projects.length, 0);

  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const spyId = useScrollSpy(ids);
  const activeId = ids.includes(spyId) ? spyId : ids[0] ?? "";

  const goTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The floating rail only appears once the hero's own index is behind you.
  useEffect(() => {
    const node = indexRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setRailVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".pf-eyebrow", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 })
        .fromTo(
          ".pf-hero-line",
          { autoAlpha: 0, y: 34, filter: "blur(6px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.14 },
          "-=0.45",
        )
        .fromTo(".pf-hero-sub", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9 }, "-=0.6")
        .fromTo(".pf-stats", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.6")
        .fromTo(".pf-index", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1 }, "-=0.9");
    }, hero);

    return () => ctx.revert();
  }, []);

  const [titleStart, titleEm] = useMemo(() => {
    const idx = config.portfolioTitle.lastIndexOf(" ");
    if (idx === -1) return [config.portfolioTitle, ""];
    return [config.portfolioTitle.slice(0, idx), config.portfolioTitle.slice(idx + 1)];
  }, [config.portfolioTitle]);

  return (
    <>
      <ScrollProgress />
      <PortfolioBackdrop />
      <VideoModal project={playing} onClose={() => setPlaying(null)} />
      <PortfolioRail
        items={sections.map((s) => ({ id: s.id, index: s.index, label: s.title }))}
        activeId={activeId}
        visible={railVisible}
        onSelect={goTo}
      />

      <div className="pf-page">
        <Link to="/" className="pf-back">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Home
        </Link>

        <header ref={heroRef} className="pf-hero">
          <div className="pf-hero-copy">
            <span className="pf-eyebrow">Selected Works</span>
            <h1 className="pf-hero-title">
              <span className="pf-hero-line">{titleStart}</span>
              {titleEm && <span className="pf-hero-line pf-hero-line-em">{titleEm}</span>}
            </h1>
            <p className="pf-hero-sub">{config.portfolioTagline}</p>

            <div className="pf-stats">
              <div>
                <strong>{loading ? "--" : pad(total)}</strong>
                <span>Works</span>
              </div>
              <div>
                <strong>{loading ? "--" : pad(sections.length)}</strong>
                <span>Disciplines</span>
              </div>
              <a
                className="pf-stats-link"
                href="https://hassanireza.github.io/descent"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>The Descent</span>
                <em>Career roadmap</em>
              </a>
            </div>
          </div>

          <aside ref={indexRef} className="pf-index" aria-label="Portfolio index">
            <div className="pf-index-head">
              <span>Index</span>
              <span>{loading ? "--" : `${pad(total)} works`}</span>
            </div>
            <ol>
              {loading
                ? [0, 1, 2, 3].map((i) => (
                    <li key={i} className="pf-index-skeleton" aria-hidden="true">
                      <span />
                    </li>
                  ))
                : sections.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="pf-index-row" onClick={() => goTo(s.id)}>
                        <span className="pf-index-num">{s.index}</span>
                        <span className="pf-index-label">{s.title}</span>
                        <span className="pf-index-count">{pad(s.projects.length)}</span>
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M8 2.5a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 8 2.5Z" />
                        </svg>
                      </button>
                    </li>
                  ))}
            </ol>
          </aside>
        </header>

        {loading && (
          <div className="pf-skeleton-grid" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pf-skeleton-card" />
            ))}
          </div>
        )}

        {!loading && sections.length === 0 && (
          <p className="pf-empty">New work is on its way. Check back soon.</p>
        )}

        {sections.map((section) => (
          <ProjectGrid
            key={section.id}
            id={section.id}
            index={section.index}
            title={section.title}
            blurb={section.blurb}
            projects={section.projects}
            onPlay={setPlaying}
          />
        ))}

        <footer className="pf-footer">
          <div className="pf-footer-cta">
            <span className="pf-eyebrow">Next</span>
            <p className="pf-footer-line">
              Open to front-end and <em>UI/UX</em> collaborations.
            </p>
            <Link to="/contact" className="pf-footer-button">
              Start a conversation
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8a.75.75 0 0 1 .75-.75h6.69L7.72 4.53a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06l2.72-2.72H3.75A.75.75 0 0 1 3 8Z" />
              </svg>
            </Link>
          </div>
          <nav className="pf-footer-links" aria-label="Elsewhere">
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
