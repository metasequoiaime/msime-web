import { useId, useState } from "react";
import type { KeyboardSkinDesign } from "../data/schemas";
import { keyboardArt, type ArtStop } from "./keyboard-art";

function Stops({ stops }: { stops: ArtStop[] }) {
  return stops.map(stop => <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />);
}

/** The four background patterns of the App's preview (`Pattern` in screen-keyboard-preview.tsx), drawn in the accent colour. */
function Pattern({ id, pattern, color, opacity }: { id: string; pattern: number; color: string; opacity: number }) {
  if (pattern === 1)
    return (
      <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="8.75" cy="8.75" r=".75" fill={color} fillOpacity={opacity} />
      </pattern>
    );
  if (pattern === 2)
    return (
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 0H20M0 0V20" fill="none" stroke={color} strokeOpacity={opacity} strokeWidth=".5" />
      </pattern>
    );
  return (
    <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M-12 42C4 0 27 65 60 1M-12 66C4 24 27 89 60 25" fill="none" stroke={color} strokeOpacity={opacity} strokeWidth="2" />
    </pattern>
  );
}

/**
 * A touch keyboard drawn in a community skin's colours, shapes and materials (see keyboard-art.ts for the source of each rule). Decorative: the card around it names the skin.
 *
 * `photoUrl` is tried only for designs that may carry a photo. Until it loads, or when it fails, the keyboard shows the design's own background colour or gradient, and the darkening layer that belongs to the photo is left out.
 */
export function KeyboardSkinPreview({ design, photoUrl, className }: { design: KeyboardSkinDesign; photoUrl?: string; className?: string }) {
  const art = keyboardArt(design);
  const unique = useId().replaceAll(":", "");
  const ids = { background: `skin-bg-${unique}`, pattern: `skin-pattern-${unique}`, shadow: `skin-shadow-${unique}`, key: `skin-key-${unique}`, action: `skin-action-${unique}` };
  const [photo, setPhoto] = useState<"loading" | "loaded" | "failed">("loading");
  const showPhoto = photoUrl !== undefined && photo !== "failed";
  const fill = (action: boolean) => (art.materialStops ? `url(#${action ? ids.action : ids.key})` : action ? art.actionColor : art.keyColor);

  return (
    <svg className={className} viewBox={`0 0 ${art.width} ${art.height}`} aria-hidden="true" focusable="false" style={{ fontFamily: art.fontFamily }} data-key-shape={design.keyShape ?? "rounded"} data-key-material={art.material}>
      <defs>
        {art.pattern !== 0 && <Pattern id={ids.pattern} pattern={art.pattern} color={art.accent} opacity={art.patternOpacity} />}
        {art.shadow && (
          <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy={art.shadow.dy} stdDeviation={art.shadow.blur} floodOpacity={art.shadow.opacity} />
          </filter>
        )}
        {art.gradient && (
          <linearGradient id={ids.background} x2={art.gradient.horizontal ? "1" : "0"} y2={art.gradient.horizontal ? "0" : "1"}>
            <stop stopColor={art.background} />
            <stop offset="1" stopColor={art.gradient.end} />
          </linearGradient>
        )}
        {art.materialStops && (
          <>
            <linearGradient id={ids.key} x2="0" y2="1">
              <Stops stops={art.materialStops.key} />
            </linearGradient>
            <linearGradient id={ids.action} x2="0" y2="1">
              <Stops stops={art.materialStops.action} />
            </linearGradient>
          </>
        )}
      </defs>
      <rect width={art.width} height={art.height} fill={art.gradient ? `url(#${ids.background})` : art.background} />
      {showPhoto && (
        <>
          <image href={photoUrl} width={art.width} height={art.height} preserveAspectRatio={`${art.photo.align} slice`} onLoad={() => setPhoto("loaded")} onError={() => setPhoto("failed")} />
          {photo === "loaded" && <rect width={art.width} height={art.height} fill="#000" fillOpacity={art.photo.shade} />}
        </>
      )}
      {art.pattern !== 0 && <rect width={art.width} height={art.height} fill={`url(#${ids.pattern})`} />}
      <text x="10" y="14" dominantBaseline="middle" fontSize="12" fill={art.accent}>
        水杉 IME
      </text>
      {art.keys.map(item => (
        <g key={item.label} filter={art.shadow ? `url(#${ids.shadow})` : undefined}>
          {item.depthPath && <path d={item.depthPath} fill={item.action ? art.actionColor : art.keyColor} opacity=".72" />}
          <path d={item.path} fill={fill(item.action)} fillOpacity={item.action ? 1 : art.keyOpacity} stroke={art.border ? art.border.color : "none"} strokeWidth={art.border?.width} />
          {item.paperPath && <path d={item.paperPath} fill="none" stroke="#000" strokeOpacity=".08" strokeWidth=".5" />}
          <text x={item.labelX} y={item.labelY} textAnchor="middle" dominantBaseline="middle" fontSize={item.fontSize} fill={item.action ? art.actionText : art.keyText}>
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
