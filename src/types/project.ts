/**
 * Shared typing for every portfolio entry.
 *
 * `img` and `video` paths are relative to `/public/assets/images/`.
 * Example: img: "lexera.webp" -> resolves to /assets/images/lexera.webp
 */
export interface BaseProject {
  title: string;
  desc: string;
  img: string;
}

/** A project that links out to a live/hosted build. */
export interface LinkProject extends BaseProject {
  href: string;
}

/** A short animation/motion piece that opens in the video lightbox. */
export interface AnimationProject extends BaseProject {
  alt: string;
  video: string;
}

export type AnyProject = LinkProject | AnimationProject;

export function isAnimationProject(p: AnyProject): p is AnimationProject {
  return (p as AnimationProject).video !== undefined;
}
