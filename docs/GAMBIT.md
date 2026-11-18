# The Gambit (section 7)

Route: `/gambit` (index) and `/gambit/<slug>` (reader). One lazy route, `/gambit/*`.

## Add or edit an entry
Content lives in `src/pages/Gambit/data/ch*.ts`. Each entry uses short keys:
`i` slug, `n` name, `fa` Persian name, `c` chapter id, `l` level (1 to 3), `g` tags,
`d` plain idea, `b` body paragraphs, `m` formulas (`"label :: expr"`, supports `_{x}` and `^{x}`),
`x` example, `u` use in design, `o` origin, `r` related slugs.
Entries are authored in chapter order, but the library is read in the order of the game, Theory Gambit:
the five that open the game, then the rest of Foundations (level 1), then Core (level 2), then Advanced
(level 3), with the hypergame and metagame finale last, then the two Synthesis capstones (`data/synthesis.ts`). `src/pages/Gambit/data/index.ts` builds that order
(`FIRST`, `FINALE`), so numbers, the pager and "Entry n of N" all follow it. A new entry lands at the end of
its level automatically. Keep `FIRST` and `FINALE` in step with `src/catalog/curriculum.ts` in the game repo.

## Files
- `Gambit.tsx` shell, routing, filters, scroll restore
- `GambitIndex.tsx` hero, search, chapter and level filters, and the masonry grouped by level
- `GambitPlay.tsx` and `GambitPlay.css` the Theory Gambit button and its looping promo in the hero
- `GambitTiers.css` level group headers and grids
- `GambitReader.tsx` reader, prev/next, swipe, arrow keys, Escape
- `Tex.tsx` formula typesetter, `useClipboard.ts`, `CopyButton.tsx`
- `Gambit.css` styles, brand tokens only
