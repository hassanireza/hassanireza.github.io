import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ProjectCard from "../ProjectCard/ProjectCard";
import type { AnyProject } from "../../types/project";
import "./ProjectGrid.css";

gsap.registerPlugin(ScrollTrigger);

interface ProjectGridProps {
  id: string;
  index: string;
  title: string;
  projects: AnyProject[];
  onPlay?: (project: AnyProject) => void;
}

export default function ProjectGrid({ id, index, title, projects, onPlay }: ProjectGridProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const line = section.querySelector(".section-rule");
      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 85%" },
          },
        );
      }

      const cards = section.querySelectorAll(".tilt");
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 46, rotateX: -8 },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: section, start: "top 80%" },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section" id={id} ref={sectionRef}>
      <h3>
        <span className="section-index">{index}</span>
        {title}
        <span className="section-rule" />
      </h3>
      <div className="service-box" style={{ perspective: "1400px" }}>
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
