// Plots a CSS cubic-bezier(p1x, p1y, p2x, p2y) as a real SVG path, so the
// timing function's character is visible rather than only named in a table cell.
export default function EasingCurve({
  p1x,
  p1y,
  p2x,
  p2y,
  label,
}: {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
  label: string;
}) {
  const w = 92;
  const h = 52;
  const pad = 8;
  const x0 = pad;
  const y0 = h - pad;
  const x1 = w - pad;
  const y1 = pad;

  const map = (bx: number, by: number): [number, number] => [
    x0 + bx * (x1 - x0),
    y0 + by * (y1 - y0),
  ];

  const [cx1, cy1] = map(p1x, p1y);
  const [cx2, cy2] = map(p2x, p2y);
  const [ex, ey] = map(1, 1);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label} curve graph`}>
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--border)" strokeWidth="1" />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="var(--border)" strokeWidth="1" />
      <path
        d={`M ${x0} ${y0} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
      />
      <circle cx={x0} cy={y0} r="1.6" fill="var(--text-3)" />
      <circle cx={ex} cy={ey} r="1.6" fill="var(--accent-bright)" />
    </svg>
  );
}
