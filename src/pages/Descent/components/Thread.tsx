import { useActiveInView } from "../hooks/useReveal";

export function Thread() {
  const { ref, active } = useActiveInView<HTMLDivElement>(0.1);

  return (
    <div className={`thread wrap${active ? " in-view" : ""}`} ref={ref}>
      <svg viewBox="0 0 2 120" preserveAspectRatio="none">
        <line className="rope" x1="1" y1="0" x2="1" y2="120" />
        <circle className="pulse" cx="1" cy="0" r="3" />
      </svg>
    </div>
  );
}
