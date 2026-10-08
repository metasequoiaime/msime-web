import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  assert.equal(mirrorBase('https://msime-dl.oss-cn-hongkong.aliyuncs.com'), 'https://msime-dl.oss-cn-hongkong.aliyuncs.com');
  assert.throws(() => mirrorBase('http://dl.msime.app'), /plain https URL/);
  assert.throws(() => mirrorBase('https://dl.msime.app/?x=1'), /plain https URL/);
});

const pkg = (url, extra = {}) => ({ label: '安装程序', arch: 'x64', name: url.split('/').at(-1), url, size: 5, sha256: null, ...extra });

test('every stable and preview package gets a mirror, and none without a base', () => {
  const platforms = {
    windows: { version: '0.9.5', downloads: [pkg(WINDOWS)], preview: null },
    macos: { version: '0.52.0', downloads: [pkg(MACOS)], preview: { version: '0.53.0-build.1', downloads: [pkg(MACOS.replaceAll('0.52.0', '0.53.0'))] } },
  };
  assert.equal(attachMirrors(platforms, null), platforms);
  const mirrored = attachMirrors(platforms, BASE);
  assert.equal(mirrored.windows.downloads[0].mirrorUrl, `${BASE}/releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe`);
  assert.equal(mirrored.macos.preview.downloads[0].mirrorUrl, `${BASE}/releases/msime/macos-v0.53.0/msime-macos-0.53.0-universal.dmg`);
  assert.equal(mirrored.windows.preview, null);
  assert.deepEqual(mirroredDownloads({ platforms: mirrored }).map(entry => entry.key), [
    'releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe',
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
    assert.equal(parsed.platforms.windows.downloads[0].url, WINDOWS);
  }
});

const BODY = Buffer.from('hello');
const SHA = createHash('sha256').update(BODY).digest('hex');

/**
 * A fake bucket behind the public mirror URL. `objects` maps a key to the sha256 stored with it; the public URL answers from it the way OSS does, with the stored checksum in `x-oss-meta-sha256`. `publicDenied` makes it answer 403 for everything, as a bucket without public read does.
 */
function harness({ objects = {}, githubBody = BODY, publicDenied = false, credentials = true } = {}) {
  const calls = { client: 0, upload: [], fetch: [] };
  const oss = {
    async multipartUpload(key, file, options) {
      calls.upload.push({ key, file, options });
      objects[key] = options.meta.sha256;
    },
  };
  const client = async () => {
    calls.client += 1;
    if (!credentials) throw new Error('ALIBABA_CLOUD_ACCESS_KEY_ID is required to mirror downloads');
    return oss;
  };
  const request = async (url, init = {}) => {
    calls.fetch.push({ url, method: init.method ?? 'GET' });
    if (url.startsWith('https://github.com/')) return new Response(githubBody);
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    if (publicDenied) return new Response(null, { status: 403, headers: { 'content-length': '0' } });
    if (!(key in objects)) return new Response(null, { status: 404, headers: { 'content-length': '0' } });
    return new Response(null, { status: 200, headers: { 'content-length': String(BODY.length), 'x-oss-meta-sha256': objects[key] } });
  };
  return { calls, client, request };
}

const entry = (sha256 = SHA) => {
  const [mirrored] = mirroredDownloads({ platforms: { windows: { downloads: [{ ...pkg(WINDOWS, { sha256 }), mirrorUrl: mirrorUrl(BASE, WINDOWS) }] } } });
  return mirrored;
};

async function withWorkdir(run) {
  const workdir = await mkdtemp(join(tmpdir(), 'mirror-test-'));
  try {
    return await run(workdir);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

test('a package already served with the same checksum is left alone and needs no credentials', async () => {
  const { calls, client, request } = harness({ objects: { [entry().key]: SHA }, credentials: false });
  await withWorkdir(async workdir => assert.equal(await mirrorOne(entry(), { client, request, workdir }), 'present'));
  assert.equal(calls.client, 0);
  assert.deepEqual(calls.fetch, [{ url: entry().mirrorUrl, method: 'HEAD' }], 'only the public copy is checked');
});

test('a missing package is copied from GitHub with its checksum and checked at the public URL', async () => {
  const { calls, client, request } = harness();
  await withWorkdir(async workdir => {
    assert.equal(await mirrorOne(entry(), { client, request, workdir }), 'uploaded');
    assert.deepEqual(await readdir(workdir), [], 'the temporary copy is removed');
  });
  assert.equal(calls.upload.length, 1);
  const [{ key, options }] = calls.upload;
  assert.equal(key, 'releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe');
  assert.deepEqual(options.meta, { sha256: SHA });
  assert.equal(options.headers['Content-Disposition'], 'attachment; filename="MetasequoiaIME_Setup_v0.9.5.exe"');
  assert.deepEqual(calls.fetch.map(call => call.method), ['HEAD', 'GET', 'HEAD']);
});

test('a copy whose checksum no longer matches the release is replaced', async () => {
  const { calls, client, request } = harness({ objects: { [entry().key]: 'b'.repeat(64) } });
  await withWorkdir(async workdir => assert.equal(await mirrorOne(entry(), { client, request, workdir }), 'uploaded'));
  assert.equal(calls.upload.length, 1);
});

test('without a checksum in the manifest a copy of the right size counts as mirrored', async () => {
  const { calls, client, request } = harness({ objects: { [entry().key]: 'c'.repeat(64) } });
  await withWorkdir(async workdir => assert.equal(await mirrorOne(entry(null), { client, request, workdir }), 'present'));
  assert.deepEqual(calls.upload, []);
});

test('a download that does not match the manifest is never uploaded', async () => {
  for (const [name, options, pattern] of [
    ['checksum', { githubBody: Buffer.from('hellO') }, /does not match/],
    ['size', { githubBody: Buffer.from('hello!') }, /downloaded 6 bytes/],
  ]) {
    const { calls, client, request } = harness(options);
    await withWorkdir(workdir => assert.rejects(mirrorOne(entry(), { client, request, workdir }), pattern, name));
    assert.deepEqual(calls.upload, [], name);
  }
});

test('an upload the public cannot download is an error, not a dead link', async () => {
  const { client, request } = harness({ publicDenied: true });
  await withWorkdir(workdir => assert.rejects(mirrorOne(entry(), { client, request, workdir }), /answered HTTP 403/));
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
