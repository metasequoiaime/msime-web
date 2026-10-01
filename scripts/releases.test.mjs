import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { assetPlatform, loadReleases, normalizeRelease, releaseBody, releasePlatforms, tagVersion } from '../shared/releases.ts';
import { cachedJson, UpstreamUnavailable } from '../shared/edge-cache.ts';
import { onRequest } from '../functions/api/releases.ts';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = { GITHUB_APP_ID: '123', GITHUB_APP_INSTALLATION_ID: '456', GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs1', format: 'pem' }) };

const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const expire = async (cache, url) => {
  const entry = await cache.stored.get(url).clone().json();
  cache.stored.set(url, Response.json({ ...entry, checkedAt: 0 }));
};

let nextId = 1;
const release = (repo, tag, assets, extra = {}) => ({
  id: nextId++, tag_name: tag, name: extra.name ?? tag, draft: false, prerelease: false, published_at: '2026-09-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z',
  html_url: `https://github.com/metasequoiaime/${repo}/releases/tag/${tag}`, body: 'notes', assets: assets.map(name => ({ name })), ...extra,
});

test('assets are classified one by one, by platform word first and installer extension second', () => {
  const cases = {
    'MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg': 'macos',
    'MetasequoiaIME-v0.47.0-macos-universal-unsigned.zip': 'macos',
    'MetasequoiaIME-v0.50.0-build.14-ios-testflight.ipa': 'ios',
    'MetasequoiaIME-v0.46.0-ios-unsigned.xcarchive.zip': 'ios',
    'MetasequoiaIME_Setup_v0.9.1.exe': 'windows',
    'metasequoia-ime-linux_0.9.1_amd64.deb': 'linux',
    'msime-1.0.0-arm64.apk': 'android',
    'msime-1.0.0-harmonyos.hap': 'harmony',
    'appcast.xml': null,
    'MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg.sha256': null,
    'product-manifest.json': null,
  };
  for (const [name, platform] of Object.entries(cases)) assert.equal(assetPlatform(name), platform, name);
});

test('a release that ships two platforms is listed under both; the tag prefix is only a fallback', () => {
  const mixed = release('msime', 'v0.49.0-build.1002.71.1', ['MetasequoiaIME-v0.49.0-build.1002.71.1-ios-testflight.ipa', 'MetasequoiaIME-v0.49.0-build.1002.71.1-macos-universal.pkg', 'appcast.xml']);
  assert.deepEqual(releasePlatforms(mixed).sort(), ['ios', 'macos']);
  const items = normalizeRelease('msime', mixed);
  assert.deepEqual(items.map(item => item.id), [`msime/${mixed.id}/ios`, `msime/${mixed.id}/macos`]);
  assert.equal(new Set(items.map(item => item.url)).size, 1);
  assert.deepEqual(releasePlatforms(release('msime', 'android-v1.0.0', [])), ['android']);
  assert.deepEqual(releasePlatforms(release('msime', 'v1.0.0', ['appcast.xml'])), [], 'nothing to classify, nothing listed');
  assert.deepEqual(releasePlatforms(release('msime-windows', 'v0.9.1', ['product-manifest.json']), 'windows'), ['windows'], 'a single-platform repository answers for every release');
  assert.equal(tagVersion('ios-v0.50.0-build.14'), '0.50.0-build.14');
  assert.equal(tagVersion('v0.9.1'), '0.9.1');
});

test('releases outside the repository, drafts and non-version tags are dropped, not rendered', () => {
  assert.deepEqual(normalizeRelease('msime-windows', release('msime-windows', 'v0.9.1', [], { html_url: 'https://evil.example/metasequoiaime/msime-windows/releases/tag/v0.9.1' }), 'windows'), []);
  assert.deepEqual(normalizeRelease('msime-windows', release('msime-windows', 'v0.9.1', [], { html_url: 'https://github.com/metasequoiaime/other/releases/tag/v0.9.1' }), 'windows'), [], 'the URL must belong to the repository it came from');
  assert.deepEqual(normalizeRelease('msime-windows', release('msime-windows', 'v0.9.1', [], { draft: true }), 'windows'), []);
  assert.deepEqual(normalizeRelease('msime-windows', release('msime-windows', 'nightly<script>', []), 'windows'), []);
  const [item] = normalizeRelease('msime-windows', release('MSIME-Windows', 'v0.9.1', [], { name: null, published_at: null, created_at: '2026-09-02T00:00:00Z' }), 'windows');
  assert.equal(item.title, 'v0.9.1', 'untitled releases use the tag');
  assert.equal(item.publishedAt, '2026-09-02T00:00:00Z');
  assert.equal(item.url, 'https://github.com/metasequoiaime/MSIME-Windows/releases/tag/v0.9.1', 'repository casing does not matter to GitHub');
});

test('notes lose machine comments and are cut to 8 KiB on a character boundary', () => {
  assert.deepEqual(releaseBody('<!-- metasequoia-build-channel:v1 -->\r\n## Changes\r\n\r\n\r\n\r\n- fix'), { body: '## Changes\n\n- fix', truncated: false });
  assert.deepEqual(releaseBody(null), { body: '', truncated: false });
  const long = releaseBody('水'.repeat(5000));
  assert.equal(long.truncated, true);
  assert.ok(new TextEncoder().encode(long.body).length <= 8192);
  assert.ok(!long.body.includes('�'), 'no half character at the cut');
  const lines = releaseBody(Array.from({ length: 400 }, (_, index) => `- change number ${index}`).join('\n'));
  assert.ok(lines.body.endsWith(lines.body.split('\n').at(-1)) && /- change number \d+$/.test(lines.body), 'cuts at a line break when one is close');
});

test('the sweep reads all three repositories, follows one extra page and sorts newest first', async () => {
  const urls = [];
  const shifted = release('msime', 'ios-v0.50.0-build.14', ['MetasequoiaIME-v0.50.0-build.14-ios-testflight.ipa'], { published_at: '2026-09-29T00:00:00Z' });
  const request = async (url, options) => {
    urls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer test');
    if (url.includes('/msime/releases') && url.endsWith('&page=1')) return Response.json([shifted], { headers: { link: '<https://api.github.com/x>; rel="next"' } });
    // A release published mid-sweep pushes the last item of page one onto page two.
    if (url.includes('/msime/releases')) return Response.json([shifted, release('msime', 'v0.50.0-build.9', ['MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg'], { published_at: '2026-09-18T00:00:00Z' })], { headers: { link: '<https://api.github.com/x>; rel="next"' } });
    if (url.includes('/msime-windows/')) return Response.json([release('msime-windows', 'v0.9.1', ['MetasequoiaIME_Setup_v0.9.1.exe'], { published_at: '2026-09-28T00:00:00Z' })]);
    return Response.json([release('msime-linux', 'v0.8.2', [], { published_at: '2026-01-01T00:00:00Z' })]);
  };
  const result = await loadReleases('test', request);
  assert.deepEqual(result.items.map(item => `${item.platform}:${item.version}`), ['ios:0.50.0-build.14', 'windows:0.9.1', 'macos:0.50.0-build.9', 'linux:0.8.2']);
  assert.equal(urls.filter(url => url.includes('/msime/')).length, 2, 'the page cap holds even when GitHub offers more');
  assert.equal(result.stale, false);
  await assert.rejects(loadReleases('test', async url => url.includes('msime-linux') ? new Response(null, { status: 502 }) : request(url, { headers: { Authorization: 'Bearer test' } })), /msime-linux/, 'one failed repository fails the sweep instead of caching a partial list');
});

test('cachedJson serves a fresh copy, refreshes behind an expired one and remembers failures', async () => {
  const cache = memoryCache();
  const key = new Request('https://msime.app/api/test');
  let calls = 0;
  const load = async () => ({ n: ++calls });
  assert.deepEqual(await cachedJson(key, cache, load, { freshFor: 60_000 }), { data: { n: 1 }, stale: false });
  assert.deepEqual(await cachedJson(key, cache, load, { freshFor: 60_000 }), { data: { n: 1 }, stale: false });
  await expire(cache, key.url);
  const background = [];
  assert.deepEqual(await cachedJson(key, cache, load, { freshFor: 60_000, background: task => background.push(task) }), { data: { n: 1 }, stale: false }, 'answers from the expired copy');
  await Promise.all(background);
  assert.deepEqual(await cachedJson(key, cache, load, { freshFor: 60_000 }), { data: { n: 2 }, stale: false });
  await expire(cache, key.url);
  assert.deepEqual(await cachedJson(key, cache, async () => { throw new Error('down'); }, { freshFor: 60_000 }), { data: { n: 2 }, stale: true });
  assert.deepEqual(await cachedJson(key, cache, load, { freshFor: 60_000 }), { data: { n: 2 }, stale: true }, 'a failure backs off before asking again');
  assert.equal(calls, 2);

  const cold = memoryCache();
  let failures = 0;
  const failing = async () => { failures++; throw new Error('down'); };
  await assert.rejects(cachedJson(key, cold, failing, { freshFor: 60_000 }), UpstreamUnavailable);
  await assert.rejects(cachedJson(key, cold, failing, { freshFor: 60_000 }), UpstreamUnavailable);
  assert.equal(failures, 1, 'with nothing to serve, the failure itself is cached');

  const shared = memoryCache();
  let concurrent = 0;
  const slow = async () => { concurrent++; await new Promise(resolve => setTimeout(resolve, 5)); return { n: 1 }; };
  await Promise.all([cachedJson(key, shared, slow, { freshFor: 60_000 }), cachedJson(key, shared, slow, { freshFor: 60_000 })]);
  assert.equal(concurrent, 1, 'concurrent requests share one refresh');
});

test('GET /api/releases filters one cached sweep, validates input and answers 503 without data', async t => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url);
    if (url.includes('/access_tokens')) {
      assert.deepEqual(JSON.parse(options.body), { permissions: { metadata: 'read' } });
      return Response.json({ token: 'test-only-token' });
    }
    if (url.includes('/msime/releases')) return Response.json([release('msime', 'v0.49.0-build.1', ['MetasequoiaIME-v0.49.0-build.1-ios-testflight.ipa', 'MetasequoiaIME-v0.49.0-build.1-macos-universal.pkg'])]);
    if (url.includes('/msime-windows/')) return Response.json([release('msime-windows', 'v0.9.1', [])]);
    return Response.json([]);
  });
  const get = (query = '', method = 'GET') => onRequest({ request: new Request(`https://msime.app/api/releases${query}`, { method }), env, waitUntil: () => {} });

  const all = await get();
  assert.equal(all.status, 200);
  assert.equal(all.headers.get('Cache-Control'), 'no-store');
  const body = await all.json();
  assert.deepEqual(body.items.map(item => item.platform).sort(), ['ios', 'macos', 'windows']);
  assert.equal(body.stale, false);
  const ios = await (await get('?platform=ios')).json();
  assert.deepEqual(ios.items.map(item => item.platform), ['ios']);
  assert.equal(calls.filter(url => url.includes('/releases?')).length, 3, 'the second request is served from the edge cache');

  assert.equal((await get('?platform=symbian')).status, 400);
  assert.equal((await get('', 'POST')).status, 405);

  await expire(cache, 'https://msime.app/api/releases');
  t.mock.method(globalThis, 'fetch', async url => url.includes('/access_tokens') ? Response.json({ token: 'x' }) : new Response(null, { status: 503 }));
  const background = [];
  const served = await onRequest({ request: new Request('https://msime.app/api/releases'), env, waitUntil: task => background.push(task) });
  assert.equal((await served.json()).items.length, 3, 'an expired copy answers while GitHub is retried behind it');
  await Promise.all(background);
  const stale = await (await get()).json();
  assert.equal(stale.stale, true, 'after a failed refresh the last good copy is marked stale');
  assert.equal(stale.items.length, 3);

  globalThis.caches = { default: memoryCache() };
  const unconfigured = await onRequest({ request: new Request('https://msime.app/api/releases'), env: {}, waitUntil: () => {} });
  assert.equal(unconfigured.status, 503);
  assert.ok((await unconfigured.json()).error);
});

test('notes drop headings that repeat the card title and keep the sections under them', async () => {
  const { noteLines } = await import('../src/download/release-notes.ts');
  const body = ['# 水杉输入法 v0.9.2', '', '## 更新内容', '', '### ⚠️ 重要修复', '', '- **卸载时不再删除**其他文件', '', '**皮肤**', '- 背景图'].join('\n');
  assert.deepEqual(noteLines(body, '0.9.2'), [
    { heading: true, text: '⚠️ 重要修复' },
    { heading: false, text: '卸载时不再删除其他文件' },
    { heading: true, text: '皮肤' },
    { heading: false, text: '背景图' },
  ]);
  assert.deepEqual(noteLines("## What's Changed\n* Fix by @a in #1", '1.0.0'), [{ heading: false, text: 'Fix by @a in #1' }]);
  assert.deepEqual(noteLines('## v1.0.0 亮点\n- 一项', '1.0.0'), [{ heading: false, text: '一项' }]);
});
