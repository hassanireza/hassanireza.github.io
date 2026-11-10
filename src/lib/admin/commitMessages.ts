/**
 * Every commit the admin dashboards make is written here, so the repo's
 * history reads like a changelog: what happened, to which piece of work, in
 * which section. Pattern: a verb, the title in quotes, then where it lives.
 *
 *   Add "Oracle" to Creative Coding
 *   Update "Lexera" in Frontend Development
 *   Remove "Hangman" from Game Design
 */

export const CREATIVE_LABEL = "Creative Coding";

const q = (title: string) => `"${title.trim()}"`;

export const commit = {
  // Portfolio projects (Game Design, Frontend Development, ...)
  projectAdded: (title: string, section: string) => `Add ${q(title)} to ${section}`,
  projectUpdated: (title: string, section: string) => `Update ${q(title)} in ${section}`,
  projectRemoved: (title: string, section: string) => `Remove ${q(title)} from ${section}`,
  projectReordered: (title: string, section: string) => `Reorder ${q(title)} in ${section}`,
  projectMoved: (title: string, section: string) => `Move ${q(title)} to ${section}`,
  projectThumbnail: (title: string, replaced: boolean) =>
    `${replaced ? "Replace" : "Add"} thumbnail for ${q(title)}`,

  // Sections
  sectionAdded: (label: string) => `Add section ${q(label)}`,
  sectionMoved: (label: string, where: "up" | "down" | "to the top" | "to the bottom") =>
    `Reorder sections: move ${q(label)} ${where}`,

  // Creative Coding
  workAdded: (title: string) => `Add ${q(title)} to ${CREATIVE_LABEL}`,
  workUpdated: (title: string) => `Update ${q(title)} in ${CREATIVE_LABEL}`,
  workRemoved: (title: string) => `Remove ${q(title)} from ${CREATIVE_LABEL}`,
  workReordered: (title: string) => `Reorder ${q(title)} in ${CREATIVE_LABEL}`,
  workHeading: () => `Update the ${CREATIVE_LABEL} heading`,
  workFile: (kind: "video" | "poster" | "source code", title: string, replaced: boolean) =>
    `${replaced ? "Replace" : "Add"} ${kind} for ${q(title)}`,

  // Housekeeping and site-wide settings
  fileCleanup: (file: string, owner: string) => `Remove unused ${file} (${owner})`,
  siteSettings: () => "Update the portfolio title and tagline",
};
