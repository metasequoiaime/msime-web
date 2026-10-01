import type { KeyboardSkinDesign } from "../data/schemas.ts";

/*
 * How a community keyboard skin looks, worked out from its design alone (the backend sends no preview image).
 *
 * Ported from the msime monorepo, packages/ui/src/keyboard/: `skinColor` and `readableSkinText` from touch-keyboard-skin-design.ts, the key outlines from keyboard-shape.ts, and the drawing rules (palette, gradient, photo, pattern, material, border, shadow, labels) from screen-keyboard-preview.tsx with its touch layout (`touchKeyboardRows` in keyboard-layouts.ts). keyboard-skin-styles.ts applies the same rules to the live keyboard. The App draws on a 1100-wide canvas; this one is the size of a phone keyboard in points, so the design's point values (corner radius, border width, shadow, pattern spacing) keep their proportions in a card a few hundred pixels wide.
 */

export const ART_WIDTH = 390;
export const ART_HEIGHT = 232;

/** Top of the first key row; the strip above carries the "水杉 IME" label in the accent colour, as in the App. */
const TOP = 28;
const SIDE = 7;
const BOTTOM = 7;
const KEY_GAP = 4;
const ROW_GAP = 4;

type LayoutKey = { label: string; weight: number };
const letters = (text: string): LayoutKey[] => [...text].map(label => ({ label, weight: 1 }));
const key = (label: string, weight: number): LayoutKey => ({ label, weight });

/** `touchKeyboardRows`: three letter rows over the control strip. An empty label is the half-key inset that centres the home row. */
const TOUCH_ROWS: LayoutKey[][] = [
  letters("qwertyuiop"),
  [key("", 0.5), ...letters("asdfghjkl"), key("", 0.5)],
  [key("⇧", 1.5), ...letters("zxcvbnm"), key("⌫", 1.5)],
  [key("符号", 1.5), key("中/英", 1.5), key("空格", 4.5), key("，", 1), key("↵", 1.5)],
];

/** `actionKeyboardLabels`, limited to the keys of the touch layout. */
const ACTION_LABELS = new Set(["⇧", "⌫", "↵"]);

export const MONOSPACED_FONT = "ui-monospace, SFMono-Regular, Consolas, monospace";

/** `skinColor`: a 0xRRGGBB integer as `#rrggbb`. */
export function skinColor(value: number): string {
  return `#${Math.min(Math.max(Math.round(value), 0), 0xffffff).toString(16).padStart(6, "0")}`;
}

