/**
 * Creative Coding works. Stored in /public/data/creative-coding.json and
 * fetched at runtime, the same way projects.json is, so adding a piece is a
 * data change: drop the media and source file under public/assets/creative/
 * and add one entry to "works".
 *
 * Media can be any aspect ratio. `width` and `height` are the pixel size of
 * `video`; the grid tile and the studio player both letterbox to that ratio
 * instead of cropping.
 */
export interface CreativeCode {
  /** Path under the site root, e.g. "assets/creative/<id>/<file>.py". */
  src: string;
  /** Name shown in the editor toolbar and used for the download. */
  filename: string;
  /** Monaco language id, e.g. "python", "javascript", "glsl". */
  language: string;
}

export interface CreativeSpec {
  label: string;
  value: string;
}

export interface CreativeEquation {
  /** Short caption, e.g. "Wave equation". */
  label: string;
  /**
   * The expression, with _{...} for subscripts and ^{...} for superscripts,
   * e.g. "u^{n+1} = 2u^{n} - u^{n-1}". Plain Unicode symbols (nabla, Delta,
   * the real minus sign) are used as they are.
   */
  tex: string;
}

export interface CreativeWork {
  id: string;
  title: string;
  desc: string;
  year?: number;
  poster: string;
  video: string;
  /** Small, silent loop used by the grid tile. Falls back to `video`. */
  preview?: string;
  width: number;
  height: number;
  /**
   * Tile style in the grid. "wide" is the 16:9 cover (3 per row on desktop),
   * "square" is the compact 1:1 cover (4 or 5 per row). When omitted it is
   * chosen from the video's shape: near-square pieces get "square".
   */
  cover?: CreativeCover;
  tags?: string[];
  about?: string[];
  specs?: CreativeSpec[];
  /** Equations behind the piece, shown as a typeset block in the studio. */
  equations?: CreativeEquation[];
  /** One-line command shown with a copy button, e.g. how to run the piece. */
  run?: string;
  code: CreativeCode;
}

export type CreativeCover = "wide" | "square";

export function coverOf(work: CreativeWork): CreativeCover {
  if (work.cover) return work.cover;
  const ratio = work.width / work.height;
  return ratio >= 0.8 && ratio <= 1.25 ? "square" : "wide";
}

export interface CreativeCollection {
  title: string;
  blurb?: string;
  works: CreativeWork[];
}

export const CREATIVE_SECTION_ID = "creative-coding";

export const FALLBACK_CREATIVE: CreativeCollection = {
  title: "Creative Coding",
  blurb: "Motion and image made from code alone. Watch the output, then open the source behind it.",
  works: [],
};

/** "#creative-coding/<id>" -> "<id>", anything else -> null. */
export function workIdFromHash(hash: string): string | null {
  const match = hash.match(new RegExp(`^#${CREATIVE_SECTION_ID}/([\\w-]+)$`));
  return match ? match[1] : null;
}

/** Path of a work's own page, e.g. "/portfolio/creative-coding/scrying-basin". */
export function workPath(id: string): string {
  return `/portfolio/${CREATIVE_SECTION_ID}/${id}`;
}

/** "/portfolio/creative-coding/<id>" -> "<id>", anything else -> null. */
export function workIdFromPath(pathname: string): string | null {
  const match = pathname.match(new RegExp(`^/portfolio/${CREATIVE_SECTION_ID}/([\\w-]+)/?$`));
  return match ? match[1] : null;
}

/** True on "/portfolio/creative-coding" and any work page beneath it. */
export function isCreativePath(pathname: string): boolean {
  return pathname === `/portfolio/${CREATIVE_SECTION_ID}` || pathname.startsWith(`/portfolio/${CREATIVE_SECTION_ID}/`);
}
