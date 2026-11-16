import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { analyticsBeforeSend, startSiteAnalytics, reportDownloadClick, UMAMI_ORIGIN, UMAMI_WEBSITE_ID } from '../shared/site-analytics.ts';

test('page views retain campaign attribution without search text, fragments or identities', () => {
  const beforeSend = analyticsBeforeSend('https://msime.app/?utm_source=x&utm_medium=social&utm_campaign=backend-v1.0.0&q=private#secret');
  const value = beforeSend('event', {
    url: 'https://msime.app/download/?platform=linux&q=private#input', title: '下载',
    referrer: 'https://example.test/private?token=secret#hidden',
    id: 'synthetic-account', data: { email: 'person@example.test' }, language: 'zh-CN', screen: '800x600',
  });
  assert.deepEqual(value, {
    website: UMAMI_WEBSITE_ID, hostname: 'msime.app',
    url: '/download/?utm_source=x&utm_medium=social&utm_campaign=backend-v1.0.0',
    title: '下载', referrer: 'https://example.test', language: 'zh-CN', screen: '800x600',
  });
  assert.equal(beforeSend('identify', { id: 'synthetic-account' }), false);
  assert.equal(beforeSend('event', { name: 'arbitrary', data: { text: 'private' } }), false);
});

test('a new campaign replaces the entry campaign and persists only in the current handler', () => {
  const beforeSend = analyticsBeforeSend('https://msime.app/?utm_source=x&utm_campaign=old');
  assert.equal(beforeSend('event', { url: '/?utm_source=reddit&utm_medium=social' }).url, '/?utm_source=reddit&utm_medium=social');
  assert.equal(beforeSend('event', { url: '/download/' }).url, '/download/?utm_source=reddit&utm_medium=social');
  assert.equal(analyticsBeforeSend('https://msime.app/')('event', { url: '/download/' }).url, '/download/');
});

test('invalid campaign values and private referrer queries are discarded', () => {
  const beforeSend = analyticsBeforeSend(`https://msime.app/?utm_source=person%40example.test&utm_campaign=${'a'.repeat(129)}`);
  assert.equal(beforeSend('event', { url: '/', referrer: '/feedback/?email=person%40example.test#private' }).referrer, '/feedback/');
  assert.equal(beforeSend('event', { url: '/' }).url, '/');
  assert.equal(beforeSend('event', { url: 'http://[invalid' }), false);
});

test('download clicks contain only package metadata and never masquerade as installs', () => {
  const beforeSend = analyticsBeforeSend('https://msime.app/?utm_source=telegram&utm_medium=social');
  const event = beforeSend('event', { url: '/download/', name: 'Download', data: {
    platform: 'linux', channel: 'github', version: '1.0.0', artifact: 'msime_amd64.deb',
    email: 'person@example.test', text: 'private',
  } });
  assert.equal(event.name, 'Download');
  assert.deepEqual(event.data, { platform: 'linux', channel: 'github', version: '1.0.0', artifact: 'msime_amd64.deb' });
  assert.equal(new URL(event.url, 'https://msime.app').searchParams.get('utm_source'), 'telegram');
});

test('only the production domain loads the tracker once and download reporting never throws', async () => {
  const previous = { window: globalThis.window, document: globalThis.document };
  try {
    const { document } = parseHTML('<html><head></head><body></body></html>');
    const window = { location: new URL('https://preview.example.test/'), navigator: { doNotTrack: '0' } };
    Object.assign(globalThis, { document, window });
    startSiteAnalytics();
    assert.equal(document.querySelector('script'), null);
    window.location = new URL('https://msime.app/?utm_source=x&utm_medium=social');
    window.navigator.doNotTrack = '1';
    startSiteAnalytics();
    assert.equal(document.querySelector('script'), null);
    window.navigator.doNotTrack = '0';
    startSiteAnalytics();
    startSiteAnalytics();
    assert.equal(document.querySelectorAll('script').length, 1);
    const tracker = document.querySelector('script');
    assert.equal(tracker.src, `${UMAMI_ORIGIN}/script.js`);
    assert.equal(tracker.dataset.websiteId, UMAMI_WEBSITE_ID);
    assert.equal(tracker.dataset.beforeSend, 'msimeUmamiBeforeSend');
    assert.equal(typeof window.msimeUmamiBeforeSend, 'function');
    assert.equal(tracker.referrerPolicy, 'no-referrer');
    const calls = [];
    window.umami = { track: (...args) => { calls.push(args); return Promise.resolve(); } };
    reportDownloadClick({ platform: 'macos', channel: 'github' });
    assert.deepEqual(calls, [['Download', { platform: 'macos', channel: 'github' }]]);
    window.navigator.doNotTrack = '1';
    reportDownloadClick({ platform: 'macos', channel: 'github' });
    assert.equal(calls.length, 1);
    window.navigator.doNotTrack = '0';
    window.umami.track = () => { throw new Error('tracker blocked'); };
    assert.doesNotThrow(() => reportDownloadClick({ platform: 'macos', channel: 'github' }));
    window.umami.track = () => Promise.reject(new Error('offline'));
    reportDownloadClick({ platform: 'macos', channel: 'github' });
    await new Promise(resolve => setImmediate(resolve));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

test('CSP permits the self-hosted script and collection endpoint without enabling inline scripts', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').split('Content-Security-Policy: ')[1].split('\n')[0];
  for (const directive of ['script-src', 'connect-src']) {
    assert.ok(headers.match(new RegExp(`${directive} ([^;]+)`))[1].split(' ').includes(UMAMI_ORIGIN));
  }
  assert.doesNotMatch(headers.match(/script-src ([^;]+)/)[1], /unsafe-inline/);
});
