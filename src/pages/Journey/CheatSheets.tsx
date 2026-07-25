import { useMemo, useState } from "react";
import { cheatSheetCatalog } from "./data/cheatSheetData";
import type { CheatSheetCategory } from "./domain/CheatSheet";
import { CheatSheetCard } from "./components/CheatSheetCard";
import "./CheatSheets.css";

export default function CheatSheets() {
  const [category, setCategory] = useState<CheatSheetCategory | "all">("all");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => cheatSheetCatalog.categories(), []);
  const results = useMemo(() => cheatSheetCatalog.filter(category, query), [category, query]);

  return (
    <div className="cheatsheets-page section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Reference library</span>
          <h1 className="section-title">Cheat sheet catalog</h1>
          <p className="section-subtitle">
            Seventeen long form guides, preserved exactly as they were written, indexed here for quick
            lookup by topic or keyword.
          </p>
        </div>

        <div className="catalog-controls">
          <input
            type="search"
            placeholder="Search guides, tags, topics..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="catalog-search"
            aria-label="Search cheat sheets"
          />
          <div className="catalog-filters" role="group" aria-label="Filter by category">
            <button
              className={`filter-chip${category === "all" ? " active" : ""}`}
              onClick={() => setCategory("all")}
            >
              All ({cheatSheetCatalog.count()})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-chip${category === cat ? " active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {results.length === 0 ? (
          <p className="catalog-empty">No guides match this search. Try another keyword or category.</p>
        ) : (
          <div className="catalog-grid">
            {results.map((sheet) => (
              <CheatSheetCard key={sheet.slug} sheet={sheet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
