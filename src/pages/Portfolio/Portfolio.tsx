import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import ProjectGrid from "../../components/ProjectGrid/ProjectGrid";
import VideoModal from "../../components/VideoModal/VideoModal";
import ScrollProgress from "../../components/ScrollProgress/ScrollProgress";
import PortfolioBackdrop from "../../components/PortfolioBackdrop/PortfolioBackdrop";
import PortfolioRail from "../../components/PortfolioRail/PortfolioRail";
import PortfolioMap, { type MapChapter, type MapWork } from "../../components/PortfolioMap/PortfolioMap";
import CreativeSection from "../../components/CreativeSection/CreativeSection";
import CreativeStudio from "../../components/CreativeStudio/CreativeStudio";
import { useScrollSpy } from "../../hooks/useReveal";
import type { Category, Project, SiteConfig } from "../../types/project";
import {
  CREATIVE_SECTION_ID,
  FALLBACK_CREATIVE,
  isCreativePath,
  workIdFromHash,
  workIdFromPath,
  workPath,
  type CreativeCollection,
  type CreativeWork,
} from "../../types/creative";
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
  const [creative, setCreative] = useState<CreativeCollection | null>(null);
  const [playing, setPlaying] = useState<Project | null>(null);
  const [railVisible, setRailVisible] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;

    Promise.all([
      fetch(`${base}data/projects.json`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${base}data/categories.json`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${base}data/site-config.json`).then((r) => (r.ok ? r.json() : FALLBACK_CONFIG)),
      // Creative Coding is optional: if its file is missing or malformed the
      // rest of the portfolio still loads.
      fetch(`${base}data/creative-coding.json`)
        .then((r) => (r.ok ? r.json() : FALLBACK_CREATIVE))
        .catch(() => FALLBACK_CREATIVE),
    ])
      .then(([projectsData, categoriesData, configData, creativeData]) => {
        if (cancelled) return;
        setProjects(projectsData);
        setCategories(categoriesData);
        setConfig({ ...FALLBACK_CONFIG, ...configData });
        setCreative({
          ...FALLBACK_CREATIVE,
          ...creativeData,
          works: Array.isArray(creativeData?.works) ? creativeData.works : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setCategories([]);
        setCreative(FALLBACK_CREATIVE);
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

  const loading = projects === null || categories === null || creative === null;
  const creativeWorks = useMemo<CreativeWork[]>(() => creative?.works ?? [], [creative]);

  /**
   * Every chapter the page shows, in order: Creative Coding first, then the
   * project categories. The hero index, the floating rail, the scroll-spy and
   * the map all read from this one list, so they can never disagree.
   */
  const chapters = useMemo(() => {
    const list: { id: string; title: string; count: number }[] = [];
    if (creativeWorks.length > 0) {
      list.push({
        id: CREATIVE_SECTION_ID,
        title: creative?.title || FALLBACK_CREATIVE.title,
        count: creativeWorks.length,
      });
    }
    sections.forEach((s) => list.push({ id: s.id, title: s.title, count: s.projects.length }));
    return list.map((c, i) => ({ ...c, index: pad(i + 1) }));
  }, [sections, creativeWorks, creative]);

  const creativeChapter = chapters.find((c) => c.id === CREATIVE_SECTION_ID);

  const total = chapters.reduce((sum, c) => sum + c.count, 0);

  const mapChapters = useMemo<MapChapter[]>(
    () =>
      chapters.map((c) => ({
        id: c.id,
        index: c.index,
        title: c.title,
        works:
          c.id === CREATIVE_SECTION_ID
            ? creativeWorks.map((w) => ({ id: w.id, title: w.title, kind: "creative" as const }))
            : (sections.find((s) => s.id === c.id)?.projects ?? []).map((p) => ({
                id: p.id,
                title: p.title,
                kind: p.video ? ("motion" as const) : ("link" as const),
              })),
      })),
    [chapters, creativeWorks, sections],
  );

  const ids = useMemo(() => chapters.map((c) => c.id), [chapters]);
  const spyId = useScrollSpy(ids);
  const activeId = ids.includes(spyId) ? spyId : ids[0] ?? "";

  const goTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Creative studio is driven by the path (/portfolio/creative-coding/<id>), so
  // a piece can be linked to directly and the browser Back button closes it.
  const studioId = useMemo(() => {
    const id = workIdFromPath(location.pathname);
    return id && creativeWorks.some((w) => w.id === id) ? id : null;
  }, [location.pathname, creativeWorks]);

  // Older links used #creative-coding/<id>; send them to the clean path.
  useEffect(() => {
    const id = workIdFromHash(location.hash);
    if (id) navigate(workPath(id), { replace: true, preventScrollReset: true });
  }, [location.hash, navigate]);

  const openWork = useCallback(
    (work: CreativeWork) => navigate(workPath(work.id), { preventScrollReset: true }),
    [navigate],
  );
  const stepWork = useCallback(
    (id: string) => navigate(workPath(id), { replace: true, preventScrollReset: true }),
    [navigate],
  );
  const closeStudio = useCallback(
    () => navigate(`/portfolio/${CREATIVE_SECTION_ID}`, { replace: true, preventScrollReset: true }),
    [navigate],
  );

  // A link such as /portfolio#creative-coding lands on its chapter once the
  // content that gives it a position has loaded.
  const landedRef = useRef(false);
  useEffect(() => {
    if (loading || landedRef.current) return;
    landedRef.current = true;
    const target = isCreativePath(location.pathname) ? CREATIVE_SECTION_ID : location.hash.slice(1).split("/")[0];
    if (target && ids.includes(target)) {
      document.getElementById(target)?.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, [loading, ids, location.hash, location.pathname]);

  const flash = useCallback((el: HTMLElement) => {
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1800);
  }, []);

  const mapGoChapter = useCallback(
    (id: string) => {
      setMapOpen(false);
      window.setTimeout(() => goTo(id), 60);
    },
    [goTo],
  );

  const mapGoWork = useCallback(
    (work: MapWork) => {
      setMapOpen(false);
      window.setTimeout(() => {
        const el = document.getElementById(`work-${work.id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(el);
      }, 60);
    },
    [flash],
  );

  const mapGoTop = useCallback(() => {
    setMapOpen(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }, []);

  // "M" opens the map from anywhere on the page, unless someone is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "m" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (t instanceof HTMLElement && t.closest(".monaco-editor")) return;
      if (playing || studioId) return;
      e.preventDefault();
      setMapOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [playing, studioId]);

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
      <CreativeStudio works={creativeWorks} activeId={studioId} onClose={closeStudio} onNavigate={stepWork} />
      <PortfolioMap
        open={mapOpen}
        chapters={mapChapters}
        activeId={activeId}
        onClose={() => setMapOpen(false)}
        onChapter={mapGoChapter}
        onWork={mapGoWork}
        onTop={mapGoTop}
      />
      <PortfolioRail
        items={chapters.map((c) => ({ id: c.id, index: c.index, label: c.title }))}
        activeId={activeId}
        visible={railVisible}
        onSelect={goTo}
        onOpenMap={() => setMapOpen(true)}
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
                <strong>{loading ? "--" : pad(chapters.length)}</strong>
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
                : chapters.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="pf-index-row" onClick={() => goTo(c.id)}>
                        <span className="pf-index-num">{c.index}</span>
                        <span className="pf-index-label">{c.title}</span>
                        <span className="pf-index-count">{pad(c.count)}</span>
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

        {!loading && chapters.length === 0 && (
          <p className="pf-empty">New work is on its way. Check back soon.</p>
        )}

        {creativeChapter && (
          <CreativeSection
            index={creativeChapter.index}
            title={creativeChapter.title}
            blurb={creative?.blurb}
            works={creativeWorks}
            onOpen={openWork}
          />
        )}

        {sections.map((section) => (
          <ProjectGrid
            key={section.id}
            id={section.id}
            index={chapters.find((c) => c.id === section.id)?.index ?? section.index}
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
