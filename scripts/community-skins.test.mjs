import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCandidatePreview, loadCandidateSkins, loadKeyboardPhoto, loadKeyboardSkins, MAX_SKIN_QUERY_BYTES as SERVER_MAX_QUERY, skinListParams } from '../shared/community-skins.ts';
import { onRequest as keyboardList } from '../functions/api/skins/keyboard/index.ts';
import { onRequest as candidateList } from '../functions/api/skins/candidate/index.ts';
import { onRequest as keyboardPhoto } from '../functions/api/skins/keyboard/[id]/photo.ts';
import { onRequest as candidatePreview } from '../functions/api/skins/candidate/[id]/preview.ts';
import { MAX_SKIN_QUERY_BYTES, skinListPath, skinsQuery } from '../src/data/queries.ts';
import { keyboardSkinDesignSchema } from '../src/data/schemas.ts';
import { ART_HEIGHT, ART_WIDTH, keyboardArt, keyboardKeyPath, mayHavePhoto, MONOSPACED_FONT, readableSkinText, skinColor } from '../src/skins/keyboard-art.ts';

const ORIGIN = 'https://api.msime.app';
const KEYBOARD_ID = 'ea041e49-e1ab-48ff-8b06-942ec9c291b9';
const CANDIDATE_ID = '2d605cc4-f16a-4a76-ae93-a24432263eaa';
// The smallest byte strings imageExtension accepts as JPEG and PNG.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]).toString('base64');
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]).toString('base64');

/** 水杉留白, the App's default template, as production returns it. */
const plainDesign = { accent: 0x185c47, shadow: 0, pattern: 0, background: 0xe8f0eb, monospaced: false, borderWidth: 0, cornerRadius: 8, keyBackground: 0xffffff, keyForeground: 0x17251d, actionBackground: 0x185c47 };
/** 极光雪山小屋, an AI photo skin: gradient, ticket keys, raised material, translucent keys and a photo. */
const photoDesign = { accent: 7062968, shadow: 0.3, pattern: 0, keyShape: 'ticket', background: 1714746, keyOpacity: 0.92, monospaced: false, photoShade: 0.08, borderWidth: 1, gradientEnd: 3809360, keyMaterial: 'raised', cornerRadius: 4, keyBackground: 2965589, keyForeground: 15267064, photoPosition: 0.5, actionBackground: 15243868, gradientHorizontal: true };

const backendKeyboard = (id = KEYBOARD_ID, design = photoDesign) => ({ id, name: '极光雪山小屋', description: '', author: '水杉小莫', design, downloads: 3, rating_count: 2, rating_average: 4.5, owned: false, my_rating: 0 });
const backendCandidate = (id = CANDIDATE_ID) => ({ id, package_id: 'orange-cat', name: '橘猫', description: '', author: '小莫', version: '1.0.0', license: { code: '', assets: 'CC-BY-4.0', source: '' }, size: 13645, file_count: 3, downloads: 0, rating_count: 0, rating_average: 0, owned: false, my_rating: 0, created_at: '2026-10-01T06:47:24.764127Z' });

const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const call = (handler, path, { env = {}, method = 'GET', params } = {}) => handler({ request: new Request(`https://msime.app${path}`, { method }), env, waitUntil: () => {}, params });

// ---- loaders ----

test('list parameters follow the backend limits and normalise the search', () => {
  const params = path => skinListParams(new URL(path, 'https://msime.app'));
  assert.deepEqual(params('/api/skins/keyboard'), { offset: 0, q: '' });
  assert.deepEqual(params('/api/skins/keyboard?offset=20&q=%20月%20'), { offset: 20, q: '月' });
  for (const bad of ['?offset=-1', '?offset=1.5', '?offset=abc', '?offset=100001', `?q=${'月'.repeat(43)}`]) assert.equal(params(`/api/skins/keyboard${bad}`), undefined, bad);
  assert.deepEqual(params(`/api/skins/keyboard?q=${'月'.repeat(42)}`), { offset: 0, q: '月'.repeat(42) }, '42 three-byte characters are 126 bytes');
  assert.equal(MAX_SKIN_QUERY_BYTES, SERVER_MAX_QUERY, 'the search box and the Function agree on the limit');
});

