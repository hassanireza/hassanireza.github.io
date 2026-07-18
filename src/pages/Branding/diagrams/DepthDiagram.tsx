// Shows how Void / Charcoal / Deep Charcoal stack as layered surfaces,
// each catching a fraction more of the site's single ambient light source.
export default function DepthDiagram() {
  return (
    <svg
      className="depth-diagram"
      width="100%"
      viewBox="0 0 760 220"
      fill="none"
      role="img"
      aria-label="Diagram of three layered background surfaces catching one light source"
    >
      <defs>
        <radialGradient id="depthLight" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="760" height="220" fill="var(--bg)" />
      <rect x="0" y="0" width="760" height="220" fill="url(#depthLight)" />

      <rect x="40" y="150" width="680" height="50" fill="var(--bg)" stroke="var(--border)" />
      <text x="60" y="180" fill="var(--text-3)" fontFamily="JetBrains Mono" fontSize="11">VOID · #08090b</text>

      <rect x="90" y="95" width="580" height="50" fill="var(--bg-2)" stroke="var(--border)" />
      <text x="110" y="125" fill="var(--text-2)" fontFamily="JetBrains Mono" fontSize="11">CHARCOAL · #0d1013</text>

      <rect x="150" y="40" width="460" height="50" fill="var(--bg-3)" stroke="var(--border-hover)" />
      <text x="170" y="70" fill="var(--accent-bright)" fontFamily="JetBrains Mono" fontSize="11">DEEP CHARCOAL · #12161a</text>
    </svg>
  );
}
