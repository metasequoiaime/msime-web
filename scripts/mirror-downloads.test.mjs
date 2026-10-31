import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { attachMirrors, dropMirrors, mirrorBase, mirrorKey, mirroredDownloads, mirrorOne, mirrorUrl } from './mirror-downloads.mjs';
import { platformsSchema } from '../src/platforms-data.ts';

const WINDOWS = 'https://github.com/metasequoiaime/MSIME-Windows/releases/download/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe';
const MACOS = 'https://github.com/metasequoiaime/msime/releases/download/macos-v0.52.0/msime-macos-0.52.0-universal.dmg';
const BASE = 'https://dl.msime.app';

test('a package is stored under its repository, tag and file name', () => {
  assert.equal(mirrorKey(WINDOWS), 'releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe');
  assert.equal(mirrorKey(MACOS), 'releases/msime/macos-v0.52.0/msime-macos-0.52.0-universal.dmg');
  assert.equal(mirrorUrl(BASE, MACOS), 'https://dl.msime.app/releases/msime/macos-v0.52.0/msime-macos-0.52.0-universal.dmg');
  assert.throws(() => mirrorKey('https://github.com/someone-else/repo/releases/download/v1/file.exe'), /Not a project release download/);
});

test('the mirror base must be a plain https URL and loses its trailing slash', () => {
  assert.equal(mirrorBase(''), null);
  assert.equal(mirrorBase(undefined), null);
  assert.equal(mirrorBase('https://dl.msime.app/'), BASE);
  assert.equal(mirrorBase('https://mirror.example.com'), 'https://mirror.example.com');
  assert.throws(() => mirrorBase('http://dl.msime.app'), /plain https URL/);
  assert.throws(() => mirrorBase('https://dl.msime.app/?x=1'), /plain https URL/);
});

const pkg = (url, extra = {}) => ({ label: '安装程序', arch: 'x64', name: url.split('/').at(-1), url, size: 5, sha256: null, ...extra });

test('正式版、预览版和实验版包都获得镜像，没有镜像基址时保持不变', () => {
  const platforms = {
    windows: { version: '0.9.5', downloads: [pkg(WINDOWS)], preview: null, experimental: { version: '0.4.0', downloads: [pkg('https://github.com/metasequoiaime/msime/releases/download/windows-v0.4.0/MetasequoiaIME_Setup_v0.4.0.exe')] } },
    macos: { version: '0.52.0', downloads: [pkg(MACOS)], preview: { version: '0.53.0-build.1', downloads: [pkg(MACOS.replaceAll('0.52.0', '0.53.0'))] } },
  };
  assert.equal(attachMirrors(platforms, null), platforms);
  const mirrored = attachMirrors(platforms, BASE);
  assert.equal(mirrored.windows.downloads[0].mirrorUrl, `${BASE}/releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe`);
  assert.equal(mirrored.windows.experimental.downloads[0].mirrorUrl, `${BASE}/releases/msime/windows-v0.4.0/MetasequoiaIME_Setup_v0.4.0.exe`);
  assert.equal(mirrored.macos.preview.downloads[0].mirrorUrl, `${BASE}/releases/msime/macos-v0.53.0/msime-macos-0.53.0-universal.dmg`);
  assert.equal(mirrored.windows.preview, null);
  assert.deepEqual(mirroredDownloads({ platforms: mirrored }).map(entry => entry.key), [
    'releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe',
    'releases/msime/windows-v0.4.0/MetasequoiaIME_Setup_v0.4.0.exe',
    'releases/msime/macos-v0.52.0/msime-macos-0.52.0-universal.dmg',
    'releases/msime/macos-v0.53.0/msime-macos-0.53.0-universal.dmg',
  ]);
  assert.deepEqual(mirroredDownloads({ platforms }), [], 'nothing to upload when the manifest carries no mirror');
});

test('the site accepts an https mirror and drops anything else without losing the package', () => {
  const current = JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8'));
  const manifest = mirrored => {
    const copy = structuredClone(current);
    copy.platforms.windows.downloads[0].mirrorUrl = mirrored;
    return copy;
  };
  const ok = platformsSchema.parse(manifest(`${BASE}/releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe`));
  assert.equal(ok.platforms.windows.downloads[0].mirrorUrl, `${BASE}/releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe`);
  for (const bad of ['http://dl.msime.app/a.exe', 'javascript:alert(1)']) {
    const parsed = platformsSchema.parse(manifest(bad));
    assert.equal(parsed.platforms.windows.downloads[0].mirrorUrl, undefined, bad);
    // The live manifest moves with every Windows release, so the package is compared with itself rather than a pinned version.
    assert.equal(parsed.platforms.windows.downloads[0].url, current.platforms.windows.downloads[0].url);
  }
});

