import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { siteApi, SourceError, staticSnapshot, withFallback } from '../src/data/source.ts';
import { appStatsQuery, communityQuery, platformsQuery, releasesQuery, testflightStatsQuery, updateManifestQuery } from '../src/data/queries.ts';
import { ANDROID_PGYER_URL, IOS_TESTFLIGHT_URL, sitePlatforms, SITE_PLATFORMS } from '../src/data/platforms.ts';
import { communitySchema } from '../src/community-data.ts';
import { platformsSchema } from '../src/platforms-data.ts';
import { downloadChoices } from '../src/download/windows.ts';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const community = read('public/community.json');
const platforms = read('public/platforms.json');
const manifest = read('public/update.json');
const identity = value => value;
const run = (options, signal = new AbortController().signal, cached) => options.queryFn({ signal, queryKey: options.queryKey, meta: undefined, client: { getQueryData: () => cached } });

test('download statistics validate totals and degrade independently of the installer manifest', () => {
  const downloadStats = { total: 10, platforms: { windows: 4, macos: 3, linux: 2, android: 1 } };
  assert.deepEqual(platformsSchema.parse({ ...platforms, downloadStats }).downloadStats, downloadStats);
  assert.equal(platformsSchema.parse({ ...platforms, downloadStats: undefined }).downloadStats, undefined);
  for (const invalid of [
    { ...downloadStats, total: 11 },
    { ...downloadStats, platforms: { ...downloadStats.platforms, linux: -1 } },
    { total: 0, platforms: {} },
  ]) {
    const parsed = platformsSchema.parse({ ...platforms, downloadStats: invalid });
    assert.equal(parsed.downloadStats, undefined);
    assert.equal(parsed.platforms.windows.version, platforms.platforms.windows.version);
  }
});

test('Rust Windows and Harmony counters validate their sum while accepting older snapshots', () => {
  const combined = { total: 10, platforms: { windows: 4, macos: 3, linux: 2, android: 1 } };
  assert.equal(platformsSchema.parse({ ...platforms, downloadStats: combined }).downloadStats.platforms.windowsRust, undefined);
  assert.equal(platformsSchema.parse({ ...platforms, downloadStats: combined }).downloadStats.platforms.harmony, undefined);
  const split = { total: 12, platforms: { ...combined.platforms, windows: 3, windowsRust: 1, harmony: 2 } };
  assert.deepEqual(platformsSchema.parse({ ...platforms, downloadStats: split }).downloadStats, split);
  for (const invalid of [{ ...split, total: 11 }, { ...split, platforms: { ...split.platforms, windowsRust: -1 } }, { ...split, platforms: { ...split.platforms, harmony: -1 } }]) {
    const parsed = platformsSchema.parse({ ...platforms, downloadStats: invalid });
    assert.equal(parsed.downloadStats, undefined);
    assert.equal(parsed.platforms.windows.version, platforms.platforms.windows.version);
  }
});

test('Windows experimental releases degrade independently of stable releases and download totals', () => {
  const experimental = { ...platforms.platforms.windows, version: '0.2.1', signed: null };
  const withExperimental = value => ({ ...platforms, platforms: { ...platforms.platforms, windows: { ...platforms.platforms.windows, experimental: value } } });
  const valid = platformsSchema.parse(withExperimental(experimental));
  assert.equal(valid.platforms.windows.experimental.version, '0.2.1');
  assert.deepEqual(valid.downloadStats, platforms.downloadStats);
  for (const value of [undefined, null, { ...experimental, downloads: [] }, { ...experimental, releaseUrl: 'https://evil.example/release' }]) {
    const parsed = platformsSchema.parse(withExperimental(value));
    assert.equal(parsed.platforms.windows.experimental, null);
    assert.equal(parsed.platforms.windows.version, platforms.platforms.windows.version);
    assert.deepEqual(parsed.downloadStats, platforms.downloadStats);
  }
});

test('TestFlight snapshot uses its own static query and rejects bad data without replacing GitHub totals', async t => {
  const stats = { schemaVersion: 1, generatedAt: '2026-10-21T10:00:00.000Z', installs: 20, buildCount: 2, periodStart: '2026-10-01', periodEnd: '2026-10-21' };
  assert.deepEqual(testflightStatsQuery().queryKey, ['testflight-stats']);
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, '/testflight-stats.json');
    return Response.json(stats);
  });
  assert.deepEqual(await run(testflightStatsQuery()), stats);
  t.mock.method(globalThis, 'fetch', async () => Response.json(null));
  assert.equal(await run(testflightStatsQuery()), null);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...stats, installs: -1 }));
  await assert.rejects(run(testflightStatsQuery()));
  assert.equal(platformsSchema.parse(platforms).downloadStats.total, platforms.downloadStats.total);
});

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

