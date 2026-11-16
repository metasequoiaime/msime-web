import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { LOCALES, LOCALE_INFO, PAGE_PATHS, PRIMARY_LOCALE, SITE_ORIGIN, languageAlternates, localePath, pageSeo, seoPages, structuredData } from '../shared/site-seo.ts';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

/** Each static route path in the router is a page. The build only prerenders addresses in the SEO registry, so an unregistered route would answer 404 when opened directly. */
const routedPages = () => [...read('src/routes.tsx').matchAll(/path: "(\/[^"$]*)"/g)].map(match => (match[1].endsWith('/') ? match[1] : `${match[1]}/`));

test('the SEO registry holds exactly the routed pages, in every locale', () => {
  const routes = routedPages();
  assert.deepEqual([...routes].sort(), [...PAGE_PATHS].sort());
  const expected = LOCALES.flatMap(locale => PAGE_PATHS.map(path => localePath(locale, path)));
  assert.deepEqual(Object.keys(seoPages).sort(), expected.sort());
  for (const path of expected) {
    const page = seoPages[path];
    assert.ok(page.title && page.description.length > 40, path);
    assert.equal(page.noindex, undefined, `${path} is public`);
  }
  assert.equal(new Set(Object.values(seoPages).map(page => page.title)).size, expected.length, 'titles are unique');
});

test('canonical, language and alternates point at this site', () => {
  assert.equal(SITE_ORIGIN, 'https://wubi.msime.app');
  assert.deepEqual(LOCALES, ['zh-CN']);
  assert.equal(LOCALE_INFO[PRIMARY_LOCALE].prefix, '', 'the primary locale lives at the root');
  for (const path of Object.keys(seoPages)) {
    const page = pageSeo(path);
    assert.equal(page.canonical, `${SITE_ORIGIN}${path}`);
    assert.equal(page.language, 'zh-CN');
    const alternates = languageAlternates(path);
    assert.deepEqual(alternates.map(alternate => alternate.lang), ['zh-CN', 'x-default']);
    assert.equal(alternates.at(-1).path, localePath(PRIMARY_LOCALE, path));
  }
});

test('the home page describes the edition as part of the full product', () => {
  const graph = structuredData('/')['@graph'];
  const software = graph.find(node => node['@type'] === 'SoftwareApplication');
  assert.equal(software.name, '水杉五笔');
  assert.equal(software.isPartOf.url, 'https://msime.app/');
  assert.ok(software.sameAs.includes('https://msime.app/'));
  assert.equal(software.url, `${SITE_ORIGIN}/`);
});

test('the 404 page is not indexable and has no canonical of its own', () => {
  assert.equal(pageSeo('/404/').noindex, true);
  assert.equal(pageSeo('/404/').canonical, undefined);
  assert.equal(structuredData('/404/'), undefined);
  assert.match(read('scripts/build-seo.mjs'), /'\/404\/'/, 'the build must write dist/404.html, which Cloudflare Pages serves for unmatched addresses');
});

test('the single entry carries this site\'s home metadata', () => {
  const html = read('index.html');
  assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], pageSeo('/').canonical);
  assert.equal(html.match(/<title>([^<]+)<\/title>/)?.[1], pageSeo('/').title);
  assert.equal(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1], pageSeo('/').title);
  assert.match(html, /<meta property="og:image" content="https:\/\/wubi\.msime\.app\/msime-logo\.png"/);
  assert.match(html, /<html lang="zh-CN"/);
  assert.doesNotMatch(html, /og-cover|"https:\/\/msime\.app\//);
  assert.ok(existsSync(new URL('public/msime-logo.png', root)));
});

test('robots and the security headers fit a static site without third-party services', () => {
  assert.match(read('public/robots.txt'), /^Sitemap: https:\/\/wubi\.msime\.app\/sitemap\.xml$/m);
  const headers = read('public/_headers');
  const csp = headers.match(/Content-Security-Policy: ([^\n]+)/)[1];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' https:\/\/static\.cloudflareinsights\.com(;| )/);
  assert.match(csp, /connect-src 'self' https:\/\/cloudflareinsights\.com/);
  assert.doesNotMatch(csp, /umami|google|challenges\.cloudflare|wasm|api\.msime\.app|media\.msime\.app/);
  for (const header of ['X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Strict-Transport-Security']) assert.ok(headers.includes(header), header);
  assert.match(headers, /\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  for (const removed of ['/install.sh', '/community.json', '/update.json', '/msime/*']) assert.ok(!headers.includes(`\n${removed}\n`), removed);
});

test('server-side pieces of msime.app are gone', () => {
  assert.equal(existsSync(new URL('functions', root)), false);
  assert.equal(existsSync(new URL('public/_routes.json', root)), false);
  const pkg = JSON.parse(read('package.json'));
  for (const removed of ['@msime/web-engine', 'opencc-js', 'markdown-it', 'prismjs', '@msime-web/download-stats']) assert.equal(pkg.dependencies[removed], undefined, removed);
});

test('every test file in scripts/ runs in `pnpm test` or the build', () => {
  const pkg = JSON.parse(read('package.json'));
  const listed = `${pkg.scripts.test} ${pkg.scripts.build}`;
  for (const file of readdirSync(new URL('scripts/', root)).filter(name => name.endsWith('.test.mjs'))) assert.ok(listed.includes(`scripts/${file}`), file);
});
