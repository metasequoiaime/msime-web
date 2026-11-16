/*
 * The colours of a candidate skin card's hero, read from the skin's preview image. The public list carries no manifest, so the preview is the only thing on the page that shows the skin's own palette: the surface comes from the image's border, which is the backdrop the author drew the window on, and the accent from its most common saturated hue, which is usually the highlight, the decoration or the mascot. The hero is painted with the surface so the opaque preview sits on it without a visible frame, and the skin name is set in the accent, adjusted until it reads against the surface.
 */

export type Rgb = readonly [number, number, number];

export type PreviewPalette = {
  /** The hero's base colour, matching the preview's border when the preview is opaque. */
  surface: string;
  /** The lighter (or, on a dark surface, warmer) end of the hero gradient, at the top left where the text sits. */
  glow: string;
  /** The skin name in the hero. */
  title: string;
  /** The subtitle and traits under the name. */
  text: string;
  /** Whether the top left of the preview is empty backdrop (or transparent), so the hero's name and traits can overlap it and the preview can be drawn larger. */
  clearTopLeft: boolean;
  scheme: "light" | "dark";
};

const WHITE: Rgb = [255, 255, 255];
const DARK_INK: Rgb = [31, 36, 32];
const LIGHT_INK: Rgb = [244, 246, 242];
/** The hero of a preview that has no usable colour: the site's own light panel tint. */
const NEUTRAL_SURFACE: Rgb = [238, 242, 235];

