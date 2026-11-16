import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { basePath, languageAlternates, LOCALES, localeOf, localizedPath, PAGE_PATHS } from '../shared/locales.ts';
import { markdownPath, pageSeo, seoPages, SITE_ORIGIN, structuredData } from '../shared/site-seo.ts';

const routes = readFileSync(new URL('../src/routes.tsx', import.meta.url), 'utf8');
const routedPaths = [...routes.matchAll(/path: "([^"]+)"/g)].map(match => (match[1].endsWith('/') ? match[1] : `${match[1]}/`));

test('every routed page is registered, and every registered page is routed', () => {
  assert.deepEqual([...routedPaths].sort(), Object.keys(seoPages).sort());
});

test('every page exists in every locale', () => {
  for (const locale of LOCALES) for (const path of PAGE_PATHS) assert.ok(seoPages[localizedPath(path, locale)], `${locale} ${path}`);
  assert.equal(Object.keys(seoPages).length, PAGE_PATHS.length * LOCALES.length);
});

test('Tibetan lives at the root and Chinese under /zh/', () => {
  assert.equal(localizedPath('/guide/', 'bo'), '/guide/');
  assert.equal(localizedPath('/guide/', 'zh'), '/zh/guide/');
  assert.equal(localizedPath('/', 'zh'), '/zh/');
  assert.equal(localeOf('/zh/'), 'zh');
  assert.equal(localeOf('/zhuyin/'), 'bo');
  assert.equal(basePath('/zh/faq/'), '/faq/');
  assert.equal(pageSeo('/').language, 'bo');
  assert.equal(pageSeo('/zh/download/').language, 'zh-CN');
});

test('canonical addresses point at this site and hreflang links both languages with x-default on Tibetan', () => {
  for (const path of Object.keys(seoPages)) {
    const page = pageSeo(path);
    assert.equal(page.canonical, `${SITE_ORIGIN}${path}`);
    assert.equal(page.noindex, false);
    const base = basePath(path);
    assert.deepEqual(languageAlternates(path), [
      { lang: 'bo', path: base },
      { lang: 'zh-CN', path: localizedPath(base, 'zh') },
      { lang: 'x-default', path: base },
    ]);
  }
  assert.equal(SITE_ORIGIN, 'https://tibetan.msime.app');
});

test('unknown addresses are noindex with no canonical, in the language of their prefix', () => {
  for (const path of ['/nope/', '/zh/nope/', '/skins/', '/me/', '/zh-TW/']) {
    const page = pageSeo(path);
    assert.equal(page.noindex, true, path);
    assert.equal(page.canonical, undefined, path);
    assert.equal(structuredData(path), undefined, path);
  }
  assert.equal(pageSeo('/zh/nope/').language, 'zh-CN');
  assert.equal(pageSeo('/nope/').language, 'bo');
});

test('titles and descriptions are distinct per page', () => {
  const titles = Object.values(seoPages).map(page => page.title);
  const descriptions = Object.values(seoPages).map(page => page.description);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(new Set(descriptions).size, descriptions.length);
});

test('the home page describes the edition as part of MSIME', () => {
  for (const locale of LOCALES) {
    const graph = structuredData(localizedPath('/', locale))['@graph'];
    const app = graph.find(node => node['@type'] === 'SoftwareApplication');
    assert.equal(app.name, '水杉藏文');
    assert.equal(app.isPartOf.url, 'https://msime.app/');
    assert.deepEqual(app.sameAs, ['https://msime.app/']);
    assert.ok(!app.operatingSystem.includes('iOS'));
  }
});

test('Markdown copies sit next to their pages', () => {
  assert.equal(markdownPath('/'), '/index.md');
  assert.equal(markdownPath('/zh/'), '/zh.md');
  assert.equal(markdownPath('/zh/guide/'), '/zh/guide.md');
});
