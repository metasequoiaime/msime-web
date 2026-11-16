import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { languageAlternates, localeHref, LOCALES, localePath, PAGE_PATHS } from '../shared/locales.ts';
import { pageSeo, seoPages, SITE_ORIGIN, structuredData } from '../shared/site-seo.ts';
import { vi } from '../src/i18n/vi.ts';
import { zh } from '../src/i18n/zh.ts';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

/** Every static path in the route table is a page; the build only writes HTML for registered paths. */
const routedPages = () => [...read('src/routes.tsx').matchAll(/path: "(\/[^"$]*)"/g)].map(match => (match[1].endsWith('/') ? match[1] : `${match[1]}/`));

test('every routed page is registered, in both languages, and nothing else is', () => {
  const routes = routedPages().sort();
  assert.deepEqual(routes, Object.keys(seoPages).sort());
  for (const locale of LOCALES) for (const path of PAGE_PATHS) assert.ok(seoPages[localePath(locale, path)], `${locale} ${path}`);
  assert.equal(Object.keys(seoPages).length, PAGE_PATHS.length * LOCALES.length);
});

test('titles and descriptions are unique and canonicals sit on the own domain', () => {
  const titles = new Set();
  for (const [path, page] of Object.entries(seoPages)) {
    assert.ok(!titles.has(page.title), `${path}: unique title`);
    titles.add(page.title);
    assert.ok(page.description.length > 60, `${path}: real description`);
    assert.equal(pageSeo(path).canonical, `${SITE_ORIGIN}${path}`);
    assert.equal(pageSeo(path).language, path.startsWith('/zh/') ? 'zh-CN' : 'vi');
  }
  assert.equal(SITE_ORIGIN, 'https://vietnamese.msime.app');
});

test('hreflang alternates point both ways with x-default on Vietnamese', () => {
  for (const path of PAGE_PATHS) {
    const expected = [{ lang: 'vi', path }, { lang: 'zh-CN', path: `/zh${path}` }, { lang: 'x-default', path }];
    assert.deepEqual(languageAlternates(path), expected);
    assert.deepEqual(languageAlternates(`/zh${path}`), expected);
  }
  assert.deepEqual(languageAlternates('/nope/'), []);
});

test('the 404 page is noindex without a canonical', () => {
  const page = pageSeo('/does-not-exist/');
  assert.equal(page.noindex, true);
  assert.equal(page.canonical, undefined);
  assert.equal(structuredData('/does-not-exist/'), undefined);
  assert.equal(pageSeo('/zh/does-not-exist/').language, 'zh-CN');
});

test('locale links keep query and fragment and leave external URLs alone', () => {
  assert.equal(localeHref('/guide/#telex', 'zh'), '/zh/guide/#telex');
  assert.equal(localeHref('/download', 'zh'), '/zh/download/');
  assert.equal(localeHref('/guide/', 'vi'), '/guide/');
  assert.equal(localeHref('https://msime.app/', 'zh'), 'https://msime.app/');
  assert.equal(localeHref('/platforms.json', 'zh'), '/platforms.json');
});

test('the home page describes the edition as part of msime.app', () => {
  for (const path of ['/', '/zh/']) {
    const software = structuredData(path)['@graph'].find(node => node['@type'] === 'SoftwareApplication');
    assert.equal(software.isPartOf.url, 'https://msime.app/');
    assert.ok(software.sameAs.includes('https://msime.app/'));
    assert.deepEqual(software.operatingSystem, ['macOS', 'Linux', 'Android']);
  }
});

test('both message modules have the same shape', () => {
  const shape = value => (Array.isArray(value) ? value.map(shape) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)])) : typeof value);
  assert.deepEqual(shape(zh), shape(vi));
});

test('robots and the CSP only name this site and what Pages injects', () => {
  assert.match(read('public/robots.txt'), /^Sitemap: https:\/\/vietnamese\.msime\.app\/sitemap\.xml$/m);
  const csp = read('public/_headers').match(/Content-Security-Policy: ([^\n]+)/)[1];
  assert.match(csp, /default-src 'self'/);
  const hosts = [...csp.matchAll(/https:\/\/[^\s;]+/g)].map(match => match[0]);
  assert.deepEqual([...new Set(hosts)].sort(), ['https://cloudflareinsights.com', 'https://static.cloudflareinsights.com']);
});
