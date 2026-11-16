import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDownloadMirrors } from '../shared/download-mirrors.ts';
import { onRequest } from '../functions/api/download-mirrors.ts';

const backend = { lanzou_url: 'https://wwbk.lanzoum.com/b0abcdefg', updated_at: '2026-10-01T03:00:00Z' };
const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const get = (env = {}, method = 'GET') => onRequest({ request: new Request('https://msime.app/api/download-mirrors', { method }), env, waitUntil: () => {} });

test('the backend link is validated and re-keyed for the page', async () => {
  const urls = [];
  const mirrors = await loadDownloadMirrors('https://api.msime.app', async url => { urls.push(url); return Response.json(backend); });
  assert.deepEqual(urls, ['https://api.msime.app/v1/site/download-mirrors']);
  assert.deepEqual(mirrors, { lanzouUrl: backend.lanzou_url, stale: false });
  assert.deepEqual(await loadDownloadMirrors('https://api.msime.app', async () => Response.json({ lanzou_url: '', updated_at: '' })), { lanzouUrl: '', stale: false }, 'an unset link is not an error');
  for (const lanzou_url of ['http://wwbk.lanzoum.com/b0abcdefg', 'javascript:alert(1)', 'lanzoum.com/b0abcdefg']) {
    await assert.rejects(loadDownloadMirrors('https://api.msime.app', async () => Response.json({ ...backend, lanzou_url })), lanzou_url);
  }
  await assert.rejects(loadDownloadMirrors('https://api.msime.app', async () => new Response(null, { status: 404 })), /HTTP 404/);
});

test('GET /api/download-mirrors proxies the configured origin and caches the answer', async t => {
  globalThis.caches = { default: memoryCache() };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => { urls.push(url); return Response.json(backend); });
  const first = await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { lanzouUrl: backend.lanzou_url, stale: false });
  await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.deepEqual(urls, ['https://staging.msime.app/v1/site/download-mirrors']);
  assert.equal((await get({}, 'POST')).status, 405);
});

test('GET /api/download-mirrors answers 503 when the backend has never answered', async t => {
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  assert.equal((await get()).status, 503);
  globalThis.caches = { default: memoryCache() };
  assert.equal((await get({ MSIME_API_ORIGIN: 'https://evil.example/path' })).status, 503);
});
