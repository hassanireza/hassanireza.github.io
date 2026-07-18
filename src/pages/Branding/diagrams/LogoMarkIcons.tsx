// Hand-built SVG marks for the Abyssal Liturgy identity system.
// Same boxed convention as PrincipleIcons: a hairline frame, drawn on
// var(--bg-2), rendered only in text/accent tones, never in flat color.

export function TidalHaloMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke="var(--text)" strokeOpacity="0.9" strokeWidth="1" />
      <circle cx="50" cy="50" r="32" stroke="var(--text)" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="50" cy="50" r="18" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="50" y1="4" x2="50" y2="30" stroke="var(--text)" strokeOpacity="0.75" strokeWidth="1" />
      <line x1="42" y1="12" x2="58" y2="12" stroke="var(--text)" strokeOpacity="0.75" strokeWidth="1" />
      <line x1="50" y1="70" x2="50" y2="92" stroke="var(--text)" strokeOpacity="0.6" strokeWidth="1" />
      <circle cx="50" cy="92" r="2.2" fill="var(--text)" fillOpacity="0.7" />
    </svg>
  );
}

export function ErosionMapMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M18 32 Q50 12 82 32" stroke="var(--text)" strokeOpacity="0.85" strokeWidth="1" fill="none" />
      <path d="M18 52 Q50 32 82 52" stroke="var(--text)" strokeOpacity="0.55" strokeWidth="1" fill="none" />
      <path d="M18 72 Q50 52 82 72" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function ReliquaryDropMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path
        d="M50 10 C 32 30, 32 46, 50 58 C 68 46, 68 30, 50 10 Z"
        stroke="var(--text)"
        strokeOpacity="0.85"
        strokeWidth="1"
      />
      <line x1="50" y1="58" x2="50" y2="88" stroke="var(--text)" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="50" cy="90" r="2.4" fill="var(--text)" fillOpacity="0.7" />
    </svg>
  );
}

export function ChartMonogramMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <line x1="12" y1="50" x2="88" y2="50" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1" />
      <line x1="50" y1="12" x2="50" y2="88" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="50" cy="50" r="5" fill="var(--text)" fillOpacity="0.85" />
      <text
        x="50"
        y="76"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11"
        letterSpacing="2"
        fill="var(--text-2)"
      >
        R·H
      </text>
    </svg>
  );
}

type MarkComponentType = ({ size }: { size?: number }) => ReturnType<typeof TidalHaloMark>;

export const LOGO_MARK_COMPONENTS: Record<string, MarkComponentType> = {
  "tidal-halo": TidalHaloMark,
  "erosion-map": ErosionMapMark,
  "reliquary-drop": ReliquaryDropMark,
  "chart-mark": ChartMonogramMark,
};
