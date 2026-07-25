import type { ReactNode } from "react";
import { useReveal } from "../../hooks/useReveal";

interface RevealSectionProps {
  id: string;
  idx: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Every section on this page reveals the same way: the whole section
 * fades and rises into place once it's actually been scrolled to, not
 * all at once on mount. Direct grid/list children inside get their own
 * staggered delay via the `.stagger` CSS utility, driven off the same
 * `in-view` class this sets on the section.
 */
export function RevealSection({ id, idx, title, children, className }: RevealSectionProps) {
  const { ref, visible } = useReveal<HTMLElement>(0.12);

  return (
    <section
      id={id}
      ref={ref}
      className={`brand-section reveal-section${visible ? " in-view" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="sec-head">
        <span className="idx">{idx}</span>
        <h3>{title}</h3>
        <span className="line" />
      </div>
      {children}
    </section>
  );
}
