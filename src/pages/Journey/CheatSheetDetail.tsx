import { Link, Navigate, useParams } from "react-router-dom";
import { cheatSheetCatalog } from "./data/cheatSheetData";
import { GuideReader } from "./guides/GuideReader";
import "./CheatSheetDetail.css";

export default function CheatSheetDetail() {
  const { slug } = useParams<{ slug: string }>();
  const sheet = slug ? cheatSheetCatalog.findBySlug(slug) : undefined;

  if (!sheet) {
    return <Navigate to="/journey/cheatsheets" replace />;
  }

  return (
    <div className="cheatsheet-detail">
      <div className="detail-topbar">
        <div className="container detail-topbar-inner">
          <Link to="/journey/cheatsheets" className="detail-back">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
            </svg>
            All cheat sheets
          </Link>
          <div className="detail-meta">
            <span className="badge-pill">{sheet.category}</span>
            <strong>{sheet.title}</strong>
          </div>
          <span className="detail-topbar-spacer" aria-hidden="true" />
        </div>
      </div>

      <GuideReader sheet={sheet} />
    </div>
  );
}
