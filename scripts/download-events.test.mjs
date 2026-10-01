import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorDownloadEvent, reportMirrorDownload, TELEMETRY_EVENTS_URL } from '../shared/download-events.ts';

const download = { version: '0.9.3', artifact: 'MetasequoiaIME_Setup_v0.9.3.exe' };

test('a mirror click is an anonymous cn-mirror download of the Windows installer', () => {
  assert.deepEqual(mirrorDownloadEvent(download, 'f0c1e2d3-a4b5-4c6d-8e7f-001122334455'), {
    id: 'f0c1e2d3-a4b5-4c6d-8e7f-001122334455',
    kind: 'download',
    platform: 'windows',
    version: '0.9.3',
    artifact: 'MetasequoiaIME_Setup_v0.9.3.exe',
    channel: 'cn-mirror',
  });
  const first = mirrorDownloadEvent(download);
  const second = mirrorDownloadEvent(download);
  assert.match(first.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(first.id, second.id, 'every click gets a fresh id');
  assert.equal('install_id' in first, false, 'the website sends no install id');
});

test('the event is posted straight to the backend with keepalive and no credentials', async () => {
  const calls = [];
  reportMirrorDownload(download, async (url, init) => { calls.push({ url, init }); return new Response(null, { status: 202 }); });
  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, 'https://api.msime.app/v1/telemetry/events');
  assert.equal(url, TELEMETRY_EVENTS_URL);
  assert.equal(init.method, 'POST');
  assert.equal(init.keepalive, true);
  assert.equal(init.credentials, 'omit');
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' });
  assert.equal('Authorization' in init.headers, false);
  const body = JSON.parse(init.body);
  assert.deepEqual(Object.keys(body).sort(), ['artifact', 'channel', 'id', 'kind', 'platform', 'version']);
  assert.equal(body.channel, 'cn-mirror');
});

test('a failed report never surfaces to the click', async () => {
  let rejected = false;
  reportMirrorDownload(download, () => { rejected = true; return Promise.reject(new TypeError('network')); });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rejected, true);
});
