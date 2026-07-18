import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import ProjectGrid from "../../components/ProjectGrid/ProjectGrid";
import VideoModal from "../../components/VideoModal/VideoModal";
import ScrollProgress from "../../components/ScrollProgress/ScrollProgress";
import PortfolioBackdrop from "../../components/PortfolioBackdrop/PortfolioBackdrop";
import SectionNav, { type SectionNavItem } from "../../components/SectionNav/SectionNav";
import {
  vibeCodingProjects,
  frontendProjects,
  animationProjects,
} from "../../data/projects";
import type { AnimationProject, AnyProject } from "../../types/project";
import "./Portfolio.css";

/**
 * Section registry for the whole page: the section nav, scroll-spy, and
 * grid rendering all read from this one list. To add a brand-new category
 * of work later, add one entry here (and the matching data array import
 * above) — nothing else on the page needs to change.
 */
const SECTIONS: Array<{
  id: string;
  index: string;
  navLabel: string;
  navIcon: SectionNavItem["icon"];
  title: string;
  projects: AnyProject[];
  isAnimationGrid?: boolean;
}> = [
  {
    id: "vibe-coding",
    index: "01",
    navLabel: "Vibe Coding",
    navIcon: "code",
    title: "Vibe Coding",
    projects: vibeCodingProjects,
  },
  {
    id: "frontend-development",
    index: "02",
    navLabel: "Front-End",
    navIcon: "layout",
    title: "Front-End Development",
    projects: frontendProjects,
  },
  {
    id: "animations",
    index: "03",
    navLabel: "Motion",
    navIcon: "play",
    title: "Animations",
    projects: animationProjects,
    isAnimationGrid: true,
  },
];

export default function Portfolio() {
  const [playing, setPlaying] = useState<AnimationProject | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  function handlePlay(project: AnyProject) {
    setPlaying(project as AnimationProject);
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
  }, []);

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
              Reza Hassani&rsquo;s <em>Portfolio</em>
            </span>
          </h1>
          <p className="hero-sub">
            Front-end engineering and motion design: selected builds, from full-stack
            Django apps to hand-animated interaction work.
          </p>
          <div className="hero-meta">
            <span>{SECTIONS.reduce((n, s) => n + s.projects.length, 0)} projects</span>
            <span className="dot" />
            <span>{SECTIONS.length} disciplines</span>
            <span className="dot" />
            <a href="https://hassanireza.github.io/descent" target="_blank" rel="noopener noreferrer">
              The Descent &middot; Career Roadmap
            </a>
          </div>
        </header>

        <SectionNav
          items={SECTIONS.map((s) => ({ id: s.id, label: s.navLabel, icon: s.navIcon }))}
        />

        {SECTIONS.map((section) => (
          <ProjectGrid
            key={section.id}
            id={section.id}
            index={section.index}
            title={section.title}
            projects={section.projects}
            onPlay={section.isAnimationGrid ? handlePlay : undefined}
          />
        ))}

        <footer className="site-footer">
          <p className="footer-line">Open to front-end and UI/UX collaborations.</p>
          <nav className="footer-links">
            <Link to="/contact">Contact</Link>
            <Link to="/branding">Branding</Link>
            <a href="mailto:reza-h@att.net">Email</a>
            <a href="https://github.com/hassanireza" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </footer>
      </div>
    </>
  );
}
