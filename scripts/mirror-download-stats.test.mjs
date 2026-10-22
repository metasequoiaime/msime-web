import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorDownloadStatsSchema, latestMirrorDownloadStats, loadMirrorDownloadStats } from '../shared/mirror-download-stats.ts';
import { mirrorDownloadPlatform } from '../shared/download-events.ts';
import { onRequest } from '../functions/api/download-stats.ts';
import { mirrorDownloadStatsQuery } from '../src/data/queries.ts';

const backend = { total: 14, platforms: { windows: 3, windowsRust: 2, macos: 4, harmony: 1, future: 4 }, generated_at: '2026-10-22T01:00:00Z' };
const snapshot = { total: backend.total, platforms: backend.platforms, generatedAt: backend.generated_at };
const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const get = (env = {}, method = 'GET', waitUntil = () => {}) => onRequest({ request: new Request('https://msime.app/api/download-stats', { method }), env, waitUntil });

test('累计镜像数据守恒、保留未知平台，真实零值与不可用分开', async () => {
  const urls = [];
  assert.deepEqual(await loadMirrorDownloadStats('https://api.msime.app', async url => { urls.push(url); return Response.json(backend); }), snapshot);
  assert.deepEqual(urls, ['https://api.msime.app/v1/site/download-stats']);
  assert.deepEqual(mirrorDownloadStatsSchema.parse({ ...snapshot, total: 0, platforms: {} }).platforms, {});
  for (const bad of [{ ...snapshot, total: 13 }, { ...snapshot, total: -1 }, { ...snapshot, platforms: { windows: -14 } }, { ...snapshot, generatedAt: 'yesterday' }]) {
    assert.equal(mirrorDownloadStatsSchema.safeParse(bad).success, false);
  }
  await assert.rejects(loadMirrorDownloadStats('https://api.msime.app', async () => new Response(null, { status: 503 })));
  assert.equal(latestMirrorDownloadStats(undefined, snapshot), snapshot);
  assert.equal(latestMirrorDownloadStats(snapshot, { ...snapshot, generatedAt: '2026-10-21T01:00:00Z' }), snapshot);
  assert.equal(latestMirrorDownloadStats(undefined), undefined);
});

test('镜像公开代理按分钟缓存，后端失败保留最近成功累计值', async t => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return Response.json(backend); });
  assert.deepEqual(await (await get()).json(), { ...snapshot, stale: false });
  await get();
  assert.equal(calls.length, 1);
  const key = 'https://msime.app/api/download-stats';
  const entry = await cache.stored.get(key).clone().json();
  cache.stored.set(key, Response.json({ ...entry, checkedAt: Date.now() - 61_000 }));
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  const tasks = [];
  assert.equal((await (await get({}, 'GET', task => tasks.push(task))).json()).total, 14);
  await Promise.all(tasks);
  assert.deepEqual(await (await get()).json(), { ...snapshot, stale: true });
  assert.equal((await get({}, 'POST')).status, 405);
  assert.equal((await get({ MSIME_API_ORIGIN: 'https://example.test/path' })).status, 503);
});

test('首次不可用不能伪造镜像零值；查询每分钟刷新', async t => {
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  const response = await get();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).total, undefined);
  assert.deepEqual(mirrorDownloadStatsQuery().queryKey, ['mirror-download-stats']);
  assert.equal(mirrorDownloadStatsQuery().refetchInterval, 60_000);
});

test('同名 Windows 安装包按真实仓库标记 Rust 镜像事件', () => {
  assert.equal(mirrorDownloadPlatform('windows', 'https://github.com/metasequoiaime/msime/releases/download/windows-v0.4.0/MetasequoiaIME_Setup_v0.4.0.exe'), 'windows-rust');
  assert.equal(mirrorDownloadPlatform('windows', 'https://github.com/metasequoiaime/MSIME-Windows/releases/download/v0.4.0/MetasequoiaIME_Setup_v0.4.0.exe'), 'windows');
  assert.equal(mirrorDownloadPlatform('macos', 'https://github.com/metasequoiaime/msime/releases/download/macos-v1/msime-macos-1.dmg'), 'macos');
});
