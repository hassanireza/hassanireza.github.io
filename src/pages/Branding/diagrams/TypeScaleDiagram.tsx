// Compares the three type roles on a shared baseline, so relative
// size and weight can be read at a glance instead of only in prose.
export default function TypeScaleDiagram() {
  return (
    <svg
      width="100%"
      viewBox="0 0 760 130"
      role="img"
      aria-label="Diagram comparing display, body, and utility type sizes on a shared baseline"
    >
      <rect width="760" height="130" fill="var(--bg-2)" stroke="var(--border)" />
      <line x1="0" y1="100" x2="760" y2="100" stroke="var(--border)" strokeWidth="1" />
      <text x="30" y="88" fontFamily="Cormorant Garamond" fontStyle="italic" fontWeight="300" fontSize="52" fill="var(--text)">Aa</text>
      <text x="150" y="98" fontFamily="Jost" fontWeight="300" fontSize="17" fill="var(--text-2)">Aa</text>
      <text x="230" y="98" fontFamily="JetBrains Mono" fontWeight="400" fontSize="11" fill="var(--accent)">Aa</text>
      <text x="30" y="115" fontFamily="JetBrains Mono" fontSize="10" fill="var(--text-3)" letterSpacing="1">DISPLAY 56PX</text>
      <text x="150" y="115" fontFamily="JetBrains Mono" fontSize="10" fill="var(--text-3)" letterSpacing="1">BODY 18PX</text>
      <text x="230" y="115" fontFamily="JetBrains Mono" fontSize="10" fill="var(--text-3)" letterSpacing="1">UTILITY 12PX</text>
    </svg>
  );
}