export const hex = ([r, g, b]: Rgb) => `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance. */
export const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG contrast ratio. */
export const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const k = h / 360;
  return [hue(k + 1 / 3) * 255, hue(k) * 255, hue(k - 1 / 3) * 255];
}

const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Moves `colour` towards black (on a light background) or white (on a dark one) in small lightness steps until it reaches `ratio` against every colour in `against`, keeping its hue. */
export function readable(colour: Rgb, against: readonly Rgb[], ratio: number, scheme: "light" | "dark"): Rgb {
  const [h, s, start] = toHsl(colour);
  let l = start;
  for (let step = 0; step <= 50; step += 1) {
    const candidate = fromHsl(h, s, l);
    if (against.every(background => contrast(candidate, background) >= ratio)) return candidate;
    l = scheme === "light" ? Math.max(0, l - 0.02) : Math.min(1, l + 0.02);
  }
  return scheme === "light" ? DARK_INK : LIGHT_INK;
}

const OPAQUE = 200;

/** The mean of the most common colour among `pixels`, quantised to 32 levels per channel, so a border that is mostly one colour is not dragged towards a different band, a corner ornament or the edge of the window, and a flat backdrop comes back exactly. */
function dominant(pixels: Rgb[]): Rgb {
  const buckets = new Map<number, { count: number; sum: [number, number, number] }>();
  for (const pixel of pixels) {
    const key = ((pixel[0] >> 3) << 10) | ((pixel[1] >> 3) << 5) | (pixel[2] >> 3);
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    bucket.sum[0] += pixel[0];
    bucket.sum[1] += pixel[1];
    bucket.sum[2] += pixel[2];
    buckets.set(key, bucket);
  }
  const best = [...buckets.values()].reduce((top, bucket) => (bucket.count > top.count ? bucket : top));
  return [best.sum[0] / best.count, best.sum[1] / best.count, best.sum[2] / best.count];
}

/**
 * The hero palette for an RGBA image of `width` by `height` (a downscaled copy of the preview is plenty). Pure, so it is tested without a canvas.
 */
export function previewPalette(data: ArrayLike<number>, width: number, height: number): PreviewPalette {
  const ring: Rgb[] = [];
  let ringTotal = 0;
  const border = Math.max(1, Math.round(Math.min(width, height) * 0.04));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      ringTotal += 1;
      const i = (y * width + x) * 4;
      if (data[i + 3] >= OPAQUE) ring.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  const opaqueEdge = ringTotal > 0 && ring.length / ringTotal >= 0.6;
  const edge = opaqueEdge ? dominant(ring) : undefined;

  // Hue bins of 15°, weighted by saturation; pixels close to the backdrop are skipped so a tinted background does not outvote the window and its decoration.
  const bins = Array.from({ length: 24 }, () => ({ weight: 0, sum: [0, 0, 0] as [number, number, number] }));
  let saturatedWeight = 0;
  let opaqueCount = 0;
  for (let i = 0; i < width * height * 4; i += 4) {
    if (data[i + 3] < OPAQUE) continue;
    opaqueCount += 1;
    const pixel: Rgb = [data[i], data[i + 1], data[i + 2]];
    if (edge && distance(pixel, edge) < 36) continue;
    const [h, s, l] = toHsl(pixel);
    if (s < 0.28 || l < 0.16 || l > 0.86) continue;
    const weight = s * (1 - Math.abs(l - 0.5));
    const bin = bins[Math.floor(h / 15) % 24];
    bin.weight += weight;
    bin.sum[0] += pixel[0] * weight;
    bin.sum[1] += pixel[1] * weight;
    bin.sum[2] += pixel[2] * weight;
    saturatedWeight += weight;
  }
  // The name runs across the top of the hero and the subtitle and traits down its left side, so those are the two strips of the preview they may cover.
  const clear = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return data[i + 3] < 64 || (edge !== undefined && distance([data[i], data[i + 1], data[i + 2]], edge) < 30);
  };
  let covered = 0;
  let busy = 0;
  for (let y = 0; y < Math.ceil(height * 0.42); y += 1) {
    for (let x = 0; x < Math.ceil(width * 0.66); x += 1) {
      if (x >= width * 0.45 && y >= height * 0.12) continue;
      covered += 1;
      if (!clear(x, y)) busy += 1;
    }
  }
  const clearTopLeft = covered > 0 && busy / covered <= 0.02;
  const top = bins.reduce((best, bin) => (bin.weight > best.weight ? bin : best), bins[0]);
  // A handful of coloured pixels in a grey skin is an icon or anti-aliasing, not the skin's colour.
  const accent: Rgb | undefined = opaqueCount > 0 && saturatedWeight / opaqueCount > 0.01 && top.weight > 0 ? (top.sum.map(value => value / top.weight) as unknown as Rgb) : undefined;

  const surface: Rgb = edge ?? (accent ? mix(accent, WHITE, 0.86) : NEUTRAL_SURFACE);
  const scheme = luminance(surface) > 0.36 ? "light" : "dark";
  const glow = scheme === "light" ? mix(surface, WHITE, 0.55) : mix(surface, accent ?? WHITE, 0.16);
  const ink = scheme === "light" ? DARK_INK : LIGHT_INK;
  // Large text needs 3:1; the name is at least 30px, so 3.2 leaves a little room for the gradient between the two ends.
  const title = readable(accent ?? mix(surface, ink, 0.7), [surface, glow], 3.2, scheme);
  const text = readable(mix(title, ink, 0.55), [surface, glow], 4.6, scheme);
  return { surface: hex(surface), glow: hex(glow), title: hex(title), text: hex(text), clearTopLeft, scheme };
}

const cache = new Map<string, PreviewPalette | null>();

/** Reads the palette of a loaded preview `<img>` through a small canvas. The preview is same-origin (or a `data:` URL for a private skin), so the canvas is never tainted. Without a 2D context the hero keeps its neutral colours. Results are kept per image address, so a remounted card does not sample again. */
export function samplePreviewPalette(image: HTMLImageElement): PreviewPalette | null {
  const key = image.currentSrc || image.src;
  const known = cache.get(key);
  if (known !== undefined) return known;
  let palette: PreviewPalette | null = null;
  const width = Math.min(96, image.naturalWidth);
  const height = Math.max(1, Math.round((image.naturalHeight / Math.max(1, image.naturalWidth)) * width));
  const context = width > 0 ? document.createElement("canvas").getContext("2d", { willReadFrequently: true }) : null;
  if (context) {
    context.canvas.width = width;
    context.canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    palette = previewPalette(context.getImageData(0, 0, width, height).data, width, height);
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, palette);
  return palette;
}