test('keyboard skins are re-keyed, and a row the site cannot draw is left out without shifting the next page', async () => {
  const urls = [];
  const broken = { ...backendKeyboard('0b1a87bc-99d9-56ea-a8ef-c6382b14eaf5'), design: { ...plainDesign, background: 'red' } };
  const page = await loadKeyboardSkins(ORIGIN, { offset: 20, q: '雪 山' }, async url => { urls.push(url); return Response.json({ skins: [backendKeyboard(), broken], has_more: true }); });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/skins?offset=20&q=%E9%9B%AA+%E5%B1%B1`]);
  assert.equal(page.items.length, 1);
  assert.deepEqual(page.items[0], { id: KEYBOARD_ID, name: '极光雪山小屋', description: '', author: '水杉小莫', design: photoDesign, downloads: 3, ratingCount: 2, ratingAverage: 4.5 });
  assert.equal(page.nextOffset, 22, 'the skipped row still counts towards the offset');
  assert.equal((await loadKeyboardSkins(ORIGIN, { offset: 0, q: '' }, async url => { urls.push(url); return Response.json({ skins: [], has_more: false }); })).nextOffset, null);
  assert.equal(urls.at(-1), `${ORIGIN}/v1/community/skins`);
  await assert.rejects(loadKeyboardSkins(ORIGIN, { offset: 0, q: '' }, async () => new Response(null, { status: 500 })), /HTTP 500/);
  await assert.rejects(loadKeyboardSkins(ORIGIN, { offset: 0, q: '' }, async () => Response.json({ items: [] })));
});

test('an optional design field the page cannot use degrades instead of dropping the skin', () => {
  const design = keyboardSkinDesignSchema.parse({ ...plainDesign, keyShape: 'star', keyOpacity: 3, photo: 'AAAA' });
  assert.equal(design.keyShape, undefined);
  assert.equal(design.keyOpacity, undefined);
  assert.equal('photo' in design, false, 'a photo never travels in the list the page reads');
  assert.equal(keyboardSkinDesignSchema.safeParse({ ...plainDesign, accent: 0x1000000 }).success, false);
  assert.equal(keyboardSkinDesignSchema.safeParse({ ...plainDesign, pattern: 4 }).success, false);
});

test('candidate skins are re-keyed with their asset licence', async () => {
  const urls = [];
  const page = await loadCandidateSkins(ORIGIN, { offset: 0, q: '猫' }, async url => { urls.push(url); return Response.json({ skins: [backendCandidate()], has_more: false }); });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/candidate-skins?q=%E7%8C%AB`]);
  assert.deepEqual(page, { items: [{ id: CANDIDATE_ID, name: '橘猫', description: '', author: '小莫', version: '1.0.0', license: 'CC-BY-4.0', size: 13645, downloads: 0, ratingCount: 0, ratingAverage: 0, createdAt: '2026-10-01T06:47:24.764127Z' }], nextOffset: null, stale: false });
});