test('a failed community refetch never replaces newer data with the older snapshot', async t => {
  const options = communityQuery();
  const signal = new AbortController().signal;
  const newer = { ...community, generatedAt: new Date(Date.parse(community.generatedAt) + 86_400_000).toISOString(), totalStars: community.totalStars + 5, stale: false };
  const older = { ...community, generatedAt: new Date(Date.parse(community.generatedAt) - 86_400_000).toISOString(), stale: false };
  t.mock.method(globalThis, 'fetch', async url => url === '/api/community' ? new Response(null, { status: 503 }) : Response.json(community));

  const kept = await run(options, signal, newer);
  assert.equal(kept.generatedAt, newer.generatedAt, 'the cached live read is newer than the snapshot');
  assert.equal(kept.totalStars, newer.totalStars);
  assert.equal(kept.stale, true, 'the kept copy is flagged, since this refresh failed');

  const replaced = await run(options, signal, older);
  assert.equal(replaced.generatedAt, community.generatedAt, 'an older cache still gives way to the snapshot');
  assert.equal(replaced.stale, true);

  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...community, stale: false }));
  assert.equal((await run(options, signal, newer)).generatedAt, community.generatedAt, 'a successful live answer always wins');
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

test('the seven-platform catalogue joins desktop and Android releases and keeps the rest static', () => {
  const entries = sitePlatforms(platforms.platforms);
  assert.deepEqual(entries.map(entry => entry.id), [...SITE_PLATFORMS]);
  assert.deepEqual(entries.map(entry => entry.id), ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'web']);
  for (const entry of entries) {
    if (['windows', 'macos', 'linux', 'android', 'harmony'].includes(entry.id)) assert.equal(entry.release?.version, platforms.platforms[entry.id].version);
    else assert.equal(entry.release, null);
    assert.ok(entry.href.startsWith('https://github.com/metasequoiaime/') || entry.href === IOS_TESTFLIGHT_URL || entry.href === ANDROID_PGYER_URL || entry.href === 'https://www.npmjs.com/package/@msime/web-engine');
  }
  const web = entries.find(entry => entry.id === 'web');
  assert.equal(web.distribution, 'sdk');
  assert.equal(web.sourceUrl, 'https://github.com/metasequoiaime/msime/tree/develop/packages/web-engine');
  const ios = entries.find(entry => entry.id === 'ios');
  assert.equal(ios.distribution, 'testflight');
  assert.equal(ios.href, 'https://testflight.apple.com/join/bUzPvyqt');
  const android = entries.find(entry => entry.id === 'android');
  assert.equal(android.distribution, 'pgyer');
  assert.equal(android.href, 'https://www.pgyer.com/msime');
  assert.equal(android.sourceUrl, 'https://github.com/metasequoiaime/msime/tree/develop/platforms/android');
  const harmony = entries.find(entry => entry.id === 'harmony');
  assert.equal(harmony.distribution, 'release');
  assert.equal(harmony.release.version, platforms.platforms.harmony.version);
  assert.equal(harmony.href, 'https://github.com/metasequoiaime/msime/releases');
  assert.equal(harmony.sourceUrl, 'https://github.com/metasequoiaime/msime/tree/develop/platforms/harmony');
  assert.deepEqual(sitePlatforms().map(entry => entry.release), [null, null, null, null, null, null, null], 'renders without a manifest');
});

test('platform versions use installable manifests and independent iOS publication metadata', () => {
  const history = [
    { platform: 'ios', version: '0.51.5', publishedAt: '2026-10-02T19:01:18Z' },
    { platform: 'android', version: '9.0.0', publishedAt: '2026-10-15T00:00:00Z' },
    { platform: 'ios', version: '0.50.0', publishedAt: '2026-09-29T00:00:00Z' },
  ];
  for (const items of [history, [...history].reverse()]) {
    const entries = sitePlatforms(platforms.platforms, items);
    assert.equal(entries.find(entry => entry.id === 'android').publishedVersion, platforms.platforms.android.version);
    const ios = entries.find(entry => entry.id === 'ios');
    assert.equal(ios.publishedVersion, '0.51.5');
    assert.equal(ios.release, null, 'published iOS metadata never becomes a downloadable package');
    assert.equal(ios.href, IOS_TESTFLIGHT_URL);
  }
  assert.equal(sitePlatforms(undefined, history.slice(1)).find(entry => entry.id === 'ios').publishedVersion, '0.50.0');
  assert.equal(sitePlatforms(undefined, [history[1]]).find(entry => entry.id === 'ios').publishedVersion, null, 'never borrows another platform version');
  assert.ok(sitePlatforms().every(entry => entry.publishedVersion === null), 'missing data keeps the distribution fallback');
});

