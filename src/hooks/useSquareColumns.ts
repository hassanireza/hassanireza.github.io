import { useEffect, useState } from "react";
import type { SquareColumns } from "../lib/creativeLayout";

const QUERIES: [string, SquareColumns][] = [
  ["(min-width: 1240px)", 5],
  ["(min-width: 900px)", 4],
  ["(min-width: 640px)", 3],
];

function read(): SquareColumns {
  if (typeof window === "undefined") return 5;
  for (const [query, columns] of QUERIES) {
    if (window.matchMedia(query).matches) return columns;
  }
  return 2;
}

/**
 * How many 1:1 covers fit across at the current width: 5 on wide desktops,
 * 4 on laptops and landscape tablets, 3 on tablets, 2 on phones. Mirrors
 * useGridColumns, which does the same job for the 16:9 grid.
 */
export function useSquareColumns(): SquareColumns {
  const [columns, setColumns] = useState<SquareColumns>(read);

  useEffect(() => {
    const lists = QUERIES.map(([q]) => window.matchMedia(q));
    const update = () => setColumns(read());
    lists.forEach((l) => l.addEventListener("change", update));
    update();
    return () => lists.forEach((l) => l.removeEventListener("change", update));
  }, []);

  return columns;
}
