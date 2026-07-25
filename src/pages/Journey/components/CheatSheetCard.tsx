import { Link } from "react-router-dom";
import { CheatSheet } from "../domain/CheatSheet";
import "./CheatSheetCard.css";

interface CheatSheetCardProps {
  sheet: CheatSheet;
}

export function CheatSheetCard({ sheet }: CheatSheetCardProps) {
  return (
    <Link to={`/journey/cheatsheets/${sheet.slug}`} className="sheet-card">
      <div className="sheet-card-spine" />
      <div className="sheet-card-body">
        <span className="sheet-card-category">{sheet.category}</span>
        <h3 className="sheet-card-title">{sheet.title}</h3>
        <p className="sheet-card-desc">{sheet.description}</p>
        <div className="sheet-card-tags">
          {sheet.tags.map((tag) => (
            <span key={tag} className="sheet-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="sheet-card-open" aria-hidden="true">
        Open guide
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
        </svg>
      </div>
    </Link>
  );
}