const BODY = Buffer.from('hello');
const SHA = createHash('sha256').update(BODY).digest('hex');

/**
 * The public mirror URL as workers/dl/ answers it. `objects` maps a key to the bytes R2 holds; HEAD reports only those, and a GET for a missing key stores `githubBody` first, the way the worker fills from GitHub. `denied` makes it answer 403 for everything.
 */
function harness({ objects = {}, githubBody = BODY, denied = false } = {}) {
  const calls = [];
  const request = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method });
    if (denied) return new Response(null, { status: 403, headers: { 'content-length': '0' } });
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    if (method === 'HEAD') {
      if (!(key in objects)) return new Response(null, { status: 404, headers: { 'content-length': '0' } });
      return new Response(null, { status: 200, headers: { 'content-length': String(objects[key].length) } });
    }
    objects[key] ??= githubBody;
    return new Response(objects[key]);
  };
  return { calls, objects, request };
}

const entry = (sha256 = SHA) => {
  const [mirrored] = mirroredDownloads({ platforms: { windows: { downloads: [{ ...pkg(WINDOWS, { sha256 }), mirrorUrl: mirrorUrl(BASE, WINDOWS) }] } } });
  return mirrored;
};

test('a package already in the mirror is checked with HEAD alone', async () => {
  const { calls, request } = harness({ objects: { [entry().key]: BODY } });
  assert.equal(await mirrorOne(entry(), { request }), 'present');
  assert.deepEqual(calls, [{ url: entry().mirrorUrl, method: 'HEAD' }], 'nothing is downloaded');
});

test('a missing package is pulled into the mirror by reading it back in full, then checked again', async () => {
  const { calls, objects, request } = harness();
  assert.equal(await mirrorOne(entry(), { request }), 'filled');
  assert.deepEqual(objects[entry().key], BODY);
  assert.deepEqual(calls.map(call => call.method), ['HEAD', 'GET', 'HEAD']);
  assert.ok(calls.every(call => call.url === entry().mirrorUrl), 'GitHub is only ever reached through the mirror');
});

test('without a checksum in the manifest a copy of the right size counts as mirrored', async () => {
  const { request } = harness({ githubBody: Buffer.from('hellO') });
  assert.equal(await mirrorOne(entry(null), { request }), 'filled');
});

test('a mirrored copy that does not match the manifest is an error', async () => {
  for (const [name, options, pattern] of [
    ['checksum', { githubBody: Buffer.from('hellO') }, /does not match/],
    ['size', { githubBody: Buffer.from('hello!') }, /served 6 bytes/],
    ['stale copy of another size', { objects: { [entry().key]: Buffer.from('hello!') } }, /served 6 bytes/],
  ]) {
    const { request } = harness(options);
    await assert.rejects(mirrorOne(entry(), { request }), pattern, name);
  }
});

test('a mirror the public cannot download is an error, not a dead link', async () => {
  const { request } = harness({ denied: true });
  await assert.rejects(mirrorOne(entry(), { request }), /answered HTTP 403/);
});

test('a package that could not be mirrored loses its mirror and keeps its GitHub download', () => {
  const platforms = attachMirrors({
    windows: { version: '0.9.5', downloads: [pkg(WINDOWS)], preview: null },
    macos: { version: '0.52.0', downloads: [pkg(MACOS)], preview: { version: '0.53.0', downloads: [pkg(MACOS.replaceAll('0.52.0', '0.53.0'))] } },
  }, BASE);
  const kept = dropMirrors({ generatedAt: 'x', platforms, dictionary: null }, [mirrorKey(MACOS)]);
  assert.equal(kept.platforms.macos.downloads[0].mirrorUrl, undefined);
  assert.equal('mirrorUrl' in kept.platforms.macos.downloads[0], false);
  assert.equal(kept.platforms.macos.downloads[0].url, MACOS);
  assert.ok(kept.platforms.macos.preview.downloads[0].mirrorUrl, 'other packages keep theirs');
  assert.ok(kept.platforms.windows.downloads[0].mirrorUrl);
  assert.equal(kept.dictionary, null);
});
