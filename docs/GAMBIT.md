# The Gambit (section 7)

Route: `/gambit` (index) and `/gambit/<slug>` (reader). One lazy route, `/gambit/*`.

## Add or edit an entry
Content lives in `src/pages/Gambit/data/ch*.ts`. Each entry uses short keys:
`i` slug, `n` name, `fa` Persian name, `c` chapter id, `l` level (1 to 3), `g` tags,
`d` plain idea, `b` body paragraphs, `m` formulas (`"label :: expr"`, supports `_{x}` and `^{x}`),
`x` example, `u` use in design, `o` origin, `r` related slugs.
Numbering follows file order, so insert new entries where they belong in the learning path.

## Files
- `Gambit.tsx` shell, routing, filters, scroll restore
- `GambitIndex.tsx` masonry, search, chapter and level filters
- `GambitReader.tsx` reader, prev/next, swipe, arrow keys, Escape
- `Tex.tsx` formula typesetter, `useClipboard.ts`, `CopyButton.tsx`
- `Gambit.css` styles, brand tokens only