test('images are served only when their bytes are PNG, JPEG or WebP', async () => {
  const urls = [];
  const detail = photo => async url => { urls.push(url); return Response.json({ ...backendKeyboard(), design: { ...photoDesign, ...(photo ? { photo } : {}) } }); };
  assert.deepEqual(await loadKeyboardPhoto(ORIGIN, KEYBOARD_ID, detail(JPEG)), { contentType: 'image/jpeg', data: JPEG });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/skins/${KEYBOARD_ID}`]);
  assert.equal(await loadKeyboardPhoto(ORIGIN, KEYBOARD_ID, detail()), null, 'photoShade without a photo');
  assert.equal(await loadKeyboardPhoto(ORIGIN, KEYBOARD_ID, detail(Buffer.from('<svg onload=alert(1)>').toString('base64'))), null);
  assert.equal(await loadKeyboardPhoto(ORIGIN, KEYBOARD_ID, async () => new Response(null, { status: 404 })), null);
  await assert.rejects(loadKeyboardPhoto(ORIGIN, KEYBOARD_ID, async () => new Response(null, { status: 502 })), /HTTP 502/);
  // The declared type is ignored: these bytes are PNG.
  assert.deepEqual(await loadCandidatePreview(ORIGIN, CANDIDATE_ID, async () => Response.json({ path: 'preview.jpg', content_type: 'image/jpeg', data: PNG })), { contentType: 'image/png', data: PNG });
  assert.equal(await loadCandidatePreview(ORIGIN, CANDIDATE_ID, async () => Response.json({ path: 'x', content_type: 'image/png', data: 'not base64!' })), null);
});

// ---- Functions ----

test('GET /api/skins/keyboard proxies the configured origin and asks it at most once a minute per page and search', async t => {
  globalThis.caches = { default: memoryCache() };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => { urls.push(url); return Response.json({ skins: [backendKeyboard()], has_more: false }); });
  const env = { MSIME_API_ORIGIN: 'https://staging.msime.app' };
  const first = await call(keyboardList, '/api/skins/keyboard', { env });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
  const body = await first.json();
  assert.equal(body.items[0].id, KEYBOARD_ID);
  assert.equal(body.stale, false);
  await call(keyboardList, '/api/skins/keyboard?offset=0', { env });
  await call(keyboardList, '/api/skins/keyboard?q=%20雪', { env });
  await call(keyboardList, '/api/skins/keyboard?q=雪', { env });
  assert.deepEqual(urls, ['https://staging.msime.app/v1/community/skins', 'https://staging.msime.app/v1/community/skins?q=%E9%9B%AA']);
  assert.equal((await call(keyboardList, '/api/skins/keyboard?offset=-5', { env })).status, 400);
  assert.equal((await call(keyboardList, '/api/skins/keyboard', { env, method: 'POST' })).status, 405);
});

test('GET /api/skins/candidate reads the candidate catalog and answers 503 when the backend never has', async t => {
  globalThis.caches = { default: memoryCache() };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => { urls.push(url); return Response.json({ skins: [backendCandidate()], has_more: true }); });
  const body = await (await call(candidateList, '/api/skins/candidate?offset=20')).json();
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/candidate-skins?offset=20`]);
  assert.equal(body.nextOffset, 21);
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  assert.equal((await call(candidateList, '/api/skins/candidate')).status, 503);
  globalThis.caches = { default: memoryCache() };
  assert.equal((await call(candidateList, '/api/skins/candidate', { env: { MSIME_API_ORIGIN: 'https://evil.example/path' } })).status, 503);
});

