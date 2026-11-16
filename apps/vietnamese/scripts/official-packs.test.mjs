import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TomlError } from 'smol-toml';
import { ZodError } from 'zod';
import { countEntries, loadOfficialDictionaries, loadOfficialPlugins, readPackReadme, readPluginManifest } from '../shared/official-packs.ts';
import { onRequest as officialPlugins } from '../functions/api/plugins/official.ts';
import { onRequest as officialDictionaries } from '../functions/api/dictionaries/official.ts';
import { officialPacksQuery } from '../src/data/queries.ts';
import { officialPluginsSchema, officialDictionariesSchema } from '../src/data/schemas.ts';

const memoryCache = () => {
  const stored = new Map();
  return { stored, match: async key => stored.get(key.url)?.clone(), put: async (key, value) => { stored.set(key.url, value); } };
};
const call = (handler, path, { env = {}, method = 'GET' } = {}) => handler({ request: new Request(`https://msime.app${path}`, { method }), env, waitUntil: () => {} });

// ---- official packs ----

const toml = (fields, tail = '') => `# A comment\n${Object.entries(fields).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\npermissions = []\n${tail}`;
const PLUGIN_TOMLS = {
  kaomoji: toml({ schema_version: 1, kind: 'command_table', id: 'kaomoji', name: '颜文字', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '常用颜文字：/kx 开心' }, '\n[[commands]]\ntrigger = "kx"\ntitle = "开心"\ntemplate = "(＾▽＾)"\n\n[[commands]]\ntrigger = "ng"\nname = "not a top-level name"\n'),
  'fur-elise': toml({ schema_version: 1, kind: 'sound', id: 'fur-elise', name: '致爱丽丝', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '钢琴音色', mode: 'sequence' }, '\n[sequence]\nsample = "tone.wav"\nsemitones = [\n  7, 6,\n]\n'),
  neon: toml({ schema_version: 1, kind: 'effect', id: 'neon', name: '霓虹', version: '1.0.0', license: 'CC0-1.0', author: '水杉输入法', description: '' }),
  broken: 'schema_version = 1\nkind = "sound"\n',
  malformed: 'kind = "sound"\nid = "malformed\nname = "未闭合的字符串"\n',
};

const DICTIONARY_COMMIT = '0123456789abcdef0123456789abcdef01234567';
const RAW_DICTIONARY = `https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/${DICTIONARY_COMMIT}`;

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
    if (url === 'https://api.github.com/repos/metasequoiaime/msime-dictionary/commits/main') {
      return init?.headers?.Accept === 'application/vnd.github.sha' ? new Response(`${DICTIONARY_COMMIT}\n`) : new Response(null, { status: 415 });
    }
    if (url === `https://api.github.com/repos/metasequoiaime/msime-dictionary/git/trees/${DICTIONARY_COMMIT}?recursive=1`) {
      return Response.json({ tree: [{ path: 'packs', type: 'tree' }, { path: 'packs/unreal_houdini', type: 'tree' }, { path: 'packs/unreal_houdini/README.md', type: 'blob', size: 100 }, { path: 'packs/unreal_houdini/quanpin.txt', type: 'blob', size: 40 }, { path: 'packs/unreal_houdini/english.txt', type: 'blob', size: 3 * 1024 * 1024 }, { path: 'packs/unreal_houdini/notes/x.txt', type: 'blob', size: 1 }, { path: 'packs/readme-only', type: 'tree' }, { path: 'packs/readme-only/README.md', type: 'blob', size: 1 }, { path: 'cn/BaseDictIceV1.txt', type: 'blob', size: 99 }] });
    }
    if (url === `${RAW_DICTIONARY}/packs/unreal_houdini/README.md`) return new Response('# Unreal Engine 与 Houdini 专业词库\n\n面向 [Unreal Engine](https://example.com) 和 `Houdini`\n的可选词库。\n\n## 导入\n\n别的段落\n');
    if (url === `${RAW_DICTIONARY}/packs/unreal_houdini/quanpin.txt`) return new Response('# 注释\n虚幻编辑器\txu\'huan\t10000\n\n内容浏览器\tnei\'rong\t10000\r\n');
    return new Response(null, { status: 404 });
  };
}

