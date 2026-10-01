import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCommunityDictionaries, loadCommunityPlugins, MAX_PACK_QUERY_BYTES as SERVER_MAX_QUERY, packListParams } from '../shared/community-packs.ts';
import { countEntries, loadOfficialDictionaries, loadOfficialPlugins, readPackReadme, readPluginManifest } from '../shared/official-packs.ts';
import { onRequest as communityPlugins } from '../functions/api/plugins/community.ts';
import { onRequest as communityDictionaries } from '../functions/api/dictionaries/community.ts';
import { onRequest as officialPlugins } from '../functions/api/plugins/official.ts';
import { onRequest as officialDictionaries } from '../functions/api/dictionaries/official.ts';
import { communityPackPath, communityPacksQuery, MAX_PACK_QUERY_BYTES, officialPacksQuery } from '../src/data/queries.ts';
import { COMMUNITY_PLUGIN_KINDS, ENTRY_KINDS, PLUGIN_KINDS, PLUGIN_KIND_LABELS } from '../src/data/pack-kinds.ts';
import { officialPluginsSchema, officialDictionariesSchema } from '../src/data/schemas.ts';

const ORIGIN = 'https://api.msime.app';
const PLUGIN_ID = 'b6e8726c-345f-5c5e-b761-0ae7d42f16e7';
const DICTIONARY_ID = 'df3fb132-af73-5a60-b266-4d0c4bf64e52';

/** 常用符号 as production returns it. */
const backendPlugin = (id = PLUGIN_ID, kind = 'command_table') => ({ id, kind, plugin_id: 'symbols', name: '常用符号', description: '不好打的常用符号', author: '小莫', version: '1.0.0', license: 'CC0-1.0', size: 882, sha256: 'a'.repeat(64), downloads: 1, rating_count: 2, rating_average: 4.5, owned: false, my_rating: 0, created_at: '2026-10-01T17:57:47.375272Z' });
/** 开发者常用词 as production returns it. */
const backendDictionary = (id = DICTIONARY_ID, entries = ['代码', '开发', '接口', '数据库', '服务器', '版本'].map((word, index) => ({ kind: 'pinyin', code: `c${index}`, word, weight: 100000 }))) => ({ id, kind: 'dictionary', name: '开发者常用词', description: '从常见开发术语开始', author: '水杉精选', content: { entries }, revision: 1, saves: 1, saved: false, owned: false, rating_count: 0, rating_average: 0, my_rating: 0 });

const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const call = (handler, path, { env = {}, method = 'GET' } = {}) => handler({ request: new Request(`https://msime.app${path}`, { method }), env, waitUntil: () => {} });

// ---- kinds ----

test('the plugin and entry kinds match the backend, and labels match the App', () => {
  // pluginKinds in msime-backend internal/account/community_plugin_archive.go; dictionaryKind in dictionary_http.go.
  assert.deepEqual(PLUGIN_KINDS, ['sound', 'music', 'command_table', 'effect']);
  assert.deepEqual(Object.values(PLUGIN_KIND_LABELS), ['音效包', '音乐包', '指令表', '特效包']);
  assert.deepEqual(COMMUNITY_PLUGIN_KINDS, ['sound', 'music', 'command_table'], 'the App cannot install community effect packs');
  assert.deepEqual(ENTRY_KINDS, ['pinyin', 'wubi', 'english', 'quick']);
});

// ---- community lists ----

test('list parameters follow the backend limits; plugins take a community kind and dictionaries ignore it', () => {
  const params = (path, list = 'plugins') => packListParams(new URL(path, 'https://msime.app'), list);
  assert.deepEqual(params('/api/plugins/community'), { offset: 0, q: '' });
  assert.deepEqual(params('/api/plugins/community?offset=20&q=%20雨%20&kind=music'), { offset: 20, q: '雨', kind: 'music' });
  assert.deepEqual(params('/api/plugins/community?kind='), { offset: 0, q: '' });
  for (const bad of ['?offset=-1', '?offset=1.5', '?offset=100001', `?q=${'雨'.repeat(43)}`, '?kind=effect', '?kind=bogus', '?q=%07']) assert.equal(params(`/api/plugins/community${bad}`), undefined, bad);
  assert.deepEqual(params('/api/dictionaries/community?kind=bogus&q=词', 'dictionaries'), { offset: 0, q: '词' });
  assert.equal(MAX_PACK_QUERY_BYTES, SERVER_MAX_QUERY, 'the search box and the Function agree on the limit');
});

