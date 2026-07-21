/**
 * Shared typing for every portfolio entry, as stored in and fetched from
 * /public/data/projects.json at runtime.
 *
 * `img` paths are relative to /public/assets/images/ for existing
 * projects, or /public/portfolio-uploads/ for anything added through the
 * admin dashboard. `video` is only present on animation-category entries
 * (those open the video lightbox instead of linking out).
 */
export interface Project {
  id: string;
  title: string;
  desc: string;
  img: string;
  category: string;
  href?: string;
  video?: string;
  alt?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: "code" | "layout" | "play" | "manifesto" | "palette" | "type" | "marks" | "discipline";
}

export interface SiteConfig {
  portfolioTitle: string;
  portfolioTagline: string;
}

export function isAnimationProject(p: Project): boolean {
  return typeof p.video === "string" && p.video.length > 0;
}

// Kept as aliases so nothing importing the old names breaks.
export type AnyProject = Project;
export type LinkProject = Project;
export type AnimationProject = Project;
