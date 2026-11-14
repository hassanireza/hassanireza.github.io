/**
 * Content model for The Gambit (game theory and algorithms library).
 * Entries are authored with short keys to keep the content files compact,
 * then normalised in ./index.ts into the long-form Topic shape.
 */

export type ChapterId =
  | "map"
  | "solutions"
  | "classics"
  | "time"
  | "information"
  | "coalitions"
  | "mind"
  | "frames"
  | "algorithms"
  | "craft";

/** 1 = Intro, 2 = Core, 3 = Advanced */
export type Level = 1 | 2 | 3;

export interface Chapter {
  id: ChapterId;
  numeral: string;
  title: string;
  blurb: string;
}

/** Authoring shape (short keys). */
export interface RawTopic {
  /** slug */
  i: string;
  /** English name */
  n: string;
  /** Persian name, optional */
  fa?: string;
  /** chapter */
  c: ChapterId;
  /** level */
  l: Level;
  /** tags */
  g: string[];
  /** one-sentence plain-language idea */
  d: string;
  /** body paragraphs */
  b: string[];
  /** formulas, each "label :: expression" (supports _{x} and ^{x}) */
  m?: string[];
  /** worked example */
  x: string;
  /** use in games, design and life */
  u: string;
  /** origin and key reference */
  o: string;
  /** related slugs */
  r?: string[];
}

export interface Topic {
  slug: string;
  number: number;
  name: string;
  fa?: string;
  chapter: ChapterId;
  level: Level;
  tags: string[];
  idea: string;
  body: string[];
  math: { label: string; tex: string }[];
  example: string;
  use: string;
  origin: string;
  related: string[];
  minutes: number;
}