test('community plugins are re-keyed, and an effect pack or a broken row is left out without shifting the next page', async () => {
  const urls = [];
  const effect = backendPlugin('0b1a87bc-99d9-56ea-a8ef-c6382b14eaf5', 'effect');
  const broken = { ...backendPlugin('7c9e6679-7425-40de-944b-e07fc1f90ae7'), downloads: 'many' };
  const page = await loadCommunityPlugins(ORIGIN, { offset: 20, q: '符号', kind: 'command_table' }, async url => { urls.push(url); return Response.json({ plugins: [backendPlugin(), effect, broken], has_more: true }); });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/plugins?offset=20&q=%E7%AC%A6%E5%8F%B7&kind=command_table`]);
  assert.deepEqual(page.items, [{ id: PLUGIN_ID, kind: 'command_table', name: '常用符号', description: '不好打的常用符号', author: '小莫', version: '1.0.0', license: 'CC0-1.0', size: 882, downloads: 1, ratingCount: 2, ratingAverage: 4.5, createdAt: '2026-10-01T17:57:47.375272Z' }]);
  assert.equal(page.nextOffset, 23, 'the skipped rows still count towards the offset');
  await assert.rejects(loadCommunityPlugins(ORIGIN, { offset: 0, q: '' }, async () => new Response(null, { status: 500 })), /HTTP 500/);
  await assert.rejects(loadCommunityPlugins(ORIGIN, { offset: 0, q: '' }, async () => Response.json({ items: [] })));
});

test('community dictionaries keep the counts per kind and a few words, not every entry', async () => {
  const urls = [];
  const many = Array.from({ length: 12 }, (_, index) => ({ kind: index % 3 === 0 ? 'english' : 'pinyin', code: `c${index}`, word: index === 1 ? '词0' : `词${index}`, weight: 1 }));
  const page = await loadCommunityDictionaries(ORIGIN, { offset: 0, q: '开发' }, async url => { urls.push(url); return Response.json({ items: [backendDictionary(), backendDictionary('eec1627c-e4ab-5c8f-83a8-b606720f785f', many)], has_more: false }); });
  assert.deepEqual(urls, [`${ORIGIN}/v1/community/resources?kind=dictionary&q=%E5%BC%80%E5%8F%91`]);
  assert.deepEqual(page.items[0], { id: DICTIONARY_ID, name: '开发者常用词', description: '从常见开发术语开始', author: '水杉精选', counts: { pinyin: 6, wubi: 0, english: 0, quick: 0 }, sample: ['代码', '开发', '接口', '数据库', '服务器', '版本'], saves: 1, ratingCount: 0, ratingAverage: 0 });
  assert.deepEqual(page.items[1].counts, { pinyin: 8, wubi: 0, english: 4, quick: 0 });
  assert.equal(page.items[1].sample.length, 8);
  assert.equal(new Set(page.items[1].sample).size, 8, 'a word under two codes shows once');
  assert.equal(page.nextOffset, null);
});

test('GET /api/plugins/community and /api/dictionaries/community ask the backend at most once a minute per page, search and kind', async t => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    return url.includes('/plugins') ? Response.json({ plugins: [backendPlugin()], has_more: false }) : Response.json({ items: [backendDictionary()], has_more: true });
  });
  const env = { MSIME_API_ORIGIN: 'https://staging.msime.app' };
  const first = await call(communityPlugins, '/api/plugins/community?kind=command_table&q=%20符号', { env });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
  assert.equal((await first.json()).items[0].id, PLUGIN_ID);
  await call(communityPlugins, '/api/plugins/community?q=符号&kind=command_table', { env });
  const dictionaries = await (await call(communityDictionaries, '/api/dictionaries/community?offset=20', { env })).json();
  assert.equal(dictionaries.nextOffset, 21);
  assert.deepEqual(urls, ['https://staging.msime.app/v1/community/plugins?q=%E7%AC%A6%E5%8F%B7&kind=command_table', 'https://staging.msime.app/v1/community/resources?kind=dictionary&offset=20']);
  assert.deepEqual([...cache.stored.keys()], ['https://msime.app/api/plugins/community?q=%E7%AC%A6%E5%8F%B7&kind=command_table', 'https://msime.app/api/dictionaries/community?offset=20'], 'the edge cache key is the path the page requests');
  const rejected = await call(communityPlugins, '/api/plugins/community?kind=effect', { env });
  assert.equal(rejected.status, 400);
  assert.equal((await call(communityDictionaries, '/api/dictionaries/community', { env, method: 'POST' })).status, 405);
  assert.equal(urls.length, 2, 'a rejected request never reaches the backend');
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  assert.equal((await call(communityPlugins, '/api/plugins/community')).status, 503);
  assert.equal((await call(communityDictionaries, '/api/dictionaries/community', { env: { MSIME_API_ORIGIN: 'https://evil.example/path' } })).status, 503);
});

// ---- official packs ----

const toml = (fields, tail = '') => `# A comment\n${Object.entries(fields).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\npermissions = []\n${tail}`;
const PLUGIN_TOMLS = {
  kaomoji: toml({ schema_version: 1, kind: 'command_table', id: 'kaomoji', name: '颜文字', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '常用颜文字：/kx 开心' }, '\n[[commands]]\ntrigger = "kx"\ntitle = "开心"\ntemplate = "(＾▽＾)"\n\n[[commands]]\ntrigger = "ng"\nname = "not a top-level name"\n'),
  'fur-elise': toml({ schema_version: 1, kind: 'sound', id: 'fur-elise', name: '致爱丽丝', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '钢琴音色', mode: 'sequence' }, '\n[sequence]\nsample = "tone.wav"\nsemitones = [\n  7, 6,\n]\n'),
  neon: toml({ schema_version: 1, kind: 'effect', id: 'neon', name: '霓虹', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '' }),
  broken: 'schema_version = 1\nkind = "sound"\n',
};

/** GitHub as the sweep sees it: the tree, the `packs` release and raw files. */
function github({ release = true, tomls = PLUGIN_TOMLS, calls = [] } = {}) {
  return async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    url = String(url);
    if (url === 'https://api.github.com/repos/metasequoiaime/msime-plugins/git/trees/main?recursive=1') {
      return Response.json({ truncated: false, tree: [{ path: 'README.md', type: 'blob', size: 1 }, { path: 'packs', type: 'tree' }, ...Object.keys(tomls).flatMap(id => [{ path: `packs/${id}`, type: 'tree' }, { path: `packs/${id}/plugin.toml`, type: 'blob', size: 10 }]), { path: 'packs/empty', type: 'tree' }, { path: 'templates/effect', type: 'tree' }] });
    }
    if (url === 'https://api.github.com/repos/metasequoiaime/msime-plugins/releases/tags/packs') {
      if (!release) return new Response(null, { status: 404 });
      return Response.json({ assets: [{ name: 'kaomoji-1.0.0.zip', size: 874, browser_download_url: 'https://github.com/metasequoiaime/msime-plugins/releases/download/packs/kaomoji-1.0.0.zip' }, { name: 'fur-elise-0.9.0.zip', size: 1, browser_download_url: 'https://github.com/metasequoiaime/msime-plugins/releases/download/packs/fur-elise-0.9.0.zip' }, { name: 'neon-1.0.0.zip', size: 400, browser_download_url: 'https://evil.example/neon-1.0.0.zip' }] });
    }
    const raw = /^https:\/\/raw\.githubusercontent\.com\/metasequoiaime\/msime-plugins\/main\/packs\/([^/]+)\/plugin\.toml$/.exec(url);
    if (raw && raw[1] in tomls) return new Response(tomls[raw[1]]);
    if (url === 'https://api.github.com/repos/metasequoiaime/msime-dictionary/git/trees/main?recursive=1') {
      return Response.json({ tree: [{ path: 'packs', type: 'tree' }, { path: 'packs/unreal_houdini', type: 'tree' }, { path: 'packs/unreal_houdini/README.md', type: 'blob', size: 100 }, { path: 'packs/unreal_houdini/quanpin.txt', type: 'blob', size: 40 }, { path: 'packs/unreal_houdini/english.txt', type: 'blob', size: 3 * 1024 * 1024 }, { path: 'packs/unreal_houdini/notes/x.txt', type: 'blob', size: 1 }, { path: 'packs/readme-only', type: 'tree' }, { path: 'packs/readme-only/README.md', type: 'blob', size: 1 }, { path: 'cn/BaseDictIceV1.txt', type: 'blob', size: 99 }] });
    }
    if (url === 'https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/main/packs/unreal_houdini/README.md') return new Response('# Unreal Engine 与 Houdini 专业词库\n\n面向 [Unreal Engine](https://example.com) 和 `Houdini`\n的可选词库。\n\n## 导入\n\n别的段落\n');
    if (url === 'https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/main/packs/unreal_houdini/quanpin.txt') return new Response('# 注释\n虚幻编辑器\txu\'huan\t10000\n\n内容浏览器\tnei\'rong\t10000\r\n');
    return new Response(null, { status: 404 });
  };
}

test('a plugin.toml is read for its top-level strings and its command count, and nothing inside its tables', () => {
  const { fields, commands } = readPluginManifest(PLUGIN_TOMLS.kaomoji);
  assert.equal(fields.name, '颜文字', 'the name inside [[commands]] does not override the top-level one');
  assert.equal(fields.kind, 'command_table');
  assert.equal(fields.schema_version, undefined, 'only strings are read');
  assert.equal(commands, 2);
  assert.deepEqual(readPluginManifest('name = "a \\"b\\" \\u00e9" # trailing comment\ndescription = "\\U0001F600"\n').fields, { name: 'a "b" é' }, 'an escape JSON lacks leaves the field out');
  assert.deepEqual(readPluginManifest('[effect]\nname = "late"\n').fields, {});
});

test('official plugins carry their release zip when its id and version match, sorted by kind', async () => {
  const calls = [];
  const { items, stale } = await loadOfficialPlugins({ token: 'ghs_test', request: github({ calls }) });
  assert.equal(stale, false);
  assert.deepEqual(items.map(item => item.id), ['fur-elise', 'kaomoji', 'neon'], 'sound, command table, effect; the broken manifest is skipped');
  assert.deepEqual(items[1], { id: 'kaomoji', kind: 'command_table', name: '颜文字', description: '常用颜文字：/kx 开心', author: '水杉输入法', version: '1.0.0', license: 'CC0-1.0', commands: 2, size: 874, download: 'https://github.com/metasequoiaime/msime-plugins/releases/download/packs/kaomoji-1.0.0.zip', source: 'https://github.com/metasequoiaime/msime-plugins/tree/main/packs/kaomoji' });
  assert.equal(items[0].mode, 'sequence');
  assert.equal(items[0].download, undefined, 'a zip of another version is not offered');
  assert.equal(items[2].download, undefined, 'a zip outside the project release is not offered');
  assert.ok(officialPluginsSchema.parse({ items, stale }));
  assert.ok(calls.filter(call => call.url.startsWith('https://api.github.com/')).every(call => call.auth === 'Bearer ghs_test'));
  assert.ok(calls.filter(call => call.url.startsWith('https://raw.githubusercontent.com/')).every(call => call.auth === undefined), 'the token never goes to raw.githubusercontent.com');
  assert.equal(calls.filter(call => call.url.startsWith('https://api.github.com/')).length, 2, 'one tree and one release call per sweep');

  const withoutRelease = await loadOfficialPlugins({ request: github({ release: false }) });
  assert.equal(withoutRelease.items.length, 3);
  assert.ok(withoutRelease.items.every(item => item.download === undefined));
  await assert.rejects(loadOfficialPlugins({ request: github({ tomls: { broken: PLUGIN_TOMLS.broken } }) }), /No official plugin pack/);
  await assert.rejects(loadOfficialPlugins({ request: async () => new Response(null, { status: 403 }) }), /HTTP 403/);
});

test('a pack README gives the title and first paragraph as plain text; word lists count their entries', () => {
  assert.deepEqual(readPackReadme('# 标题\n\n第一段 **加粗** [链接](https://x)。\n\n第二段'), { name: '标题', description: '第一段 加粗 链接。' });
  assert.deepEqual(readPackReadme('没有标题'), { name: '', description: '' });
  assert.equal(countEntries('# c\na\tb\n\n  \nc\td\r\n'), 2);
});

test('official dictionaries list each pack\'s word lists with their entry counts', async () => {
  const { items } = await loadOfficialDictionaries({ request: github() });
  assert.equal(items.length, 1, 'a pack without word lists is skipped');
  assert.deepEqual(items[0], {
    id: 'unreal_houdini',
    name: 'Unreal Engine 与 Houdini 专业词库',
    description: '面向 Unreal Engine 和 Houdini 的可选词库。',
    license: 'GPL-3.0',
    files: [
      { name: 'quanpin.txt', size: 40, entries: 2, url: 'https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/main/packs/unreal_houdini/quanpin.txt' },
      { name: 'english.txt', size: 3 * 1024 * 1024, url: 'https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/main/packs/unreal_houdini/english.txt' },
    ],
    source: 'https://github.com/metasequoiaime/msime-dictionary/tree/main/packs/unreal_houdini',
  });
  assert.ok(officialDictionariesSchema.parse({ items, stale: false }));
});

test('GET /api/plugins/official and /api/dictionaries/official sweep GitHub once an hour and answer 503 when it never answered', async t => {
  globalThis.caches = { default: memoryCache() };
  const calls = [];
  t.mock.method(globalThis, 'fetch', github({ calls }));
  t.mock.method(console, 'warn', () => {});
  const plugins = await call(officialPlugins, '/api/plugins/official');
  assert.equal(plugins.status, 200);
  assert.equal(plugins.headers.get('Cache-Control'), 'no-store');
  assert.equal((await plugins.json()).items.length, 3);
  const swept = calls.length;
  await call(officialPlugins, '/api/plugins/official?ignored=1');
  assert.equal(calls.length, swept, 'the second request is served from the edge cache');
  assert.ok(calls.every(call => call.auth === undefined), 'without App credentials the sweep is anonymous');
  assert.equal((await (await call(officialDictionaries, '/api/dictionaries/official')).json()).items[0].id, 'unreal_houdini');
  assert.equal((await call(officialPlugins, '/api/plugins/official', { method: 'POST' })).status, 405);
  globalThis.caches = { default: memoryCache() };
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 502 }));
  const failed = await call(officialDictionaries, '/api/dictionaries/official');
  assert.equal(failed.status, 503);
  assert.match((await failed.json()).error, /GitHub/);
});

