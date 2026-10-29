/** Hill shades derived from the CI background, so they follow `--r-bg`. */
const HILL = "color-mix(in srgb, var(--r-bg), white 4%)";
const DEEP = "color-mix(in srgb, var(--r-bg), black 22%)";

/**
 * Hero backdrop · the original 4 atmosphere layers (glow · hills · dust · rings) in CI A+ colours.
 * Static, decorative, slightly oversized so the edges never show.
 */
export function HomeHeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-[4%] z-0">
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id="hero-bg-pink" cx="0%" cy="0%" r="70%">
            <stop offset="0%" stopColor="var(--r-pri)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--r-pri)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-bg-mint" cx="100%" cy="100%" r="70%">
            <stop offset="0%" stopColor="var(--r-acc)" stopOpacity="0.36" />
            <stop offset="100%" stopColor="var(--r-acc)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-bg-centre" cx="65%" cy="40%" r="45%">
            <stop offset="0%" stopColor="var(--r-pri)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--r-pri)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-bg-mist" x1="50%" y1="100%" x2="50%" y2="20%">
            <stop offset="0%" style={{ stopColor: DEEP }} stopOpacity="0.9" />
            <stop offset="100%" style={{ stopColor: DEEP }} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="var(--r-bg)" />
        <rect width="1920" height="1080" fill="url(#hero-bg-pink)" />
        <rect width="1920" height="1080" fill="url(#hero-bg-mint)" />
        <rect width="1920" height="1080" fill="url(#hero-bg-centre)" />
        <path
          d="M0 720 C280 620 520 780 760 690 C980 610 1180 760 1440 680 C1680 610 1840 700 1920 650 L1920 1080 L0 1080 Z"
          style={{ fill: HILL }}
          opacity="0.7"
        />
        <path d="M0 840 C340 760 640 900 960 820 C1240 750 1560 880 1920 800 L1920 1080 L0 1080 Z" fill="url(#hero-bg-mist)" />
        <path
          d="M0 900 C260 820 480 960 720 880 C980 790 1200 950 1480 870 C1700 810 1840 900 1920 860 L1920 1080 L0 1080 Z"
          style={{ fill: DEEP }}
          opacity="0.85"
        />
        <g fill="var(--r-text)">
          <circle cx="180" cy="160" r="2.5" opacity="0.55" />
          <circle cx="540" cy="120" r="2.2" opacity="0.5" />
          <circle cx="980" cy="90" r="2" opacity="0.45" />
          <circle cx="1260" cy="180" r="2.8" opacity="0.5" />
          <circle cx="1680" cy="140" r="2.4" opacity="0.48" />
          <circle cx="460" cy="640" r="2.1" opacity="0.35" />
          <circle cx="1100" cy="560" r="2.3" opacity="0.4" />
          <circle cx="1600" cy="620" r="2.6" opacity="0.38" />
        </g>
        <g fill="none" strokeWidth="1.5" opacity="0.4">
          <circle cx="420" cy="400" r="8" stroke="var(--r-pri)" />
          <circle cx="1320" cy="260" r="6" stroke="var(--r-acc)" />
          <circle cx="900" cy="700" r="10" stroke="var(--r-pri)" />
        </g>
      </svg>
    </div>
  );
}
