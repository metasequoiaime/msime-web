import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadNotices } from '../shared/notices.ts';
import { onRequest } from '../functions/api/notices.ts';
import { noticesQuery } from '../src/data/queries.ts';
import { DISMISSED_NOTICES_KEY, MAX_VISIBLE_NOTICES, readDismissed, rememberDismissed, visibleNotices } from '../src/notices.ts';
import { renderNoticeBody } from '../src/notice-markdown.ts';

const backendItem = (id, targets = ['all']) => ({ id, title: `公告 ${id}`, body: '**维护**通知', targets, channels: ['site', 'app'], published_at: '2026-10-01T03:00:00.123456Z' });
const backend = { items: [backendItem('12'), backendItem('11', ['macos'])] };
const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const get = (env = {}, method = 'GET') => onRequest({ request: new Request('https://msime.app/api/notices', { method }), env, waitUntil: () => {} });
const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, String(value)); } };
};
const notice = (id, targets = ['all']) => ({ id, title: id, body: '', targets, publishedAt: '2026-10-01T03:00:00Z' });

test('the site channel feed is validated and re-keyed for the page', async () => {
  const urls = [];
  const notices = await loadNotices('https://api.msime.app', async url => { urls.push(url); return Response.json(backend); });
  assert.deepEqual(urls, ['https://api.msime.app/v1/notices?channel=site']);
  assert.deepEqual(notices.items[0], { id: '12', title: '公告 12', body: '**维护**通知', targets: ['all'], publishedAt: '2026-10-01T03:00:00.123456Z' });
  assert.equal(notices.stale, false);
  assert.deepEqual(await loadNotices('https://api.msime.app', async () => Response.json({ items: [] })), { items: [], stale: false });
  await assert.rejects(loadNotices('https://api.msime.app', async () => Response.json({ items: [{ ...backendItem('1'), published_at: 'today' }] })));
  await assert.rejects(loadNotices('https://api.msime.app', async () => Response.json({ items: [{ ...backendItem('1'), title: '' }] })));
  await assert.rejects(loadNotices('https://api.msime.app', async () => new Response(null, { status: 503 })), /HTTP 503/);
});

test('GET /api/notices proxies the configured origin and asks it at most once a minute', async t => {
  globalThis.caches = { default: memoryCache() };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => { urls.push(url); return Response.json(backend); });
  const first = await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.equal(body.items.length, 2);
  assert.equal(body.stale, false);
  await get({ MSIME_API_ORIGIN: 'https://staging.msime.app' });
  assert.deepEqual(urls, ['https://staging.msime.app/v1/notices?channel=site']);
  assert.equal((await get({}, 'POST')).status, 405);
});

test('Pages routes /api/notices to its Function instead of the static fallback', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  assert.ok(routes.includes('/api/notices'));
  assert.ok(routes.includes('/api/notices/'));
});

test('GET /api/notices answers 503 when the backend has never answered', async t => {
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  assert.equal((await get()).status, 503);
  globalThis.caches = { default: memoryCache() };
  assert.equal((await get({ MSIME_API_ORIGIN: 'https://evil.example/path' })).status, 503);
});

test('the notices query reads the same-origin Function and never polls faster than its cache', () => {
  const options = noticesQuery();
  assert.deepEqual(options.queryKey, ['notices']);
  assert.ok(options.staleTime >= 60_000);
  assert.equal(options.refetchInterval, undefined);
});

test('notices for everyone or the visitor platform are shown, newest first, until dismissed', () => {
  const items = [notice('5'), notice('4', ['windows']), notice('3', ['macos', 'linux']), notice('2'), notice('1'), notice('0')];
  assert.deepEqual(visibleNotices(items, 'windows', new Set()).map(item => item.id), ['5', '4', '2']);
  assert.equal(visibleNotices(items, 'windows', new Set()).length, MAX_VISIBLE_NOTICES);
  assert.deepEqual(visibleNotices(items, 'macos', new Set(['5'])).map(item => item.id), ['3', '2', '1']);
  assert.deepEqual(visibleNotices(items, null, new Set(['5', '2'])).map(item => item.id), ['1', '0'], 'an unrecognised platform only sees notices for everyone');
});

test('dismissals are remembered per id and pruned to the live feed', () => {
  const storage = memoryStorage({ [DISMISSED_NOTICES_KEY]: JSON.stringify(['old', '4']) });
  assert.deepEqual([...readDismissed(storage)], ['old', '4']);
  const next = rememberDismissed(storage, '5', ['5', '4', '3']);
  assert.deepEqual([...next].sort(), ['4', '5']);
  assert.deepEqual(JSON.parse(storage.values.get(DISMISSED_NOTICES_KEY)).sort(), ['4', '5']);
  assert.deepEqual([...readDismissed(memoryStorage({ [DISMISSED_NOTICES_KEY]: 'not json' }))], []);
  assert.deepEqual([...readDismissed(memoryStorage({ [DISMISSED_NOTICES_KEY]: '[1,"a",null]' }))], ['a']);
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.deepEqual([...readDismissed(broken)], []);
  assert.deepEqual([...rememberDismissed(broken, '7', ['7'])], ['7'], 'a dismissal still applies for the session without storage');
});

test('notice bodies render simple Markdown with raw HTML escaped and links opened externally', () => {
  const html = renderNoticeBody('**维护**：<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[详情](https://msime.app/download/) 和 https://github.com/metasequoiaime\n\n[坏链接](javascript:alert(1)) ![图](https://evil.example/t.png)');
  assert.match(html, /<strong>维护<\/strong>/);
  assert.doesNotMatch(html, /<script|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<a href="https:\/\/msime\.app\/download\/" target="_blank" rel="noopener noreferrer">详情<\/a>/);
  assert.match(html, /<a href="https:\/\/github\.com\/metasequoiaime" target="_blank" rel="noopener noreferrer">/, 'bare URLs are linked');
  assert.doesNotMatch(html, /href="javascript:/);
});
