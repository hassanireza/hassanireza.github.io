/**
 * Count-aware row planning for the portfolio grid.
 *
 * A fixed "N per row" grid leaves holes whenever a section's project count
 * is not a multiple of N (1 or 2 projects in a 3-column grid, a lone card
 * stranded on the last row, and so on). Instead of letting CSS auto-flow
 * decide, each section asks for a plan: a list of row sizes that always
 * sums to the project count and always fills the full width of the grid.
 *
 *   size 1 -> a "feature" row (one card spanning the whole width)
 *   size 2 -> two wide cards
 *   size 3 -> three cards
 *
 * The grid underneath is 6 columns wide, so every size divides it evenly
 * (6 / size columns per card) and no row can ever come up short.
 */

export type GridColumns = 1 | 2 | 3;

export const GRID_TRACKS = 6;

export function planRows(count: number, columns: GridColumns): number[] {
  if (count <= 0) return [];

  if (columns === 1) return Array.from({ length: count }, () => 1);

  if (columns === 2) {
    // Odd counts lead with a feature row, the rest pair up.
    const pairs = Math.floor(count / 2);
    return count % 2 === 1 ? [1, ...Array<number>(pairs).fill(2)] : Array<number>(pairs).fill(2);
  }

  if (count === 1) return [1];
  if (count === 2) return [2];

  const triples = Math.floor(count / 3);
  const remainder = count % 3;

  // remainder 0: only triples.
  // remainder 1: lead with one feature row, then triples (1 + 3k).
  // remainder 2: lead with one pair of wide cards, then triples (2 + 3k).
  if (remainder === 1) return [1, ...Array<number>(triples).fill(3)];
  if (remainder === 2) return [2, ...Array<number>(triples).fill(3)];
  return Array<number>(triples).fill(3);
}

export interface PlannedCell {
  /** Cards in this cell's row. */
  rowSize: number;
  /** Zero-based row index. */
  row: number;
  /** Zero-based position within the row. */
  col: number;
  /** Grid tracks this cell spans (of GRID_TRACKS). */
  span: number;
  /** True when the cell is a full-width feature (row of one on a multi-column grid). */
  feature: boolean;
}

/** Flattens a row plan into one descriptor per project, in order. */
export function planCells(count: number, columns: GridColumns): PlannedCell[] {
  const cells: PlannedCell[] = [];
  planRows(count, columns).forEach((rowSize, row) => {
    for (let col = 0; col < rowSize; col += 1) {
      cells.push({
        rowSize,
        row,
        col,
        span: GRID_TRACKS / rowSize,
        feature: rowSize === 1 && columns > 1,
      });
    }
  });
  return cells;
}
