import { Link } from "react-router-dom";
import { useReveal } from "../hooks/useReveal";

export function Surface() {
  const eyebrow = useReveal<HTMLParagraphElement>();
  const heading = useReveal<HTMLHeadingElement>();
  const body = useReveal<HTMLParagraphElement>();
  const cta = useReveal<HTMLDivElement>();

  return (
    <section className="surface wrap">
      <p className={`eyebrow reveal${eyebrow.visible ? " visible" : ""}`} ref={eyebrow.ref}>
        Present Depth
      </p>
      <h2 className={`reveal d1${heading.visible ? " visible" : ""}`} ref={heading.ref}>
        Still descending, still building.
      </h2>
      <p className={`body-copy reveal d2${body.visible ? " visible" : ""}`} ref={body.ref}>
        Today the work sits at the point where every layer meets: interfaces
        designed with the eye of a graphic designer, sequenced with the
        timing of an animator, built with the discipline of an engineer, and
        increasingly, shaped by the systems thinking of a game developer.
        The dive continues, every project is another few fathoms down.
      </p>
      <div className={`cta-row reveal d3${cta.visible ? " visible" : ""}`} ref={cta.ref}>
        <Link className="cta primary" to="/portfolio">
          View the portfolio
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
        <Link className="cta" to="/branding">
          Brand system
        </Link>
        <a
          className="cta"
          href="https://github.com/hassanireza"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}
