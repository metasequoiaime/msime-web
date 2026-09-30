import { useEffect, useState, type CSSProperties } from "react";

type Leaf = { left: string; width: number; height: number; color: string; dx: string; animation: string };

/** The 32 falling leaves from the design, with its deterministic spread (design-home §2.5). */
const LEAVES: Leaf[] = Array.from({ length: 32 }, (_, i) => {
  const duration = 11 + ((i * 7) % 12);
  const delay = -((i * 5.3) % duration);
  const size = 16 + ((i * 5) % 14);
  return {
    left: `${(i * 37 + 11) % 100}%`,
    width: size,
    height: size * 0.4,
    color: i % 3 ? "var(--accent)" : "var(--glow)",
    dx: `${(i % 2 ? 1 : -1) * (6 + (i % 5) * 3)}vw`,
    animation: `fall ${duration}s linear ${delay.toFixed(2)}s infinite`,
  };
});

/**
 * Fixed, decorative background behind every shell page: three slow blurred colour fields in the season's accent, sky and glow, plus falling metasequoia leaves.
 *
 * Client-only: it carries no content, so the static HTML stays lean and the build never has to render 35 decorative nodes per page. Leaves are skipped entirely for users who prefer reduced motion.
 */
export function SeasonBackdrop() {
  const [mounted, setMounted] = useState(false);
  const [leaves, setLeaves] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setLeaves(!reduce.matches);
    sync();
    setMounted(true);
    reduce.addEventListener("change", sync);
    return () => reduce.removeEventListener("change", sync);
  }, []);

  if (!mounted) return null;

  return (
    <div className="season-backdrop" aria-hidden="true">
      <div className="season-blob" style={{ width: "56vw", height: "56vw", left: "-14vw", top: "-20vw", background: "var(--accent)", opacity: 0.28, animation: "driftA 16s ease-in-out infinite" }} />
      <div className="season-blob" style={{ width: "46vw", height: "46vw", right: "-12vw", top: "26vh", background: "var(--sky)", opacity: 0.26, animation: "driftB 20s ease-in-out infinite" }} />
      <div className="season-blob" style={{ width: "42vw", height: "42vw", left: "28vw", bottom: "-18vw", background: "var(--glow)", opacity: 0.3, animation: "driftA 24s ease-in-out -8s infinite" }} />
      {leaves &&
        LEAVES.map((leaf) => (
          <div
            key={`${leaf.left}-${leaf.animation}`}
            className="season-leaf"
            style={{ left: leaf.left, width: leaf.width, height: leaf.height, background: leaf.color, animation: leaf.animation, "--dx": leaf.dx } as CSSProperties}
          />
        ))}
    </div>
  );
}
