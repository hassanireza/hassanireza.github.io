import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ParticleCanvas from "../../components/ParticleField/ParticleCanvas";
import "./Home.css";

export default function Home() {
  const [visible, setVisible] = useState(false);
  const [linksVisible, setLinksVisible] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("home-fullscreen");
    document.body.classList.add("home-fullscreen");
    const t1 = setTimeout(() => setVisible(true), 600);
    const t2 = setTimeout(() => setLinksVisible(true), 900);
    return () => {
      document.documentElement.classList.remove("home-fullscreen");
      document.body.classList.remove("home-fullscreen");
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <ParticleCanvas />

      <div className="ui">
        <div className="identity">
          <div className="name-block">
            <h1 className={`name${visible ? " visible" : ""}`}>Reza Hassani</h1>
            <p className={`role${visible ? " visible" : ""}`}>
              Frontend Developer &nbsp;&middot;&nbsp; Animator
            </p>
            <p className={`summary${visible ? " visible" : ""}`}>
              Building interfaces where code meets motion. Python, Django, React and the
              spaces between.
            </p>
          </div>
        </div>

        <footer className="bar">
          <nav className="links">
            <Link to="/portfolio" className={`link${linksVisible ? " visible" : ""}`}>
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeOpacity="0.7" />
                <path d="M1.5 10.5h13M6 10.5V14" stroke="currentColor" strokeOpacity="0.45" />
              </svg>
              Portfolio
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </Link>
            <Link to="/descent" className={`link${linksVisible ? " visible" : ""}`}>
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1c3 0 5.5 3 5.5 7s-2.5 7-5.5 7" stroke="currentColor" strokeOpacity="0.7" />
                <path d="M8 3.6c2 0 3.6 2 3.6 4.4S10 12.4 8 12.4" stroke="currentColor" strokeOpacity="0.45" />
                <path d="M8 1v14" stroke="currentColor" strokeOpacity="0.35" />
              </svg>
              The Descent
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </Link>
            <Link to="/journey" className={`link${linksVisible ? " visible" : ""}`}>
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 12.5h2.5v-2.5h2.5V7.5h2.5V5h2.5" stroke="currentColor" strokeOpacity="0.7" />
                <circle cx="2.5" cy="12.5" r="0.9" fill="currentColor" fillOpacity="0.5" stroke="none" />
                <circle cx="12.5" cy="5" r="1.1" fill="currentColor" fillOpacity="0.85" stroke="none" />
              </svg>
              My Journey
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </Link>
          </nav>

          <nav className="links">
            <a
              href="https://github.com/hassanireza"
              className={`link${linksVisible ? " visible" : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="4" cy="4" r="1.6" stroke="currentColor" strokeOpacity="0.7" />
                <circle cx="12" cy="4" r="1.6" stroke="currentColor" strokeOpacity="0.7" />
                <circle cx="4" cy="12" r="1.6" stroke="currentColor" strokeOpacity="0.7" />
                <path d="M4 5.6V10.4M5.6 4H10a1.6 1.6 0 0 1 1.6 1.6V10.4" stroke="currentColor" strokeOpacity="0.45" />
              </svg>
              GitHub
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </a>
            <Link to="/branding" className={`link${linksVisible ? " visible" : ""}`}>
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.7" />
                <circle cx="8" cy="8" r="3.6" stroke="currentColor" strokeOpacity="0.4" />
                <path d="M8 1.5v13" stroke="currentColor" strokeOpacity="0.3" />
              </svg>
              Brand
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </Link>
            <Link to="/contact" className={`link${linksVisible ? " visible" : ""}`}>
              <svg className="link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="3" width="13" height="10" rx="1" stroke="currentColor" strokeOpacity="0.7" />
                <path d="M1.5 3.8l6.5 5 6.5-5" stroke="currentColor" strokeOpacity="0.45" />
              </svg>
              Contact
              <svg className="link-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </Link>
          </nav>
        </footer>
      </div>
    </>
  );
}
