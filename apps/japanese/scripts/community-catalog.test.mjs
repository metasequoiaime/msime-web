import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogListParams, catalogListQuery, loadCatalogPage } from '../shared/community-catalog.ts';
import { onRequest as pluginList } from '../functions/api/plugins.ts';
import { onRequest as resourceList } from '../functions/api/resources.ts';
import { pluginsQuery, publicCatalogPath, resourcesQuery } from '../src/data/account.ts';
import { DECLARED_PLUGIN_KINDS, LIVE_PLUGIN_KINDS, PLUGIN_KINDS } from '../src/data/plugin-kinds.ts';

const ORIGIN = 'https://api.msime.app';
const PLUGIN_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const RESOURCE_ID = '2d605cc4-f16a-4a76-ae93-a24432263eaa';

const backendPlugin = (id = PLUGIN_ID) => ({ id, kind: 'sound', plugin_id: 'cat-keys', name: '猫咪按键音', description: '', author: '小莫', version: '1.0.0', license: 'CC-BY-4.0', size: 20480, downloads: 4, rating_count: 1, rating_average: 5, created_at: '2026-10-01T06:47:24Z' });
const backendResource = (id = RESOURCE_ID) => ({ id, kind: 'dictionary', name: '猫咪词库', description: '', author: '小莫', content: { entries: [{ kind: 'pinyin', code: 'mao', word: '猫', weight: 1 }] }, revision: 1, rating_count: 0, rating_average: 0, saved: false, saves: 3 });

const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const call = (handler, path, { env = {}, method = 'GET' } = {}) => handler({ request: new Request(`https://msime.app${path}`, { method }), env, waitUntil: () => {} });

test('list parameters follow the backend limits; resources need a kind and plugins take an optional one', () => {
  const params = (path, collection) => catalogListParams(new URL(path, 'https://msime.app'), collection);
  assert.deepEqual(params('/api/plugins', 'plugins'), { offset: 0, q: '' });
  assert.deepEqual(params('/api/plugins?offset=20&q=%20猫%20&kind=effect', 'plugins'), { offset: 20, q: '猫', kind: 'effect' });
  assert.deepEqual(params('/api/resources?kind=reply', 'resources'), { offset: 0, q: '', kind: 'reply' });
  for (const bad of ['/api/resources', '/api/resources?kind=sound', '/api/resources?kind=dictionary&offset=-1', `/api/resources?kind=dictionary&q=${'月'.repeat(43)}`]) assert.equal(params(bad, 'resources'), undefined, bad);
  for (const bad of ['/api/plugins?kind=dictionary', '/api/plugins?offset=100001', '/api/plugins?offset=1.5']) assert.equal(params(bad, 'plugins'), undefined, bad);
});

test('the page asks for the same path the Function caches under', () => {
  assert.equal(publicCatalogPath('plugins', 0, ''), '/api/plugins');
  assert.equal(publicCatalogPath('plugins', 40, ' 猫 ', 'sound'), `/api/plugins${catalogListQuery('plugins', { offset: 40, q: '猫', kind: 'sound' })}`);
  assert.equal(publicCatalogPath('resources', 0, ' 猫', 'reply'), `/api/resources${catalogListQuery('resources', { offset: 0, q: '猫', kind: 'reply' })}`);
  assert.equal(publicCatalogPath('resources', 20, '', 'dictionary'), '/api/resources?kind=dictionary&offset=20');
});

