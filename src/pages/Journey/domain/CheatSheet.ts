export type CheatSheetCategory =
  | "python"
  | "django"
  | "database"
  | "frontend"
  | "javascript"
  | "cms"
  | "infrastructure";

export interface CheatSheetData {
  slug: string;
  title: string;
  description: string;
  category: CheatSheetCategory;
  tags: string[];
}

/**
 * Represents a single long-form reference guide. The guide's content
 * lives in `guides/content/<slug>.ts`, resolved at render time through
 * `guides/registry.ts`; this class only wraps the metadata used to
 * catalog, filter, and link to it.
 */
export class CheatSheet {
  public readonly slug: string;
  public readonly title: string;
  public readonly description: string;
  public readonly category: CheatSheetCategory;
  public readonly tags: ReadonlyArray<string>;

  constructor(data: CheatSheetData) {
    this.slug = data.slug;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.tags = Object.freeze([...data.tags]);
  }

  public matchesQuery(query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      this.title.toLowerCase().includes(needle) ||
      this.description.toLowerCase().includes(needle) ||
      this.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  }
}

/**
 * Aggregate that owns the full set of cheat sheets and exposes
 * category / search filtering without leaking iteration logic into
 * components.
 */
export class CheatSheetCatalog {
  private readonly sheets: ReadonlyArray<CheatSheet>;

  constructor(sheets: ReadonlyArray<CheatSheet>) {
    this.sheets = sheets;
  }

  public all(): ReadonlyArray<CheatSheet> {
    return this.sheets;
  }

  public categories(): CheatSheetCategory[] {
    const set = new Set<CheatSheetCategory>();
    this.sheets.forEach((sheet) => set.add(sheet.category));
    return Array.from(set);
  }

  public findBySlug(slug: string): CheatSheet | undefined {
    return this.sheets.find((sheet) => sheet.slug === slug);
  }

  public filter(category: CheatSheetCategory | "all", query: string): CheatSheet[] {
    return this.sheets.filter((sheet) => {
      const matchesCategory = category === "all" || sheet.category === category;
      return matchesCategory && sheet.matchesQuery(query);
    });
  }

  public count(): number {
    return this.sheets.length;
  }
}
