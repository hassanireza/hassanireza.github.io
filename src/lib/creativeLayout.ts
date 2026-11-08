/**
 * Count-aware row planning for 1:1 covers, which can fit up to five across.
 *
 * It is the same idea as planRows in portfolioLayout (rows always fill the
 * full width, whatever the count) generalised to any column count:
 *
 *   count <= columns   one row holding every item (1 = a full-width feature)
 *   otherwise          a leading row for the remainder, then full rows
 *
 * With 5 columns that gives, for 1..11 items:
 *   1 | 2 | 3 | 4 | 5 | 1+5 | 2+5 | 3+5 | 4+5 | 5+5 | 1+5+5
 *
 * Each row is laid out as its own grid of exactly that many equal columns, so
 * no row can ever come up short and the gutters stay the same everywhere.
 */

export type SquareColumns = 2 | 3 | 4 | 5;

export function planSquareRows(count: number, columns: number): number[] {
  if (count <= 0) return [];
  if (count <= columns) return [count];
  const remainder = count % columns;
  const full = Math.floor(count / columns);
  return [...(remainder > 0 ? [remainder] : []), ...Array<number>(full).fill(columns)];
}
