import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CVData } from "../../../types/cv";
import "../Descent.css";
import "./CVPage.css";

const FALLBACK: CVData = {
  role: "Frontend Developer \u00b7 Animator",
  contact: { siteLabel: "hassanireza.github.io", email: "hassanireza@att.net", githubUsername: "hassanireza" },
  summary: "",
  jobs: [],
  skillGroups: [],
  languages: [],
};

export default function CVPage() {
  const [cv, setCv] = useState<CVData | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/cv.json`)
      .then((r) => (r.ok ? r.json() : FALLBACK))
      .then((data) => !cancelled && setCv(data))
      .catch(() => !cancelled && setCv(FALLBACK));
    return () => {
      cancelled = true;
    };
  }, []);

  const data = cv ?? FALLBACK;

  return (
    <div className="descent-page cv-page">
      <Link to="/descent" className="cv-back no-print">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
        </svg>
        Back to the Descent
      </Link>

      <header className="cv-header">
        <span className="eyebrow">Curriculum Vitae</span>
        <h1>
          Reza <em>Hassani</em>
        </h1>
        <p className="cv-role">{data.role}</p>

        <div className="cv-contact">
          <Link to="/" className="cv-contact-link">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {data.contact.siteLabel}
          </Link>
          <a href={`mailto:${data.contact.email}`} className="cv-contact-link">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="2,4 12,13 22,4" />
            </svg>
            {data.contact.email}
          </a>
          <a
            href={`https://github.com/${data.contact.githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cv-contact-link"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
            </svg>
            GitHub
          </a>
        </div>
      </header>

      <div className="cv-body">
        <section className="cv-section">
          <div className="cv-section-head">
            <span className="cv-idx">01</span>
            <h2>Summary</h2>
            <span className="cv-line" />
          </div>
          <p className="cv-summary">{data.summary}</p>
        </section>

        <section className="cv-section">
          <div className="cv-section-head">
            <span className="cv-idx">02</span>
            <h2>Experience</h2>
            <span className="cv-line" />
          </div>

          <div className="cv-jobs">
            {data.jobs.map((job) => (
              <article className="cv-job" key={`${job.company}-${job.period}`}>
                <div className="cv-job-top">
                  <div>
                    <h3>{job.role}</h3>
                    <span className="cv-job-company">{job.company}</span>
                  </div>
                  <div className="cv-job-meta">
                    <span>{job.period}</span>
                    <span>{job.location}</span>
                  </div>
                </div>
                <ul className="cv-job-desc">
                  {job.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cv-section">
          <div className="cv-section-head">
            <span className="cv-idx">03</span>
            <h2>Tech Stacks</h2>
            <span className="cv-line" />
          </div>

          <div className="cv-tech">
            {data.skillGroups.map((group) => (
              <div className="cv-tech-group" key={group.label}>
                <span className="cv-tech-label">{group.label}</span>
                <div className="cv-skills">
                  {group.skills.map((skill) => (
                    <span className="cv-skill" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cv-section">
          <div className="cv-section-head">
            <span className="cv-idx">04</span>
            <h2>Languages</h2>
            <span className="cv-line" />
          </div>

          <div className="cv-languages">
            {data.languages.map((language) => (
              <div className="cv-language" key={language.name}>
                <span className="cv-language-name">{language.name}</span>
                <span className="cv-language-level">{language.level}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cv-actions no-print">
        <button type="button" className="cta primary" onClick={() => window.print()}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1a.75.75 0 0 1 .75.75v6.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V1.75A.75.75 0 0 1 8 1z" />
            <path d="M2.5 10.75a.75.75 0 0 1 .75.75v1.5c0 .414.336.75.75.75h8c.414 0 .75-.336.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A2.25 2.25 0 0 1 12 15H4a2.25 2.25 0 0 1-2.25-2.25v-1.5a.75.75 0 0 1 .75-.75z" />
          </svg>
          Download as PDF
        </button>
      </div>

      <footer className="cv-footer no-print">
        <span className="foot-note">
          REZA HASSANI &middot; {data.role.toUpperCase()}
        </span>
      </footer>
    </div>
  );
}
