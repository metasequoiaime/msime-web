import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { siteApi, SourceError, staticSnapshot, withFallback } from '../src/data/source.ts';
import { appStatsQuery, communityQuery, platformsQuery, releasesQuery, updateManifestQuery } from '../src/data/queries.ts';
import { IOS_TESTFLIGHT_URL, sitePlatforms, SITE_PLATFORMS } from '../src/data/platforms.ts';
import { communitySchema } from '../src/community-data.ts';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const community = read('public/community.json');
const platforms = read('public/platforms.json');
const manifest = read('public/update.json');
const identity = value => value;
const run = (options, signal = new AbortController().signal) => options.queryFn({ signal, queryKey: options.queryKey, meta: undefined });

test('adapters only accept same-origin paths, and site APIs only under /api/', () => {
  for (const url of ['https://evil.example/data.json', '//evil.example/data.json', 'data.json']) {
    assert.throws(() => staticSnapshot(url, identity), /same-origin/);
    assert.throws(() => siteApi(url, identity), /same-origin/);
  }
  assert.throws(() => siteApi('/community.json', identity), /\/api\//);
  assert.equal(staticSnapshot('/community.json', identity).id, 'static:/community.json');
  assert.equal(siteApi('/api/community', identity).id, 'api:/api/community');
});

test('a non-2xx answer is a SourceError carrying the status', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 503 }));
  await assert.rejects(siteApi('/api/app-stats', identity).load(), error => error instanceof SourceError && error.status === 503 && error.source === 'api:/api/app-stats');
});

test('withFallback reports which source answered and whether the data is stale', async () => {
  const primary = { id: 'a', load: async () => ({ value: 1 }) };
  const flagged = { id: 'a', load: async () => ({ value: 1, stale: true }) };
  const broken = { id: 'a', load: async () => { throw new Error('down'); } };
  const snapshot = { id: 'b', load: async () => ({ value: 2 }) };
  assert.deepEqual(await withFallback(primary, snapshot).load(), { data: { value: 1 }, source: 'a', stale: false });
  assert.deepEqual(await withFallback(flagged, snapshot).load(), { data: { value: 1, stale: true }, source: 'a', stale: true }, 'the source itself can report a stale copy');
  assert.deepEqual(await withFallback(broken, snapshot).load(), { data: { value: 2 }, source: 'b', stale: true });
  await assert.rejects(withFallback(broken, broken).load(), error => error instanceof AggregateError && error.errors.length === 2);
  assert.equal(withFallback(primary, snapshot).id, 'a > b');

  const controller = new AbortController();
  let fallbackCalls = 0;
  const aborting = { id: 'a', load: async () => { controller.abort(); throw new DOMException('aborted', 'AbortError'); } };
  await assert.rejects(withFallback(aborting, { id: 'b', load: async () => { fallbackCalls++; return {}; } }).load(controller.signal), /aborted/);
  assert.equal(fallbackCalls, 0, 'a cancelled query does not fire the fallback');
});

test('community query keeps its seeded key and falls back to the bundled snapshot', async t => {
  const options = communityQuery();
  assert.deepEqual(options.queryKey, ['community'], 'build-seo seeds this exact key');
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    return url === '/api/community' ? new Response(null, { status: 503 }) : Response.json(community);
  });
  const data = await run(options);
  assert.deepEqual(urls, ['/api/community', '/community.json']);
  assert.equal(data.stale, true, 'snapshot data is marked stale');
  assert.equal(data.totalStars, community.totalStars);

  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...community, stale: false }));
  assert.equal((await run(options)).stale, false);

  t.mock.method(globalThis, 'fetch', async url => url === '/api/community' ? Response.json({ ...community, contributors: [{ ...community.contributors[0], url: 'javascript:alert(1)' }] }) : Response.json(community));
  assert.equal((await run(options)).stale, true, 'an invalid live answer falls through to the snapshot instead of rendering');
});

test('community schema accepts the optional star series and drops only a malformed one', () => {
  const starSeries = [{ repo: 'msime-windows', points: [{ date: '2026-09-30', stars: 1556 }] }];
  const parsed = communitySchema.parse({ ...community, starSeries, starDelta30d: 12 });
  assert.deepEqual(parsed.starSeries, starSeries);
  assert.equal(parsed.starDelta30d, 12);
  const broken = communitySchema.parse({ ...community, starSeries: [{ repo: '../evil', points: [] }], starDelta30d: -1 });
  assert.equal(broken.starSeries, undefined);
  assert.equal(broken.starDelta30d, undefined);
  assert.equal(broken.totalStars, community.totalStars);
});

