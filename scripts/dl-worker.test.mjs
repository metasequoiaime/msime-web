import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker, { BUFFER_LIMIT, objectKey, originFor } from '../workers/dl/index.mjs';
import { DOWNLOAD_OUTBOX, flushDownloads } from '../workers/dl/download-stats.mjs';

const DICTIONARY = 'https://github.com/metasequoiaime/msime-dictionary/releases/download/dict-v2.0.14/msime-pinyin.db';
const ENGINE_RAW = 'https://raw.githubusercontent.com/metasequoiaime/msime-engine/a9b9f092219505166c927843762b650d1e0e501d/handwriting/models/handwriting-zh_CN.model';

test('a gh/ path maps to the GitHub address it carries, only inside the allowed prefixes', () => {
  assert.equal(originFor(objectKey(`/gh/${DICTIONARY}`)), DICTIONARY);
  assert.equal(originFor(objectKey(`/gh/${ENGINE_RAW}`)), ENGINE_RAW);
  assert.equal(originFor(objectKey('/gh/https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/model.tar.bz2')), 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/model.tar.bz2');
  for (const path of [
    '/gh/https://github.com/someone-else/repo/releases/download/v1/file.exe',
    '/gh/https://github.com/metasequoiaime/msime/archive/refs/heads/main.zip',
    '/gh/https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/',
    '/gh/http://github.com/metasequoiaime/msime/releases/download/v1/a.apk',
    '/avatars/someone.png',
    '/',
  ]) assert.equal(originFor(objectKey(path)), null, path);
});

test('a path that could climb out of an allowed prefix is refused', () => {
  for (const path of [
    '/gh/https://github.com/metasequoiaime/msime/releases/download/../../../someone/repo/releases/download/v1/a.exe',
    '/gh/https://github.com/metasequoiaime/msime/releases/download/%2e%2e/%2e%2e/x',
    '/gh/https://github.com/metasequoiaime/msime/releases/download/v1/./a.apk',
    '/gh/https://github.com/metasequoiaime/msime/releases/download/v1//a.apk',
    '/gh/https://github.com/metasequoiaime/msime/releases/download/v1/a%5C..%5Cb',
    '/gh/https://github.com/metasequoiaime/msime/releases/download/%E0%A4%A',
    '/releases/msime/../../x',
  ]) assert.equal(originFor(objectKey(path)), null, path);
});

test('a releases/ path is a metasequoiaime release asset, decoded the way mirror-downloads.mjs encodes it', () => {
  assert.equal(objectKey('/releases/msime/macos-v0.52.0/msime%20macos.dmg'), 'releases/msime/macos-v0.52.0/msime macos.dmg');
  assert.equal(originFor('releases/msime/macos-v0.52.0/msime macos.dmg'), 'https://github.com/metasequoiaime/msime/releases/download/macos-v0.52.0/msime%20macos.dmg');
  assert.equal(originFor('releases/MSIME-Windows/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe'), 'https://github.com/metasequoiaime/MSIME-Windows/releases/download/v0.9.5/MetasequoiaIME_Setup_v0.9.5.exe');
  assert.equal(originFor('releases/not-ours/v1/a.exe'), null);
  assert.equal(originFor('releases/msime/v1'), null);
});

/** An in-memory stand-in for the R2 binding with the subset of the API the worker uses. */
function fakeBucket(initial = {}) {
  const objects = new Map(Object.entries(initial).map(([key, body]) => [key, { body: new TextEncoder().encode(body), httpMetadata: {} }]));
  const view = (key, stored, range) => ({
    key,
    size: stored.body.byteLength,
    httpEtag: `"${key.length}-${stored.body.byteLength}"`,
    httpMetadata: stored.httpMetadata,
    range,
    writeHttpMetadata(headers) {
      if (stored.httpMetadata.contentType) headers.set('content-type', stored.httpMetadata.contentType);
      if (stored.httpMetadata.cacheControl) headers.set('cache-control', stored.httpMetadata.cacheControl);
    },
  });
  return {
    objects,
    puts: [],
    async head(key) {
      return objects.has(key) ? view(key, objects.get(key)) : null;
    },
    async get(key, { range } = {}) {
      const stored = objects.get(key);
      if (!stored) return null;
      const header = range?.get('range');
      if (!header) return { ...view(key, stored), body: new Blob([stored.body]).stream(), json: async () => JSON.parse(new TextDecoder().decode(stored.body)) };
      const [, start, end] = /^bytes=(\d+)-(\d+)$/.exec(header);
      const slice = stored.body.slice(Number(start), Number(end) + 1);
      // Like R2, the unused range field is present and undefined.
      return { ...view(key, stored, { offset: Number(start), length: slice.byteLength, suffix: undefined }), body: new Blob([slice]).stream() };
    },
    async put(key, body, { httpMetadata }) {
      const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array(await new Response(body).arrayBuffer());
      this.puts.push(key);
      objects.set(key, { body: bytes, httpMetadata });
    },
    async list({ prefix, limit }) { return { objects: [...objects.keys()].filter(key => key.startsWith(prefix)).slice(0, limit).map(key => ({ key })) }; },
    async delete(key) { objects.delete(key); },
  };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Stubs GitHub: `files` maps a URL to its body; `chunked` lists URLs answered without Content-Length. */
function fakeGitHub(files, { chunked = [] } = {}) {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (!(url in files)) return new Response('Not Found', { status: 404 });
    const body = files[url];
    if (chunked.includes(url)) return new Response(new Blob([body]).stream(), { headers: { 'content-type': 'text/plain' } });
    return new Response(body, { headers: { 'content-length': String(body.length), 'content-type': 'application/octet-stream' } });
  };
  return calls;
}

const get = (env, path, init) => worker.fetch(new Request(`https://dl.msime.app${path}`, init), env);

test('an object already in R2 is served without going to GitHub', async () => {
  const env = { BUCKET: fakeBucket({ [`gh/${DICTIONARY}`]: 'cached' }) };
  const calls = fakeGitHub({});
  const response = await get(env, `/gh/${DICTIONARY}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'cached');
  assert.deepEqual(calls, []);
});

test('a missing object is fetched from GitHub once, stored, then served from R2', async () => {
  const env = { BUCKET: fakeBucket() };
  const calls = fakeGitHub({ [DICTIONARY]: 'dictionary' });
  const first = await get(env, `/gh/${DICTIONARY}`);
  assert.equal(first.status, 200);
  assert.equal(await first.text(), 'dictionary');
  assert.equal(first.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const second = await get(env, `/gh/${DICTIONARY}`);
  assert.equal(await second.text(), 'dictionary');
  assert.deepEqual(calls, [DICTIONARY], 'GitHub is asked only once');
  assert.deepEqual(env.BUCKET.puts, [`gh/${DICTIONARY}`]);
});

test('a range request on a missing object is answered from the stored copy with 206', async () => {
  const env = { BUCKET: fakeBucket() };
  fakeGitHub({ [DICTIONARY]: '0123456789' });
  const response = await get(env, `/gh/${DICTIONARY}`, { headers: { range: 'bytes=2-5' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(await response.text(), '2345');
});

test('HEAD reports what R2 holds and never goes to GitHub', async () => {
  const env = { BUCKET: fakeBucket({ 'releases/msime/macos-v0.52.0/a.dmg': 'abcde' }) };
  const calls = fakeGitHub({ 'https://github.com/metasequoiaime/msime/releases/download/macos-v0.52.0/b.dmg': 'x' });
  const present = await get(env, '/releases/msime/macos-v0.52.0/a.dmg', { method: 'HEAD' });
  assert.equal(present.status, 200);
  assert.equal(present.headers.get('content-length'), '5');
  const absent = await get(env, '/releases/msime/macos-v0.52.0/b.dmg', { method: 'HEAD' });
  assert.equal(absent.status, 404);
  assert.deepEqual(calls, []);
});

test('an address outside the allowed prefixes is 403 and never fetched', async () => {
  const env = { BUCKET: fakeBucket({ 'avatars/a.png': 'avatar' }) };
  const calls = fakeGitHub({});
  assert.equal((await get(env, '/avatars/a.png')).status, 403);
  assert.equal((await get(env, '/gh/https://github.com/someone/repo/releases/download/v1/a.exe')).status, 403);
  assert.equal((await get(env, `/gh/${DICTIONARY}`, { method: 'POST' })).status, 405);
  assert.deepEqual(calls, []);
});

test('a file GitHub does not have is 404 and nothing is stored; other upstream failures are 502', async () => {
  const env = { BUCKET: fakeBucket() };
  fakeGitHub({});
  assert.equal((await get(env, `/gh/${DICTIONARY}`)).status, 404);
  globalThis.fetch = async () => new Response('busy', { status: 503 });
  assert.equal((await get(env, `/gh/${DICTIONARY}`)).status, 502);
  assert.deepEqual(env.BUCKET.puts, []);
});

test('an upstream answer without Content-Length is buffered and stored when it is small', async () => {
  const env = { BUCKET: fakeBucket() };
  fakeGitHub({ [ENGINE_RAW]: 'model' }, { chunked: [ENGINE_RAW] });
  const response = await get(env, `/gh/${ENGINE_RAW}`);
  assert.equal(await response.text(), 'model');
  assert.deepEqual(env.BUCKET.puts, [`gh/${ENGINE_RAW}`]);
  assert.ok(BUFFER_LIMIT >= 32 * 1024 * 1024, 'the largest pinned raw file (26 MB handwriting model) still fits');
});

test('直接下载由镜像保存匿名事件，失败上报保留发件箱并复用事件 ID 重试', async () => {
  const key = 'releases/msime/windows-v0.3.0/MetasequoiaIME-Full_Setup_v0.3.0.exe';
  const env = { BUCKET: fakeBucket({ [key]: '0123456789' }) };
  fakeGitHub({});
  const response = await get(env, `/${key}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '0123456789');
  const [pending] = (await env.BUCKET.list({ prefix: DOWNLOAD_OUTBOX, limit: 100 })).objects;
  const event = await (await env.BUCKET.get(pending.key)).json();
  assert.equal(event.platform, 'windows-rust');
  assert.equal(event.channel, 'cn-mirror');
  assert.deepEqual(Object.keys(event).sort(), ['artifact', 'channel', 'id', 'kind', 'platform', 'version']);
  const requests = [];
  const deliver = async (url, init) => {
    assert.equal(url, 'https://api.msime.app/v1/telemetry/events');
    requests.push(JSON.parse(init.body));
    return new Response(null, { status: requests.length === 1 ? 503 : 202 });
  };
  await flushDownloads(env, deliver);
  assert.equal(env.BUCKET.objects.has(pending.key), true);
  await flushDownloads(env, deliver);
  assert.equal(env.BUCKET.objects.has(pending.key), false);
  assert.deepEqual(requests, [event, event]);
  await flushDownloads(env, deliver);
  assert.equal(requests.length, 2);
});

test('镜像只记成功的起始 GET，不记 HEAD、续传、预热、资源或错误响应', async () => {
  const key = 'releases/msime/android-v0.1.0/msime-android.apk';
  const env = { BUCKET: fakeBucket({ [key]: '0123456789', [`gh/${DICTIONARY}`]: 'dictionary' }) };
  fakeGitHub({});
  await get(env, `/${key}`, { method: 'HEAD' });
  await get(env, `/${key}`, { headers: { range: 'bytes=2-5' } });
  await get(env, `/${key}`, { headers: { 'x-msime-mirror-check': '1' } });
  await get(env, `/gh/${DICTIONARY}`);
  await get(env, '/releases/msime/android-v0.2.0/msime-android.apk');
  assert.equal((await env.BUCKET.list({ prefix: DOWNLOAD_OUTBOX, limit: 100 })).objects.length, 0);
  const start = await get(env, `/${key}`, { headers: { range: 'bytes=0-5' } });
  assert.equal(start.status, 206);
  assert.equal((await env.BUCKET.list({ prefix: DOWNLOAD_OUTBOX, limit: 100 })).objects.length, 1);
  const scheduledEnv = { BUCKET: fakeBucket() };
  await worker.scheduled({}, scheduledEnv);
});

test('发件箱网络错误或限流不删事件，并限制每轮最多投递 100 条', async () => {
  const env = { BUCKET: fakeBucket() };
  for (let index = 0; index < 105; index += 1) await env.BUCKET.put(`${DOWNLOAD_OUTBOX}${index}.json`, JSON.stringify({ id: index }), { httpMetadata: {} });
  let calls = 0;
  await flushDownloads(env, async () => { calls += 1; throw new TypeError('synthetic network'); });
  assert.equal(calls, 100);
  assert.equal(env.BUCKET.objects.size, 105);
  await flushDownloads(env, async () => new Response(null, { status: 429 }));
  assert.equal(env.BUCKET.objects.size, 105);
  await flushDownloads(env, async () => new Response(null, { status: 202 }));
  assert.equal(env.BUCKET.objects.size, 5);
});

test('统计持久化失败不阻断安装包响应，只记录固定错误码', async t => {
  const key = 'releases/msime/android-v0.1.0/msime-android.apk';
  const env = { BUCKET: fakeBucket({ [key]: 'synthetic-installer' }) };
  env.BUCKET.put = async () => { throw new Error('synthetic storage unavailable'); };
  const errors = [];
  const original = console.error;
  console.error = (...values) => errors.push(values);
  t.after(() => { console.error = original; });
  const response = await get(env, `/${key}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'synthetic-installer');
  assert.deepEqual(errors, [['download_count_persist_failed']]);
});