test('Web versions follow the latest stable publication independently of installable manifests', () => {
  const history = [
    { platform: 'web', version: '1.2.0', publishedAt: '2026-10-02T00:00:00Z', prerelease: false },
    { platform: 'web', version: '2.0.0-alpha', publishedAt: '2026-10-15T00:00:00Z', prerelease: true },
    { platform: 'android', version: '9.0.0', publishedAt: '2026-10-16T00:00:00Z', prerelease: false },
    { platform: 'web', version: '1.1.0', publishedAt: '2026-09-29T00:00:00Z', prerelease: false },
  ];
  for (const items of [history, [...history].reverse()]) {
    for (const manifest of [platforms.platforms, undefined]) {
      const web = sitePlatforms(manifest, items).find(entry => entry.id === 'web');
      assert.equal(web.publishedVersion, '1.2.0');
      assert.equal(web.release, null, 'npm publication never becomes an installable package');
      assert.equal(web.href, 'https://www.npmjs.com/package/@msime/web-engine');
    }
  }
  for (const items of [[], [history[1]], [history[2]], history.slice(1, 3)]) {
    assert.equal(sitePlatforms(platforms.platforms, items).find(entry => entry.id === 'web').publishedVersion, null, 'missing stable Web releases keep the npm fallback');
  }
});

test('九个下载入口保持独立 Windows 版本、下载来源和缺失状态', () => {
  const base = 'https://github.com/metasequoiaime/msime/releases';
  const win7Name = 'MetasequoiaIME-Full_Setup_v1.0.0_win7_x64.exe';
  const win7 = { version: '1.0.0', releaseUrl: `${base}/tag/windows7-v1.0.0`, publishedAt: '2026-10-26T00:00:00Z', signed: null,
    downloads: [{ name: win7Name, label: '完整版 · x64 · 安装程序', arch: 'x64', url: `${base}/download/windows7-v1.0.0/${win7Name}`, size: 1, sha256: null }] };
  const withWin7 = value => platformsSchema.parse({ ...platforms, platforms: { ...platforms.platforms, windows: { ...platforms.platforms.windows, windows7: value } } });
  const manifest = withWin7(win7);
  const choices = downloadChoices(sitePlatforms(manifest.platforms));
  assert.equal(choices.length, 9);
  assert.deepEqual(choices.slice(0, 3).map(entry => entry.windowsVariant), ['pure', 'online', 'win7']);
  assert.deepEqual(choices.slice(0, 3).map(entry => entry.name), ['Windows 10/11（纯净版）', 'Windows 10/11（联网版）', 'Windows 7']);
  assert.equal(choices[0].publishedVersion, manifest.platforms.windows.version);
  assert.equal(choices[1].publishedVersion, manifest.platforms.windows.experimental.version);
  assert.equal(choices[1].release.downloads[0].url, manifest.platforms.windows.experimental.downloads[0].url);
  assert.equal(choices[2].publishedVersion, '1.0.0');
  assert.equal(choices[2].release.downloads[0].url, win7.downloads[0].url);
  for (const invalid of [undefined, null, { ...win7, downloads: [] }, platforms.platforms.windows, { ...win7, downloads: [{ ...win7.downloads[0], arch: 'arm64' }] }]) {
    const entries = downloadChoices(sitePlatforms(withWin7(invalid).platforms));
    assert.equal(entries[2].publishedVersion, null);
    assert.equal(entries[2].release, null, '不能用现代安装包替代 Windows 7 包');
    assert.equal(entries[0].publishedVersion, manifest.platforms.windows.version);
  }
  const missing = downloadChoices(sitePlatforms());
  assert.equal(missing.length, 9);
  assert.ok(missing.slice(0, 3).every(entry => entry.release === null && entry.publishedVersion === null));
});