test('platforms and update-manifest queries keep their seeded keys and contracts', async t => {
  assert.deepEqual(platformsQuery().queryKey, ['platforms']);
  assert.deepEqual(updateManifestQuery().queryKey, ['update-manifest']);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    return Response.json(url.startsWith('/update.json') ? manifest : platforms);
  });
  assert.equal((await run(platformsQuery())).platforms.windows.version, platforms.platforms.windows.version);
  assert.equal((await run(updateManifestQuery())).version, manifest.version);
  const update = calls.find(call => call.url.startsWith('/update.json'));
  assert.match(update.url, /^\/update\.json\?t=\d+$/, 'the manifest bypasses intermediary caches');
  assert.equal(update.init.cache, 'no-store');

  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...manifest, releaseUrl: 'https://evil.example/' }));
  await assert.rejects(run(updateManifestQuery()));
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...manifest, installerUrl: 'https://evil.example/setup.exe', installerSha256: 'nope' }));
  const degraded = await run(updateManifestQuery());
  assert.equal(degraded.installerUrl, undefined, 'a bad optional field drops only itself');
  assert.equal(degraded.installerSha256, undefined);
  assert.equal(degraded.version, manifest.version);
});

test('releases and app-stats queries use their own keys and same-origin Functions', async t => {
  assert.deepEqual(releasesQuery().queryKey, ['releases', 'all']);
  assert.deepEqual(releasesQuery('ios').queryKey, ['releases', 'ios']);
  assert.deepEqual(appStatsQuery().queryKey, ['app-stats']);
  const urls = [];
  const item = { id: 'msime/1/ios', repo: 'msime', platform: 'ios', version: '0.50.0-build.14', tag: 'ios-v0.50.0-build.14', title: 'iOS', prerelease: true, publishedAt: '2026-09-29T00:00:00Z', url: 'https://github.com/metasequoiaime/msime/releases/tag/ios-v0.50.0-build.14', body: '', truncated: false };
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    return url.startsWith('/api/releases') ? Response.json({ generatedAt: '2026-09-30T00:00:00.000Z', stale: false, items: [item] }) : new Response('{"error":"x"}', { status: 503 });
  });
  assert.equal((await run(releasesQuery('ios'))).items[0].id, 'msime/1/ios');
  await run(releasesQuery());
  assert.deepEqual(urls, ['/api/releases?platform=ios', '/api/releases']);
  await assert.rejects(run(appStatsQuery()), error => error instanceof SourceError && error.status === 503, 'the page hides the section on this rejection');

  t.mock.method(globalThis, 'fetch', async () => Response.json({ generatedAt: '2026-09-30T00:00:00.000Z', stale: false, items: [{ ...item, url: 'https://evil.example/' }] }));
  await assert.rejects(run(releasesQuery()), 'a release linking outside the organisation is rejected in the browser too');
});

test('the six-platform catalogue joins desktop releases and keeps mobile details static', () => {
  const entries = sitePlatforms(platforms.platforms);
  assert.deepEqual(entries.map(entry => entry.id), [...SITE_PLATFORMS]);
  assert.deepEqual(entries.map(entry => entry.id), ['windows', 'macos', 'linux', 'android', 'ios', 'harmony']);
  for (const entry of entries) {
    if (['windows', 'macos', 'linux'].includes(entry.id)) assert.equal(entry.release?.version, platforms.platforms[entry.id].version);
    else assert.equal(entry.release, null);
    assert.ok(entry.href.startsWith('https://github.com/metasequoiaime/') || entry.href === IOS_TESTFLIGHT_URL);
  }
  const ios = entries.find(entry => entry.id === 'ios');
  assert.equal(ios.distribution, 'testflight');
  assert.equal(ios.href, 'https://testflight.apple.com/join/bUzPvyqt');
  assert.deepEqual(sitePlatforms().map(entry => entry.release), [null, null, null, null, null, null], 'renders without a manifest');
});
