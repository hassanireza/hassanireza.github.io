import { AssetResolver } from "../../lib/asset";
import { useTilt } from "../../hooks/useTilt";
import { isAnimationProject, type AnyProject } from "../../types/project";
import "./ProjectCard.css";

interface ProjectCardProps {
  project: AnyProject;
  onPlay?: (project: AnyProject) => void;
}

export default function ProjectCard({ project, onPlay }: ProjectCardProps) {
  const { title, desc, img } = project;
  const tiltRef = useTilt<HTMLDivElement>({ max: 8 });

  const altText = isAnimationProject(project) ? project.alt || title : `${title} project screenshot`;

  const media = (
    <div className="media-frame">
      <img src={AssetResolver.resolve(img)} alt={altText} loading="lazy" />
      <div className="media-sheen" />
      <div className="glass">
        <span>View Project</span>
      </div>
    </div>
  );

  return (
    <div className="tilt" ref={tiltRef}>
      <div className="card">
        <div className="card-spotlight" />
        <h4 className="depth-1">{title}</h4>
        {desc && (
          <p className="card-desc depth-1">{desc}</p>
        )}
        <div className="Portfolio-images depth-2">
          {isAnimationProject(project) ? (
            <div
              className="media-item motion"
              role="button"
              tabIndex={0}
              onClick={() => onPlay?.(project)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onPlay?.(project);
              }}
            >
              {media}
            </div>
          ) : (
            <div className="media-item">
              <a href={project.href} target="_blank" rel="noopener noreferrer">
                {media}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
