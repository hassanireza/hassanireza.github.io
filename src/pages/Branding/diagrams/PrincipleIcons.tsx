// Hand-built SVG icons illustrating the four core principles, one per card.
export function SingleLightIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="pLight" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" fill="var(--bg-2)" stroke="var(--border)" />
      <clipPath id="pLightClip">
        <rect x="1" y="1" width="46" height="46" />
      </clipPath>
      <g clipPath="url(#pLightClip)">
        <circle cx="24" cy="19" r="17" fill="url(#pLight)" />
      </g>
      <circle cx="24" cy="19" r="2.5" fill="var(--text)" />
      <path d="M24 32 L24 40 M16 40 H32" stroke="var(--text-3)" strokeWidth="1" />
    </svg>
  );
}

export function BlackVoidIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" fill="var(--bg-2)" stroke="var(--border-hover)" />
      <rect x="10" y="10" width="12" height="12" fill="var(--bg)" />
      <rect x="26" y="26" width="12" height="12" fill="var(--bg)" />
      <rect x="26" y="10" width="12" height="12" fill="var(--bg-3)" stroke="var(--border-hover)" strokeDasharray="2 2" />
      <rect x="10" y="26" width="12" height="12" fill="var(--bg-3)" stroke="var(--border-hover)" strokeDasharray="2 2" />
    </svg>
  );
}

export function TextureIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" fill="var(--bg-2)" stroke="var(--border)" />
      <g stroke="var(--text-3)" strokeWidth="0.6" opacity="0.8">
        <line x1="6" y1="8" x2="42" y2="6" />
        <line x1="6" y1="14" x2="40" y2="12" />
        <line x1="8" y1="20" x2="42" y2="19" />
        <line x1="6" y1="26" x2="38" y2="27" />
        <line x1="8" y1="33" x2="42" y2="32" />
        <line x1="6" y1="40" x2="40" y2="41" />
      </g>
      <rect x="14" y="14" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1" />
    </svg>
  );
}

export function MotionWhisperIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" fill="var(--bg-2)" stroke="var(--border)" />
      <path d="M6 34 C 14 34, 16 12, 24 12 S 34 34, 42 34" stroke="var(--accent)" strokeWidth="1.2" fill="none" />
      <circle cx="24" cy="12" r="2" fill="var(--text)" />
    </svg>
  );
}
