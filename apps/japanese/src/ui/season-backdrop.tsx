import { useEffect, useState } from "react";

/**
 * Fixed, decorative background behind every shell page: three blurred colour fields in the season's accent, sky and glow.
 *
 * The design's falling metasequoia leaves used to drift over this; they were removed as a distraction (owner feedback, 2026-09-30), and only the seasonal colour fields remain.
 *
 * The fields are static on purpose. They used to drift on endless 16–24s transform loops, which made the compositor re-run the 60px blur on three viewport-sized layers, and the header's backdrop-filter above them, on every display frame for as long as a page stayed open; visitors reported high GPU use. Measured on the home page at 1920×1080@2x (Chrome, Apple M4 Pro, idle), the GPU process sat at ~14% CPU with frames dropping, against ~2% with the fields still. Swapping the blur for radial gradients kept most of that cost (~11%), because the per-frame work comes from the motion itself. Still, the blur is rasterised once and only redone on resize or a theme/season change.
 *
 * Client-only: it carries no content, so the static HTML stays lean.
 */
export function SeasonBackdrop() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="season-backdrop" aria-hidden="true">
      <div className="season-blob" style={{ width: "56vw", height: "56vw", left: "-14vw", top: "-20vw", background: "var(--accent)", opacity: 0.28 }} />
      <div className="season-blob" style={{ width: "46vw", height: "46vw", right: "-12vw", top: "26vh", background: "var(--sky)", opacity: 0.26 }} />
      <div className="season-blob" style={{ width: "42vw", height: "42vw", left: "28vw", bottom: "-18vw", background: "var(--glow)", opacity: 0.3 }} />
    </div>
  );
}
