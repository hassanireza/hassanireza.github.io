import { useScrollProgress } from "../../hooks/useScrollProgress";
import "./ScrollProgress.css";

export default function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-fill" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
