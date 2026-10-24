import { useEffect, useState } from "react";
import type { GridColumns } from "../lib/portfolioLayout";

const WIDE = "(min-width: 1024px)";
const MEDIUM = "(min-width: 640px)";

function read(): GridColumns {
  if (typeof window === "undefined") return 3;
  if (window.matchMedia(WIDE).matches) return 3;
  if (window.matchMedia(MEDIUM).matches) return 2;
  return 1;
}

/**
 * How many cards fit across the portfolio grid at the current viewport.
 * Mirrors the CSS breakpoints (>=1024px: 3, >=640px: 2, otherwise 1) so the
 * row plan chosen in JS always matches what the stylesheet can lay out.
 */
export function useGridColumns(): GridColumns {
  const [columns, setColumns] = useState<GridColumns>(read);

  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const medium = window.matchMedia(MEDIUM);
    const update = () => setColumns(read());
    wide.addEventListener("change", update);
    medium.addEventListener("change", update);
    update();
    return () => {
      wide.removeEventListener("change", update);
      medium.removeEventListener("change", update);
    };
  }, []);

  return columns;
}
