import { useEffect, useState } from "react";

/**
 * Fixed, decorative background behind every shell page: three slow blurred colour fields in the season's accent, sky and glow.
 *
 * The design's falling metasequoia leaves used to drift over this; they were removed as a distraction (owner feedback, 2026-09-30), and only the seasonal colour fields remain.
 *
 * Client-only: it carries no content, so the static HTML stays lean. Reduced motion stops the drift through the global rule in src/styles/motion.css.
 */
export function SeasonBackdrop() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="season-backdrop" aria-hidden="true">
      <div className="season-blob" style={{ width: "56vw", height: "56vw", left: "-14vw", top: "-20vw", background: "var(--accent)", opacity: 0.28, animation: "driftA 16s ease-in-out infinite" }} />
      <div className="season-blob" style={{ width: "46vw", height: "46vw", right: "-12vw", top: "26vh", background: "var(--sky)", opacity: 0.26, animation: "driftB 20s ease-in-out infinite" }} />
      <div className="season-blob" style={{ width: "42vw", height: "42vw", left: "28vw", bottom: "-18vw", background: "var(--glow)", opacity: 0.3, animation: "driftA 24s ease-in-out -8s infinite" }} />
    </div>
  );
}