function luminance(rgb: number): number {
  const channel = (shift: number) => {
    const value = ((rgb >> shift) & 255) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

/** `readableSkinText`: black or white, whichever reads on `background`. The App labels action keys with it instead of the design's key text colour. */
export function readableSkinText(background: number): number {
  return luminance(background) > 0.179 ? 0 : 0xffffff;
}

/** `keyboardKeyPath`: the outline of one key for each `keyShape`. */
export function keyboardKeyPath(x: number, y: number, width: number, height: number, shape: string, radius: number): string {
  if (shape === "pebble")
    return `M${x + width * 0.35} ${y}C${x + width * 0.83} ${y} ${x + width} ${y + height * 0.04} ${x + width} ${y + height * 0.3}C${x + width} ${y + height * 0.85} ${x + width * 0.9} ${y + height} ${x + width * 0.68} ${y + height}C${x + width * 0.18} ${y + height} ${x} ${y + height * 0.97} ${x} ${y + height * 0.7}C${x} ${y + height * 0.2} ${x + width * 0.06} ${y} ${x + width * 0.35} ${y}Z`;
  if (shape === "ticket") {
    const r = Math.min(width, height) * 0.12;
    return `M${x} ${y}H${x + width}V${y + height / 2 - r}A${r} ${r} 0 0 0 ${x + width} ${y + height / 2 + r}V${y + height}H${x}V${y + height / 2 + r}A${r} ${r} 0 0 0 ${x} ${y + height / 2 - r}Z`;
  }
  const r = shape === "capsule" ? height / 2 : Math.min(radius, height / 2, width / 2);
  return `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

export type ArtKey = {
  label: string;
  action: boolean;
  /** Centre of the label. */
  labelX: number;
  labelY: number;
  fontSize: number;
  path: string;
  /** The darker slab under a raised key, drawn 3 units lower. */
  depthPath?: string;
  /** The ruled lines across a paper key. */
  paperPath?: string;
};

/** A gradient stop as in the App's key material gradients. */
export type ArtStop = { offset: number; color: string; opacity: number };

export type KeyboardArt = {
  width: number;
  height: number;
  background: string;
  /** Second background colour; the gradient runs left to right when `horizontal`, else top to bottom. */
  gradient?: { end: string; horizontal: boolean };
  /** How a photo wallpaper is fitted and darkened, when the design has one. */
  photo: { align: "xMinYMin" | "xMidYMid" | "xMaxYMax"; shade: number };
  pattern: 0 | 1 | 2 | 3;
  patternOpacity: number;
  accent: string;
  keyColor: string;
  actionColor: string;
  keyText: string;
  actionText: string;
  /** Applied to letter keys only; action keys are always opaque. */
  keyOpacity: number;
  material: "flat" | "raised" | "glass" | "paper";
  /** Fill stops for glass and raised keys (letter keys, then action keys). */
  materialStops?: { key: ArtStop[]; action: ArtStop[] };
  border?: { width: number; color: string };
  shadow?: { opacity: number; dy: number; blur: number };
  fontFamily?: string;
  keys: ArtKey[];
};

/** The editor sets `photoShade` and `photoPosition` together with a photo, and the list strips the photo itself, so these are the only sign in a list item that the skin has one. The page then asks `/api/skins/keyboard/<id>/photo`, which answers 404 when there is none after all. */
export const mayHavePhoto = (design: KeyboardSkinDesign) => design.photoShade !== undefined || design.photoPosition !== undefined;

const materialStops = (material: "raised" | "glass", color: string, opacity: number): ArtStop[] => [
  { offset: 0, color: "#fff", opacity: material === "glass" ? 0.24 : 0.13 },
  { offset: 0.48, color, opacity },
  { offset: 1, color: "#000", opacity: material === "glass" ? 0.03 : 0.1 },
];

export function keyboardArt(design: KeyboardSkinDesign): KeyboardArt {
  const shape = design.keyShape ?? "rounded";
  const material = design.keyMaterial ?? "flat";
  const keyOpacity = design.keyOpacity ?? 1;
  const keyColor = skinColor(design.keyBackground);
  const actionColor = skinColor(design.actionBackground);
  const position = design.photoPosition ?? 0.5;
  const rowHeight = (ART_HEIGHT - TOP - BOTTOM - ROW_GAP * (TOUCH_ROWS.length - 1)) / TOUCH_ROWS.length;
  const raised = material === "raised";

  const keys: ArtKey[] = [];
  TOUCH_ROWS.forEach((row, rowIndex) => {
    const available = ART_WIDTH - SIDE * 2 - KEY_GAP * (row.length - 1);
    const total = row.reduce((sum, item) => sum + item.weight, 0);
    const y = TOP + rowIndex * (rowHeight + ROW_GAP);
    let x = SIDE;
    for (const item of row) {
      const width = (available * item.weight) / total;
      const left = x;
      x += width + KEY_GAP;
      if (!item.label) continue;
      const path = keyboardKeyPath(left, y, width, rowHeight - (raised ? 3 : 0), shape, design.cornerRadius);
      keys.push({
        label: item.label,
        action: ACTION_LABELS.has(item.label),
        labelX: left + width / 2,
        labelY: y + rowHeight / 2,
        fontSize: [...item.label].length === 1 ? 15 : 12,
        path,
        depthPath: raised ? keyboardKeyPath(left, y + 3, width, rowHeight - 3, shape, design.cornerRadius) : undefined,
        paperPath: material === "paper" ? `${path}M${left + 3} ${y + 10}H${left + width - 3}M${left + 3} ${y + 18}H${left + width - 3}M${left + 3} ${y + 26}H${left + width - 3}` : undefined,
      });
    }
  });

  return {
    width: ART_WIDTH,
    height: ART_HEIGHT,
    background: skinColor(design.background),
    gradient: design.gradientEnd === undefined ? undefined : { end: skinColor(design.gradientEnd), horizontal: design.gradientHorizontal === true },
    photo: { align: position < 0.34 ? "xMinYMin" : position > 0.66 ? "xMaxYMax" : "xMidYMid", shade: design.photoShade ?? 0.25 },
    pattern: design.pattern,
    patternOpacity: design.patternOpacity ?? 0.15,
    accent: skinColor(design.accent),
    keyColor,
    actionColor,
    keyText: skinColor(design.keyForeground),
    actionText: skinColor(readableSkinText(design.actionBackground)),
    keyOpacity,
    material,
    materialStops: material === "glass" || material === "raised" ? { key: materialStops(material, keyColor, keyOpacity), action: materialStops(material, actionColor, 1) } : undefined,
    border: design.borderWidth > 0 ? { width: Math.min(design.borderWidth, 2), color: skinColor(design.customBorderColor ?? design.accent) } : undefined,
    shadow: design.shadow > 0 ? { opacity: design.shadow, dy: 1, blur: 2 } : undefined,
    fontFamily: design.monospaced ? MONOSPACED_FONT : undefined,
    keys,
  };
}
