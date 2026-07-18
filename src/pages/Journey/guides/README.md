# Adding a new guide

The 17 original guides now live as real React content instead of static
HTML files, but a new one only takes three small steps.

## 1. Write the content

Create `src/pages/Journey/guides/content/<your-slug>.ts`:

```ts
export const html: string = `
  <section id="intro">
    <div class="section-header">
      <div class="section-num">01</div>
      <div class="section-title-group">
        <h2>Your first section</h2>
        <p>A one-line subtitle for this section.</p>
      </div>
    </div>
    <p>Regular paragraph content goes here.</p>
  </section>
`;

export interface TocEntry {
  id: string;
  label: string;
}

export const toc: TocEntry[] = [{ id: "intro", label: "Your first section" }];
```

Every top-level `<section>` needs a unique `id` - that id is what the
on-page table of contents links to, and what `#anchor` links in the guide
itself resolve against. `toc` is just a plain array of `{ id, label }`;
it does not have to include every section, only the ones you want listed
in the sidebar.

The shared reading stylesheet (`guides/GuideReader.css`) already styles
plain HTML - `h2`/`h3`, `p`, `ul`/`ol`, `table`, `blockquote`, `code`/`pre`
- plus a set of structural classes carried over from the original guides:
`code-block` (with `code-header`/`code-dots`/`code-lang`/`code-body`),
`callout`/`box`/`tip-box`, `card`/`concept-card`/`cheat-card`,
`step`/`step-num`/`step-header`, `checklist`/`checklist-item`/`check-box`,
`stat`/`stat-card`, `two-col`/`grid2`, `divider`, `comparison-table`, and a
few more - see the top of `GuideReader.css` for the full list. Reuse those
class names and a new guide will look identical to the other 17 without
any new CSS. For emphasis boxes, add `tone-danger`, `tone-success`,
`tone-info`, or `tone-tip` alongside the structural class (e.g.
`class="callout tone-tip"`) to pick which of the four muted accent colors
it gets.

Don't use inline `style=`, `<script>`, or emoji - none of that survives
the shared theme, and emoji specifically are excluded sitewide in favor of
this project's own line-icon system.

## 2. Register it

Add one line to `src/pages/Journey/guides/registry.ts`:

```ts
"your-slug": () => import("./content/your-slug"),
```

This is a dynamic import on purpose - each guide is its own chunk, loaded
only when someone opens it, so the catalog page doesn't have to download
all seventeen (soon eighteen) guides' worth of markup up front.

## 3. Add it to the catalog

Add one entry to `src/pages/Journey/data/cheatSheetData.ts`:

```ts
new CheatSheet({
  slug: "your-slug",
  title: "Your Guide Title",
  description: "One sentence describing what it covers.",
  category: "django", // see CheatSheetCategory in domain/CheatSheet.ts
  tags: ["tag-one", "tag-two"],
}),
```

`slug` here must exactly match the key you used in the registry and the
filename you used in step 1. That's it - it will now show up in the
catalog, be searchable, and be reachable at `/journey/cheatsheets/your-slug`.