test('a plugin.toml is read as TOML: multi-line strings, inline tables and comments, with the top-level fields only', () => {
  const manifest = readPluginManifest(PLUGIN_TOMLS.kaomoji);
  assert.equal(manifest.name, '颜文字', 'the name inside [[commands]] does not override the top-level one');
  assert.equal(manifest.kind, 'command_table');
  assert.equal(manifest.commands.length, 2);

  const full = readPluginManifest([
    '# 文件头注释',
    'kind = "command_table" # 行尾注释',
    "id = 'literal-id'",
    'name = "a \\"b\\" \\u00e9 \\U0001F600"',
    'description = """',
    '第一行',
    '第二行 # 不是注释"""',
    "license = '''CC0-1.0'''",
    'meta = { homepage = "https://example.com", tags = ["a", "b"] }',
    'commands = [{ trigger = "kx", template = "(＾▽＾)" }, { trigger = "ng", name = "inline" }]',
    '',
    '[extra]',
    'name = "late"',
  ].join('\n'));
  assert.equal(full.id, 'literal-id', 'a literal string');
  assert.equal(full.name, 'a "b" é 😀', 'escapes JSON lacks, such as \\U, decode');
  assert.equal(full.description, '第一行\n第二行 # 不是注释', 'a multi-line basic string trims its first newline and keeps the #');
  assert.equal(full.license, 'CC0-1.0');
  assert.equal(full.commands.length, 2, 'commands written as an array of inline tables count too');
  assert.equal(full.meta, undefined, 'keys the page does not read are dropped');

  assert.throws(() => readPluginManifest(PLUGIN_TOMLS.malformed), TomlError, 'invalid TOML');
  assert.throws(() => readPluginManifest(PLUGIN_TOMLS.broken), ZodError, 'id and name are required');
  assert.throws(() => readPluginManifest('kind = "sound"\nid = "x"\nname = 3\n'), ZodError, 'a name that is not a string');
  assert.throws(() => readPluginManifest('[effect]\nkind = "effect"\nid = "x"\nname = "late"\n'), ZodError, 'fields inside a table are not top-level');
});

test('official plugins carry their release zip when its id and version match, sorted by kind', async () => {
  const calls = [];
  const { items, stale } = await loadOfficialPlugins({ token: 'ghs_test', request: github({ calls }) });
  assert.equal(stale, false);
  assert.deepEqual(items.map(item => item.id), ['fur-elise', 'kaomoji', 'neon'], 'sound, command table, effect; the broken and malformed manifests are skipped');
  assert.deepEqual(items[1], { id: 'kaomoji', kind: 'command_table', name: '颜文字', description: '常用颜文字：/kx 开心', author: '水杉输入法', version: '1.0.0', license: 'CC0-1.0', commands: 2, size: 874, download: 'https://github.com/metasequoiaime/msime-plugins/releases/download/packs/kaomoji-1.0.0.zip', mirror: 'https://dl.msime.app/gh/https://github.com/metasequoiaime/msime-plugins/releases/download/packs/kaomoji-1.0.0.zip', source: 'https://github.com/metasequoiaime/msime-plugins/tree/main/packs/kaomoji' });
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
      { name: 'quanpin.txt', size: 40, entries: 2, url: `${RAW_DICTIONARY}/packs/unreal_houdini/quanpin.txt`, mirror: `https://dl.msime.app/gh/${RAW_DICTIONARY}/packs/unreal_houdini/quanpin.txt` },
      { name: 'english.txt', size: 3 * 1024 * 1024, url: `${RAW_DICTIONARY}/packs/unreal_houdini/english.txt`, mirror: `https://dl.msime.app/gh/${RAW_DICTIONARY}/packs/unreal_houdini/english.txt` },
    ],
    source: 'https://github.com/metasequoiaime/msime-dictionary/tree/main/packs/unreal_houdini',
  });
  assert.ok(officialDictionariesSchema.parse({ items, stale: false }));
  // 链接钉在这一轮读到的提交上，镜像才能缓存它；指向 main 的地址会让镜像留住旧文件。
  assert.ok(items[0].files.every(file => file.url.includes(`/${DICTIONARY_COMMIT}/`) && file.mirror === `https://dl.msime.app/gh/${file.url}`));
  assert.equal(officialDictionariesSchema.safeParse({ items: [{ ...items[0], files: [{ ...items[0].files[0], mirror: 'https://evil.example/x' }] }], stale: false }).success, false, 'a mirror link elsewhere is refused');
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

test('Pages routes /api/plugins/official and /api/dictionaries/official to their Functions', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  assert.ok(routes.includes('/api/plugins/official'));
  assert.ok(routes.includes('/api/dictionaries/official'));
});

test('the page reads the official lists from the same-origin Functions, once per visit', () => {
  assert.deepEqual(officialPacksQuery('plugins').queryKey, ['official-packs', 'plugins']);
  assert.deepEqual(officialPacksQuery('dictionaries').queryKey, ['official-packs', 'dictionaries']);
  assert.equal(officialPacksQuery('plugins').staleTime, Number.POSITIVE_INFINITY);
});
