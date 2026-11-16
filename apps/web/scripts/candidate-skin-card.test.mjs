import test from 'node:test';
import assert from 'node:assert/strict';
import { candidatePreviewKey, candidateTraits, packageSize } from '../src/skins/candidate-card-data.ts';
import { contrast, previewPalette } from '../src/skins/preview-palette.ts';

/** An RGBA image of `width` by `height` filled with `fill`, with `paint(x, y)` overriding single pixels. */
function image(width, height, fill, paint = () => undefined) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = paint(x, y) ?? fill;
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  return data;
}

const rgb = value => [1, 3, 5].map(index => Number.parseInt(value.slice(index, index + 2), 16));

test('an opaque preview gives the hero its exact backdrop, and the name its accent, readable on it', () => {
  // A beige backdrop with a pale window strip along the bottom edge and an orange highlight in the bottom right.
  const backdrop = [240, 230, 220];
  const data = image(96, 40, backdrop, (x, y) => {
    if (y >= 37) return [255, 245, 235];
    if (x > 60 && y > 20) return [230, 110, 30];
  });
  const palette = previewPalette(data, 96, 40);
  assert.equal(palette.surface, '#f0e6dc', 'the most common border colour, not one merged with the window strip');
  assert.equal(palette.scheme, 'light');
  assert.equal(palette.clearTopLeft, true);
  const [r, g, b] = rgb(palette.title);
  assert.ok(r > g && g > b, `the title keeps the orange hue: ${palette.title}`);
  for (const background of [palette.surface, palette.glow]) {
    assert.ok(contrast(rgb(palette.title), rgb(background)) >= 3.2, 'the large name reads against both ends of the gradient');
    assert.ok(contrast(rgb(palette.text), rgb(background)) >= 4.5, 'the subtitle and traits read as body text');
  }
});

test('content in the top left keeps the preview out from under the text', () => {
  const data = image(96, 40, [240, 240, 240], (x, y) => (x < 20 && y < 10 ? [200, 40, 60] : undefined));
  assert.equal(previewPalette(data, 96, 40).clearTopLeft, false);
});

test('a transparent preview is tinted from its accent, and its empty corners count as clear', () => {
  const data = image(60, 30, [0, 0, 0, 0], (x, y) => (x > 30 && y > 12 ? [30, 60, 160] : undefined));
  const palette = previewPalette(data, 60, 30);
  const [r, g, b] = rgb(palette.surface);
  assert.ok(b > r && b > g && r > 200, `a light blue tint: ${palette.surface}`);
  assert.equal(palette.clearTopLeft, true);
});

test('a dark grey preview gets a dark hero with light text and no invented accent', () => {
  const data = image(96, 30, [34, 35, 34], (x, y) => (x > 10 && x < 86 && y > 6 && y < 24 ? [80, 80, 80] : undefined));
  const palette = previewPalette(data, 96, 30);
  assert.equal(palette.surface, '#222322');
  assert.equal(palette.scheme, 'dark');
  const [r, g, b] = rgb(palette.title);
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 8, `the title stays grey: ${palette.title}`);
  assert.ok(contrast(rgb(palette.title), rgb(palette.surface)) >= 3.2);
});

test('traits only say what the list row proves', () => {
  assert.deepEqual(candidateTraits({ category: 'cute', fileCount: 3, size: 234068 }), ['可爱', '装饰图与背景图', '皮肤包 229 KB']);
  assert.deepEqual(candidateTraits({ category: 'nature', fileCount: 2, size: 105169 }), ['自然', '图片装饰', '皮肤包 103 KB']);
  assert.deepEqual(candidateTraits({ category: 'other', fileCount: 1, size: 14890 }), ['皮肤包 15 KB'], 'one image could still be a reused decoration, and 其他 says nothing');
  assert.deepEqual(candidateTraits({ size: 10 }), ['皮肤包 1 KB'], 'a copy cached before the Function kept file_count');
  assert.equal(packageSize(3 * 1024 * 1024 + 200_000), '3.2 MB');
});

test('a replaced package gets a new preview address even when its version stays', () => {
  assert.equal(candidatePreviewKey({ version: '1.0.1', size: 234068 }), '1.0.1-234068');
  assert.notEqual(candidatePreviewKey({ version: '1.0.1', size: 234068 }), candidatePreviewKey({ version: '1.0.1', size: 234069 }));
  assert.equal(candidatePreviewKey({ version: '', size: 5 }), '5');
  assert.match(candidatePreviewKey({ version: 'v'.repeat(64), size: Number.MAX_SAFE_INTEGER }), /^[\w.+-]{1,81}$/, 'the longest key still passes the preview route');
});
