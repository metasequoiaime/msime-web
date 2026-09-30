import test from 'node:test';
import assert from 'node:assert/strict';
import { apiOriginSchema, loadAppStats } from '../shared/app-stats.ts';
import { onRequest } from '../functions/api/app-stats.ts';

const backend = { skins: 12, skin_downloads: 340, dictionaries: 5, replies: 7, resource_saves: 21, generated_at: '2026-09-30T06:40:40.123456Z' };
const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const get = (env = {}, method = 'GET', waitUntil = () => {}) => onRequest({ request: new Request('https://msime.app/api/app-stats', { method }), env, waitUntil });

test('backend counters are validated and re-keyed for the page', async () => {
  const urls = [];
  const stats = await loadAppStats('https://api.msime.app', async url => { urls.push(url); return Response.json(backend); });
  assert.deepEqual(urls, ['https://api.msime.app/v1/community/stats']);
  assert.deepEqual(stats, { skins: 12, skinDownloads: 340, dictionaries: 5, replies: 7, resourceSaves: 21, generatedAt: backend.generated_at, stale: false });
  await assert.rejects(loadAppStats('https://api.msime.app', async () => Response.json({ ...backend, skins: -1 })));
  await assert.rejects(loadAppStats('https://api.msime.app', async () => Response.json({ ...backend, generated_at: 'yesterday' })));
  await assert.rejects(loadAppStats('https://api.msime.app', async () => new Response(null, { status: 500 })), /HTTP 500/);
});

test('the backend origin must be a bare https origin', () => {
  assert.equal(apiOriginSchema.parse('https://api.msime.app'), 'https://api.msime.app');
  assert.equal(apiOriginSchema.parse('https://api.msime.app/'), 'https://api.msime.app');
  assert.equal(apiOriginSchema.parse('http://localhost:8080'), 'http://localhost:8080', 'loopback http is allowed for local development');
  for (const value of ['http://api.msime.app', 'https://api.msime.app/v1', 'https://api.msime.app?x=1', 'javascript:alert(1)', 'not a url']) assert.equal(apiOriginSchema.safeParse(value).success, false, value);
});

test('GET /api/app-stats proxies, caches for ten minutes and falls back to the last good copy', async t => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => { urls.push(url); return Response.json(backend); });

  const first = await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
  assert.equal((await first.json()).skinDownloads, 340);
  await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.deepEqual(urls, ['https://staging.msime.app/v1/community/stats'], 'configured origin, and one upstream call per window');

  const key = 'https://msime.app/api/app-stats';
  const entry = await cache.stored.get(key).clone().json();
  cache.stored.set(key, Response.json({ ...entry, checkedAt: 0 }));
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 502 }));
  const background = [];
  const expired = await get({}, 'GET', task => background.push(task));
  assert.equal((await expired.json()).stale, false, 'the expired copy answers at once while the backend is retried behind it');
  await Promise.all(background);
  const stale = await get();
  assert.equal(stale.status, 200);
  const body = await stale.json();
  assert.equal(body.stale, true);
  assert.equal(body.skins, 12);

  assert.equal((await get({}, 'POST')).status, 405);
});

test('GET /api/app-stats answers 503 when there is nothing to show', async t => {
  globalThis.caches = { default: memoryCache() };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new TypeError('network'); });
  const response = await get();
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error);
  assert.equal((await get()).status, 503);
  assert.equal(calls, 1, 'the outage is remembered instead of retried per visitor');

  globalThis.caches = { default: memoryCache() };
  const misconfigured = await get({ MSIME_API_ORIGIN: 'https://evil.example/path' });
  assert.equal(misconfigured.status, 503);
  assert.equal(calls, 1, 'a bad origin is never fetched');
});
