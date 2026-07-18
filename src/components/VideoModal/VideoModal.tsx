import { useEffect } from "react";
import { AssetResolver } from "../../lib/asset";
import type { AnimationProject } from "../../types/project";
import "./VideoModal.css";

interface VideoModalProps {
  project: AnimationProject | null;
  onClose: () => void;
}

export default function VideoModal({ project, onClose }: VideoModalProps) {
  const isActive = project !== null;

  useEffect(() => {
    document.body.style.overflow = isActive ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isActive, onClose]);

  return (
    <div
      className={`video-bg${isActive ? " active" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="video-container">
        {project && (
          <>
            <video
              className="main-video"
              controls
              autoPlay
              loop
              playsInline
              aria-label={project.title}
              src={AssetResolver.resolve(project.video)}
            >
              Your browser does not support video playback.
            </video>
            <button className="close-video" aria-label="Close video" onClick={onClose}>
              &#x2715;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
