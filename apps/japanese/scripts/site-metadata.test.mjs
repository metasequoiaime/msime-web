import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HTML_LANG, LOCALES, languageAlternates, localePath } from '../shared/locales.ts';
import { PAGE_PATHS, pageSeo, seoPages, SITE_ORIGIN, structuredData } from '../shared/site-seo.ts';

const routes = readFileSync(new URL('../src/routes.tsx', import.meta.url), 'utf8');
const routedPaths = [...routes.matchAll(/getParentRoute: \(\) => shellRoute, path: "([^"]+)"/g)].map(match => (match[1].endsWith('/') ? match[1] : `${match[1]}/`));

test('every routed page is registered in every locale, and nothing else is', () => {
  assert.deepEqual([...routedPaths].sort(), [...seoPages].sort());
  assert.equal(seoPages.length, PAGE_PATHS.length * LOCALES.length);
  for (const locale of LOCALES) for (const path of PAGE_PATHS) assert.ok(seoPages.includes(localePath(path, locale)), `${locale} ${path}`);
});

test('pages carry their own title, description, language and canonical on the site\'s domain', () => {
  const titles = new Set();
  for (const path of seoPages) {
    const page = pageSeo(path);
    assert.equal(page.noindex, false, path);
    assert.equal(page.canonical, `${SITE_ORIGIN}${path}`);
    assert.equal(page.language, HTML_LANG[page.locale]);
    assert.ok(page.title.includes('水杉日语'), `${path} title names the product`);
    assert.ok(page.description.length >= 50, `${path} description is too short`);
    assert.ok(!titles.has(page.title), `duplicate title ${page.title}`);
    titles.add(page.title);
  }
  assert.equal(pageSeo('/zh/download/').language, 'zh-CN');
  assert.equal(pageSeo('/download/').language, 'ja');
});

test('unknown addresses are noindex without a canonical', () => {
  for (const path of ['/404/', '/docs/', '/zh/skins/', '/zh-TW/']) {
    const page = pageSeo(path);
    assert.equal(page.noindex, true, path);
    assert.equal(page.canonical, undefined, path);
    assert.equal(structuredData(path), undefined, path);
  }
});

test('hreflang alternates point both ways with x-default on the Japanese page', () => {
  assert.deepEqual(languageAlternates('/zh/guide/'), [
    { lang: 'ja', path: '/guide/' },
    { lang: 'zh-CN', path: '/zh/guide/' },
    { lang: 'x-default', path: '/guide/' },
  ]);
  assert.deepEqual(languageAlternates('/'), languageAlternates('/zh/'));
});

test('the home page describes the edition as part of MSIME', () => {
  for (const path of ['/', '/zh/']) {
    const software = structuredData(path)['@graph'].find(node => node['@type'] === 'SoftwareApplication');
    assert.equal(software.isPartOf.url, 'https://msime.app/');
    assert.ok(software.sameAs.includes('https://msime.app/'));
    assert.equal(software.url, `${SITE_ORIGIN}${path}`);
  }
});
