import type { RawTopic, Topic, ChapterId } from "./types";
import { CHAPTERS } from "./chapters";
import { map } from "./ch1-map";
import { solutions } from "./ch2-solutions";
import { classics } from "./ch3-classics";
import { time } from "./ch4-time";
import { information } from "./ch5-information";
import { coalitions } from "./ch6-coalitions";
import { mind } from "./ch7-mind";
import { frames } from "./ch8-frames";
import { algorithms } from "./ch9-algorithms";
import { craft } from "./ch10-craft";

export { CHAPTERS };
export type { Topic, ChapterId };

const RAW: RawTopic[] = [
  ...map,
  ...solutions,
  ...classics,
  ...time,
  ...information,
  ...coalitions,
  ...mind,
  ...frames,
  ...algorithms,
  ...craft,
];

function minutesFor(raw: RawTopic): number {
  const words = [raw.d, ...raw.b, raw.x, raw.u, raw.o, ...(raw.m ?? [])].join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function splitMath(line: string): { label: string; tex: string } {
  const at = line.indexOf(" :: ");
  if (at === -1) return { label: "", tex: line };
  return { label: line.slice(0, at), tex: line.slice(at + 4) };
}

export const TOPICS: Topic[] = RAW.map((raw, index) => ({
  slug: raw.i,
  number: index + 1,
  name: raw.n,
  fa: raw.fa,
  chapter: raw.c,
  level: raw.l,
  tags: raw.g,
  idea: raw.d,
  body: raw.b,
  math: (raw.m ?? []).map(splitMath),
  example: raw.x,
  use: raw.u,
  origin: raw.o,
  related: raw.r ?? [],
  minutes: minutesFor(raw),
}));

const BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t] as const));

export function getTopic(slug: string | undefined): Topic | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function chapterOf(id: ChapterId) {
  return CHAPTERS.find((c) => c.id === id)!;
}

export const LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "Intro",
  2: "Core",
  3: "Advanced",
};

/** Plain-text math for clipboard: strip the _{} and ^{} wrappers into readable ASCII-ish form. */
export function plainMath(tex: string): string {
  return tex.replace(/_\{([^{}]*)\}/g, "_$1").replace(/\^\{([^{}]*)\}/g, "^$1");
}

/** Full topic as Markdown, for the copy buttons. */
export function topicToMarkdown(t: Topic): string {
  const ch = chapterOf(t.chapter);
  const lines: string[] = [];
  lines.push(`# ${t.name}${t.fa ? ` (${t.fa})` : ""}`);
  lines.push(`*Chapter ${ch.numeral}: ${ch.title} | ${LEVEL_LABEL[t.level]} | ${t.minutes} min read*`);
  lines.push("");
  lines.push(`> ${t.idea}`);
  lines.push("");
  lines.push(...t.body.flatMap((p) => [p, ""]));
  if (t.math.length) {
    lines.push("## The math");
    for (const m of t.math) lines.push(m.label ? `- ${m.label}: \`${plainMath(m.tex)}\`` : `- \`${plainMath(m.tex)}\``);
    lines.push("");
  }
  lines.push("## Worked example", t.example, "");
  lines.push("## In games and design", t.use, "");
  lines.push("## Origin", t.origin, "");
  lines.push("Source: The Gambit, hassanireza.github.io/gambit/" + t.slug);
  return lines.join("\n");
}