test('a catalog page keeps the rows the site can draw without shifting the next page', async () => {
  const urls = [];
  const page = await loadCatalogPage(ORIGIN, 'plugins', { offset: 20, q: '猫', kind: 'sound' }, async url => { urls.push(url); return Response.json({ plugins: [backendPlugin(), { ...backendPlugin('0b1a87bc-99d9-56ea-a8ef-c6382b14eaf5'), kind: 'binary' }], has_more: true }); });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/plugins?offset=20&q=%E7%8C%AB&kind=sound&kinds=helpcode,symbol_set,phrase_table,wordbook`]);
  assert.deepEqual(page.items.map(item => item.id), [PLUGIN_ID]);
  assert.equal(page.nextOffset, 22, 'the skipped row still counts towards the offset');
  const resources = await loadCatalogPage(ORIGIN, 'resources', { offset: 0, q: '', kind: 'dictionary' }, async url => { urls.push(url); return Response.json({ items: [backendResource()], has_more: false }); });
  assert.equal(urls.at(-1), `${ORIGIN}/v1/community/resources?kind=dictionary`);
  assert.deepEqual(resources, { items: [backendResource()], nextOffset: null, stale: false });
  await assert.rejects(loadCatalogPage(ORIGIN, 'plugins', { offset: 0, q: '' }, async () => new Response(null, { status: 500 })), /HTTP 500/);
});

test('GET /api/plugins and /api/resources ask the backend at most once a minute per page, search and kind', async t => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, auth: new Headers(init.headers).get('Authorization') });
    return url.includes('/plugins') ? Response.json({ plugins: [backendPlugin()], has_more: false }) : Response.json({ items: [backendResource()], has_more: true });
  });
  const first = await call(pluginList, '/api/plugins?q=%20猫&kind=sound');
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
  const body = await first.json();
  assert.equal(body.items[0].id, PLUGIN_ID);
  assert.equal(body.stale, false);
  await call(pluginList, '/api/plugins?kind=sound&q=猫');
  const resources = await (await call(resourceList, '/api/resources?kind=dictionary&offset=20')).json();
  assert.equal(resources.nextOffset, 21);
  await call(resourceList, '/api/resources?offset=20&kind=dictionary');
  assert.deepEqual(calls.map(entry => entry.url), [`${ORIGIN}/v1/community/plugins?q=%E7%8C%AB&kind=sound&kinds=helpcode,symbol_set,phrase_table,wordbook`, `${ORIGIN}/v1/community/resources?kind=dictionary&offset=20`]);
  assert.ok(calls.every(entry => entry.auth === null), 'the cached lists are always anonymous');
  assert.deepEqual([...cache.stored.keys()], ['https://msime.app/api/plugins?q=%E7%8C%AB&kind=sound', 'https://msime.app/api/resources?kind=dictionary&offset=20']);
  assert.equal((await call(resourceList, '/api/resources')).status, 400);
  assert.equal((await call(pluginList, '/api/plugins', { method: 'POST' })).status, 405);
  assert.equal(calls.length, 2, 'a rejected request never reaches the backend');
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  assert.equal((await call(pluginList, '/api/plugins')).status, 503);
});

test('a plugin kind the backend does not serve yet is an empty list, not a backend error', async t => {
  globalThis.caches = { default: memoryCache() };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url);
    return Response.json({ error: { code: 'invalid_kind', message: 'invalid_kind' } }, { status: 400 });
  });
  const pending = PLUGIN_KINDS.filter(kind => !LIVE_PLUGIN_KINDS.includes(kind));
  assert.ok(pending.length > 0);
  for (const kind of pending) {
    const response = await call(pluginList, `/api/plugins?kind=${kind}`);
    assert.equal(response.status, 200, kind);
    assert.deepEqual(await response.json(), { items: [], nextOffset: null, stale: false });
    for (const signedIn of [false, true]) {
      const options = pluginsQuery('', kind, '', signedIn);
      assert.deepEqual(await options.queryFn({ signal: new AbortController().signal, pageParam: 0 }), { items: [], nextOffset: null });
    }
  }
  assert.deepEqual(calls, [], 'pending kinds are never asked of the backend');
});

test('anonymous gallery reads go to the cached lists and signed-in reads to the proxy', async t => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    if (url.startsWith('/api/plugins')) return Response.json({ items: [backendPlugin()], nextOffset: 20, stale: false });
    if (url.startsWith('/api/resources')) return Response.json({ items: [backendResource()], nextOffset: null, stale: true });
    if (url.startsWith('/api/v1/community/plugins')) return Response.json({ plugins: [{ ...backendPlugin(), my_rating: 4, saved: true, saves: 2 }], has_more: false });
    return Response.json({ items: [{ ...backendResource(), my_rating: 2, saved: true }], has_more: false });
  });
  const read = (options, pageParam = 0) => options.queryFn({ signal: new AbortController().signal, pageParam, queryKey: options.queryKey });
  const plugins = await read(pluginsQuery(' 猫 ', 'sound', '', false));
  assert.deepEqual(plugins.items.map(item => item.id), [PLUGIN_ID]);
  assert.equal(plugins.nextOffset, 20);
  const resources = await read(resourcesQuery('reply', '', '', false), 20);
  assert.equal(resources.nextOffset, null);
  const mine = await read(pluginsQuery('', undefined, '', true));
  assert.equal(mine.items[0].my_rating, 4);
  const saved = await read(resourcesQuery('dictionary', '', 'saved', true));
  assert.equal(saved.items[0].saved, true);
  assert.deepEqual(urls, ['/api/plugins?q=%E7%8C%AB&kind=sound', '/api/resources?kind=reply&offset=20', '/api/v1/community/plugins?fields=saved&kinds=helpcode%2Csymbol_set%2Cphrase_table%2Cwordbook', '/api/v1/community/resources?kind=dictionary&scope=saved']);
});

test('Pages routes the cached catalog lists to their Functions', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  for (const path of ['/api/plugins', '/api/plugins/', '/api/resources', '/api/resources/']) assert.ok(routes.includes(path), path);
});

test('the filter chips list only known plugin kinds, and every kind is live or declared to the backend', () => {
  const declared = DECLARED_PLUGIN_KINDS.split(',');
  for (const kind of LIVE_PLUGIN_KINDS) assert.ok(PLUGIN_KINDS.includes(kind), kind);
  for (const kind of PLUGIN_KINDS) assert.ok(LIVE_PLUGIN_KINDS.includes(kind) || declared.includes(kind), kind);
});
