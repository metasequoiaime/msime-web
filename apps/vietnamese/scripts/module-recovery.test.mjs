import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from 'linkedom';
import { recoverUpdatedPage } from '../src/module-recovery.ts';

test('only a changed deployment reloads, preserving URL and guarding repeated failures', async () => {
  const original = Object.fromEntries(['document', 'window', 'sessionStorage', 'DOMParser', 'fetch'].map(key => [key, globalThis[key]]));
  const html = version => `<html><head><script src="/assets/app-${version}.js"></script></head><body></body></html>`;
  let reloads = 0, requests = 0;
  let next = 'old';
  const storage = new Map();
  const href = 'https://msime.app/zh-TW/price/?source=nav#plans';
  try {
    Object.assign(globalThis, {
      document: new DOMParser().parseFromString(html('old'), 'text/html'), DOMParser,
      window: { location: { href, reload() { reloads++; } } },
      sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
      fetch: async (url, options) => { requests++; assert.equal(url, href); assert.equal(options.cache, 'no-store'); return new Response(html(next)); },
    });
    const error = new TypeError('Failed to fetch dynamically imported module: https://msime.app/assets/page-price-old.js');
    assert.equal(await recoverUpdatedPage(new Error('ordinary render error')), false);
    assert.equal(requests, 0);
    assert.equal(await recoverUpdatedPage(error), false, 'network failure on current deployment must not reload');
    next = 'new';
    assert.equal(await recoverUpdatedPage(error), true);
    assert.equal(reloads, 1);
    assert.equal(globalThis.window.location.href, href);
    assert.equal(await recoverUpdatedPage(error), false);
    assert.equal(reloads, 1);
    storage.clear();
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await recoverUpdatedPage(error), false);
    assert.equal(reloads, 1);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