test('the image Functions serve decoded bytes with long caching and reject anything but a skin id', async t => {
  globalThis.caches = { default: memoryCache() };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    if (url.endsWith('/preview')) return Response.json({ path: 'preview.png', content_type: 'image/png', data: PNG });
    return Response.json({ ...backendKeyboard(), design: { ...photoDesign, photo: JPEG } });
  });
  const photo = await call(keyboardPhoto, `/api/skins/keyboard/${KEYBOARD_ID}/photo`, { params: { id: KEYBOARD_ID } });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(photo.headers.get('Cache-Control'), 'public, max-age=3600');
  assert.equal(photo.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()).toString('base64'), JPEG);
  await call(keyboardPhoto, `/api/skins/keyboard/${KEYBOARD_ID}/photo`, { params: { id: KEYBOARD_ID } });
  const preview = await call(candidatePreview, `/api/skins/candidate/${CANDIDATE_ID}/preview?v=1.0.0`, { params: { id: CANDIDATE_ID } });
  assert.equal(preview.headers.get('Content-Type'), 'image/png');
  assert.equal(preview.headers.get('Cache-Control'), 'public, max-age=86400');
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/skins/${KEYBOARD_ID}`, `${ORIGIN}/v1/community/candidate-skins/${CANDIDATE_ID}/preview`], 'the second photo request is served from the edge cache');
  for (const [handler, path, id] of [[keyboardPhoto, '/api/skins/keyboard/x/photo', '../../v1/admin'], [candidatePreview, `/api/skins/candidate/${CANDIDATE_ID}/preview?v=<script>`, CANDIDATE_ID], [keyboardPhoto, `/api/skins/keyboard/${KEYBOARD_ID}/photo?v=1`, KEYBOARD_ID]]) {
    assert.equal((await call(handler, path, { params: { id } })).status, 404, path);
  }
  assert.equal(urls.length, 2, 'a rejected id never reaches the backend');
});

test('a skin without a photo answers 404, briefly cached', async t => {
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => Response.json(backendKeyboard()));
  const response = await call(keyboardPhoto, `/api/skins/keyboard/${KEYBOARD_ID}/photo`, { params: { id: KEYBOARD_ID } });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
});

test('Pages routes /api/skins/* to its Functions instead of the static fallback', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  assert.ok(routes.includes('/api/skins/*'));
});

test('the skins query reads the same-origin Function with the same path the Function caches under', () => {
  assert.equal(skinListPath('keyboard', 0, ''), '/api/skins/keyboard');
  assert.equal(skinListPath('candidate', 40, ' 猫 '), '/api/skins/candidate?offset=40&q=%E7%8C%AB');
  const options = skinsQuery('keyboard', ' 雪 ');
  assert.deepEqual(options.queryKey, ['skins', 'keyboard', '雪']);
  assert.ok(options.staleTime >= 60_000);
  assert.equal(options.initialPageParam, 0);
  assert.equal(options.getNextPageParam({ items: [], nextOffset: 20, stale: false }), 20);
  assert.equal(options.getNextPageParam({ items: [], nextOffset: null, stale: false }), undefined);
});

// ---- drawing ----

test('colours are 0xRRGGBB integers and action keys get readable text', () => {
  assert.equal(skinColor(0x185c47), '#185c47');
  assert.equal(skinColor(0), '#000000');
  assert.equal(skinColor(0x1000000), '#ffffff');
  assert.equal(readableSkinText(0xffffff), 0);
  assert.equal(readableSkinText(0x185c47), 0xffffff);
});

test('a plain design draws flat rounded keys in its own colours', () => {
  const art = keyboardArt(keyboardSkinDesignSchema.parse(plainDesign));
  assert.equal(art.width, ART_WIDTH);
  assert.equal(art.height, ART_HEIGHT);
  assert.equal(art.background, '#e8f0eb');
  assert.equal(art.gradient, undefined);
  assert.equal(art.keyColor, '#ffffff');
  assert.equal(art.keyText, '#17251d');
  assert.equal(art.actionColor, '#185c47');
  assert.equal(art.actionText, '#ffffff');
  assert.equal(art.material, 'flat');
  assert.equal(art.materialStops, undefined);
  assert.equal(art.border, undefined);
  assert.equal(art.shadow, undefined);
  assert.equal(art.fontFamily, undefined);
  assert.equal(art.keyOpacity, 1);
  assert.equal(mayHavePhoto(plainDesign), false);
  // q…p, a…l, ⇧ z…m ⌫, 符号 中/英 空格 ， ↵: the App's touch layout without the home-row insets.
  assert.deepEqual(art.keys.map(key => key.label).join(''), 'qwertyuiopasdfghjkl⇧zxcvbnm⌫符号中/英空格，↵');
  assert.deepEqual(art.keys.filter(key => key.action).map(key => key.label), ['⇧', '⌫', '↵']);
  for (const key of art.keys) {
    assert.ok(key.labelX > 0 && key.labelX < ART_WIDTH && key.labelY > 28 && key.labelY < ART_HEIGHT, key.label);
    assert.equal(key.depthPath, undefined);
    assert.equal(key.paperPath, undefined);
  }
  assert.ok(art.keys[0].path.includes('Q'), 'rounded keys use the quadratic corners');
});

test('gradient, photo, material, border, shadow and pattern follow the design', () => {
  const art = keyboardArt(keyboardSkinDesignSchema.parse(photoDesign));
  assert.deepEqual(art.gradient, { end: skinColor(3809360), horizontal: true });
  assert.ok(mayHavePhoto(photoDesign));
  assert.deepEqual(art.photo, { align: 'xMidYMid', shade: 0.08 });
  assert.equal(art.material, 'raised');
  assert.deepEqual(art.materialStops.key.map(stop => stop.opacity), [0.13, 0.92, 0.1], 'raised keys carry the key opacity in the middle stop');
  assert.deepEqual(art.materialStops.action.map(stop => stop.opacity), [0.13, 1, 0.1]);
  assert.ok(art.keys.every(key => key.depthPath), 'raised keys sit on a depth slab');
  assert.ok(art.keys[0].path.includes('A'), 'ticket keys have notched sides');
  assert.deepEqual(art.border, { width: 1, color: skinColor(7062968) }, 'without customBorderColor the border is the accent');
  assert.deepEqual(art.shadow, { opacity: 0.3, dy: 1, blur: 2 });

  const glass = keyboardArt(keyboardSkinDesignSchema.parse({ ...plainDesign, keyMaterial: 'glass', keyShape: 'capsule', gradientEnd: 0x30224a, customBorderColor: 0xa987e8, borderWidth: 1, pattern: 1, patternOpacity: 0.07, monospaced: true, photoPosition: 0.9 }));
  assert.deepEqual(glass.gradient, { end: '#30224a', horizontal: false }, 'gradients run top to bottom unless horizontal');
  assert.deepEqual(glass.materialStops.key.map(stop => stop.opacity), [0.24, 1, 0.03]);
  assert.equal(glass.border.color, '#a987e8');
  assert.equal(glass.pattern, 1);
  assert.equal(glass.patternOpacity, 0.07);
  assert.equal(glass.fontFamily, MONOSPACED_FONT);
  assert.equal(glass.photo.align, 'xMaxYMax');
  assert.ok(glass.keys.every(key => key.depthPath === undefined));

  const paper = keyboardArt(keyboardSkinDesignSchema.parse({ ...plainDesign, keyMaterial: 'paper', pattern: 3, photoPosition: 0.1 }));
  assert.ok(paper.keys.every(key => key.paperPath?.startsWith(key.path)), 'paper keys add ruled lines inside the outline');
  assert.equal(paper.patternOpacity, 0.15, 'the App default pattern opacity');
  assert.equal(paper.photo.align, 'xMinYMin');
  assert.equal(paper.photo.shade, 0.25, 'the App default photo shade');
});

test('key outlines match the App for every shape', () => {
  assert.equal(keyboardKeyPath(0, 0, 40, 20, 'capsule', 4), 'M10 0H30Q40 0 40 10V10Q40 20 30 20H10Q0 20 0 10V10Q0 0 10 0Z');
  assert.equal(keyboardKeyPath(0, 0, 40, 20, 'rounded', 4), 'M4 0H36Q40 0 40 4V16Q40 20 36 20H4Q0 20 0 16V4Q0 0 4 0Z');
  assert.equal(keyboardKeyPath(0, 0, 40, 20, 'rounded', 30), keyboardKeyPath(0, 0, 40, 20, 'capsule', 0), 'a radius larger than half the key is clamped');
  assert.match(keyboardKeyPath(0, 0, 40, 20, 'ticket', 4), /^M0 0H40V7\.6A2\.4 2\.4 0 0 0 40 12\.4/);
  assert.match(keyboardKeyPath(0, 0, 40, 20, 'pebble', 4), /^M14 0C33\.19\d* 0 40 0\.8 40 6C40 17 36 20 27\.2/);
});
