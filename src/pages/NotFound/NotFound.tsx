import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="container not-found">
      <div className={`not-found-mark${visible ? " visible" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
          <text
            x="110"
            y="100"
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="300"
            fontSize="96"
            fill="var(--text)"
            opacity="0.9"
          >
            404
          </text>
          <line x1="20" y1="118" x2="200" y2="118" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>

      <header className={`not-found-header${visible ? " visible" : ""}`}>
        <h1>
          <em>Page not found</em>
        </h1>
        <h2>
          The page you are looking for does not exist, was moved, or the link
          you followed is out of date.
        </h2>
      </header>

      <nav className={`not-found-links${visible ? " visible" : ""}`}>
        <Link to="/" className="back-link">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Home
        </Link>
        <Link to="/portfolio" className="not-found-secondary">
          View Portfolio
        </Link>
        <Link to="/contact" className="not-found-secondary">
          Contact
        </Link>
      </nav>
    </div>
  );
}