test('Pages routes /api/plugins/* and /api/dictionaries/* to their Functions', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  assert.ok(routes.includes('/api/plugins/*'));
  assert.ok(routes.includes('/api/dictionaries/*'));
});

test('the queries read the same-origin Functions with the paths they cache under', () => {
  assert.equal(communityPackPath('plugins', 0, ''), '/api/plugins/community');
  assert.equal(communityPackPath('plugins', 40, ' 雨 ', 'music'), '/api/plugins/community?offset=40&q=%E9%9B%A8&kind=music');
  assert.equal(communityPackPath('dictionaries', 0, '', 'music'), '/api/dictionaries/community', 'dictionaries have no kinds');
  assert.deepEqual(communityPacksQuery('plugins', ' 雨 ', 'music').queryKey, ['community-packs', 'plugins', '雨', 'music']);
  assert.deepEqual(communityPacksQuery('dictionaries', '词', 'music').queryKey, ['community-packs', 'dictionaries', '词', '']);
  const options = communityPacksQuery('plugins', '');
  assert.equal(options.initialPageParam, 0);
  assert.equal(options.getNextPageParam({ items: [], nextOffset: 20, stale: false }), 20);
  assert.equal(options.getNextPageParam({ items: [], nextOffset: null, stale: false }), undefined);
  assert.deepEqual(officialPacksQuery('dictionaries').queryKey, ['official-packs', 'dictionaries']);
});
