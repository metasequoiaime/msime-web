import { Grove, type GroveTree } from "../ui";

/** Three depths of trees on the far shore, from the design's about illustration: faint back row, half-tone middle row, solid front row. */
const BACK_ROW: readonly GroveTree[] = [
  [40, 504, 0.8],
  [120, 521, 0.7],
  [300, 487, 0.9],
  [460, 521, 0.7],
  [620, 504, 0.8],
  [720, 530, 0.65],
];

const MIDDLE_ROW: readonly GroveTree[] = [
  [-10, 419, 1.3],
  [190, 453, 1.1],
  [390, 402, 1.4],
  [560, 436, 1.2],
  [700, 419, 1.3],
];

const FRONT_ROW: readonly GroveTree[] = [
  [70, 266, 2.2],
  [250, 334, 1.8],
  [520, 232, 2.4],
  [660, 317, 1.9],
];

const HILLS = "M0 610 C120 560 220 590 330 570 C450 548 560 590 680 566 C740 556 780 566 800 572 L800 640 L0 640Z";

/** The shore scene: hills and three rows of trees. Drawn twice, the second time mirrored across the waterline (y = 640) as the reflection. */
function Shore() {
  return (
    <>
      <path d={HILLS} style={{ fill: "var(--accent)", opacity: 0.12 }} />
      <Grove trees={BACK_ROW} opacity={0.28} />
      <Grove trees={MIDDLE_ROW} opacity={0.55} />
      <Grove trees={FRONT_ROW} />
    </>
  );
}

/**
 * "湖畔的水杉林" from the design's about page: a lakeside metasequoia grove under a pale sun, reflected in the water. Colours come from the theme and season tokens, so the scene follows both; only the sun and the ripples are fixed light tones, as in the design.
 *
 * Gradient stops and fills use `style` because SVG presentation attributes do not resolve `var()`.
 */
export function LakeIllustration({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className="block size-full rounded-panel shadow-soft"
    >
      <defs>
        <linearGradient id="about-lake-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--panel-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--panel)" }} />
        </linearGradient>
        <linearGradient id="about-lake-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--panel-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent-soft)" }} />
        </linearGradient>
      </defs>
      <rect width="800" height="640" fill="url(#about-lake-sky)" />
      <circle cx="560" cy="300" r="92" fill="#FFF4D6" opacity="0.35" />
      <circle cx="560" cy="300" r="54" fill="#FFF8E6" />
      <rect y="640" width="800" height="360" fill="url(#about-lake-water)" />
      <g>
        <Shore />
      </g>
      <g transform="matrix(1 0 0 -1 0 1280)" opacity="0.22">
        <Shore />
      </g>
      <g stroke="#FFFFFF" strokeLinecap="round" opacity="0.7">
        <path d="M90 700H260M420 690H620M180 760H330M500 780H700M60 850H200M360 880H560M600 930H740" strokeWidth="2.5" />
      </g>
      <rect y="638" width="800" height="3" style={{ fill: "var(--accent)", opacity: 0.25 }} />
    </svg>
  );
}
