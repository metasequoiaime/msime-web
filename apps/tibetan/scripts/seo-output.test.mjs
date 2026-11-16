import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { basePath, LOCALES, localizedPath, PAGE_PATHS } from '../shared/locales.ts';
import { markdownPath, seoPages, SITE_ORIGIN } from '../shared/site-seo.ts';
import { selectEdition } from '../src/release.ts';

const dist = new URL('../dist/', import.meta.url);
const read = path => readFileSync(new URL(path, dist), 'utf8');
const fileFor = path => (path === '/' ? 'index.html' : `${path.slice(1)}index.html`);
const load = path => parseHTML(read(fileFor(path))).document;
const pages = Object.keys(seoPages);

/** Visible text of the page body, without scripts and styles. */
const visibleText = document => {
  const body = document.body.cloneNode(true);
  body.querySelectorAll('script, style, noscript').forEach(element => { element.remove(); });
  return body.textContent.replace(/\s+/g, ' ').trim();
};

test('every page is prerendered with a real h1, visible text and the right language', () => {
  for (const path of pages) {
    const document = load(path);
    const h1 = document.querySelector('h1');
    assert.ok(h1?.textContent.trim(), `${path} has no h1`);
    assert.ok(visibleText(document).length > 200, `${path} has little static text`);
    assert.equal(document.documentElement.getAttribute('lang'), path.startsWith('/zh/') ? 'zh-CN' : 'bo', path);
    assert.equal(document.documentElement.getAttribute('data-prerendered'), 'true', path);
  }
});

test('canonical, og:url and hreflang point at this site', () => {
  for (const path of pages) {
    const document = load(path);
    const canonical = `${SITE_ORIGIN}${path}`;
    assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), canonical, path);
    assert.equal(document.querySelector('meta[property="og:url"]')?.getAttribute('content'), canonical, path);
    assert.equal(document.querySelector('meta[property="og:image"]')?.getAttribute('content'), `${SITE_ORIGIN}/msime-logo.png`, path);
    assert.equal(document.querySelector('meta[name="robots"]')?.getAttribute('content'), 'index, follow, max-image-preview:large', path);
    const base = basePath(path);
    const alternates = Object.fromEntries([...document.querySelectorAll('link[hreflang]')].map(link => [link.getAttribute('hreflang'), link.getAttribute('href')]));
    assert.deepEqual(alternates, { bo: `${SITE_ORIGIN}${base}`, 'zh-CN': `${SITE_ORIGIN}${localizedPath(base, 'zh')}`, 'x-default': `${SITE_ORIGIN}${base}` }, path);
    const html = document.toString();
    assert.ok(!html.includes('https://msime.app/og-cover.png'), path);
    assert.ok(!/<link[^>]+(canonical|og:url)[^>]+https:\/\/msime\.app/.test(html), path);
  }
});

test('the 404 page is noindex without canonical or og:url', () => {
  const document = parseHTML(read('404.html')).document;
  assert.equal(document.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, follow');
  assert.equal(document.querySelector('link[rel="canonical"]'), null);
  assert.equal(document.querySelector('meta[property="og:url"]'), null);
  assert.equal(document.querySelector('link[hreflang]'), null);
  assert.ok(document.querySelector('h1')?.textContent.trim());
});

test('sitemap and llms.txt list exactly the public pages', () => {
  const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = pages.map(path => `${SITE_ORIGIN}${path}`);
  assert.deepEqual([...sitemap].sort(), [...expected].sort());
  const llms = read('llms.txt');
  const listed = [...llms.matchAll(/\]\((https:\/\/tibetan\.msime\.app\/[^)]+\.md)\)/g)].map(match => match[1]);
  assert.deepEqual([...listed].sort(), pages.map(path => `${SITE_ORIGIN}${markdownPath(path)}`).sort());
  for (const path of pages) assert.ok(existsSync(new URL(markdownPath(path).slice(1), dist)), `${markdownPath(path)} missing`);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/tibetan\.msime\.app\/sitemap\.xml/);
});

test('the download page lists exactly this edition\'s installers from the copied manifest', () => {
  const selected = selectEdition(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));
  const expected = [selected.macos, selected.linux, selected.android, selected.windowsPreview].flatMap(platform => platform?.downloads ?? []);
  assert.ok(expected.length > 0);
  for (const locale of LOCALES) {
    const document = load(localizedPath('/download/', locale));
    const listed = [...document.querySelectorAll('[data-file]')].map(element => element.getAttribute('data-file'));
    assert.deepEqual(listed.sort(), expected.map(download => download.name).sort(), locale);
    for (const download of expected) {
      assert.ok(document.querySelector(`a[href="${download.url}"]`), `${locale}: ${download.name} link`);
      if (download.sha256) assert.ok(visibleText(document).includes(download.sha256), `${locale}: ${download.name} sha256`);
    }
    const links = [...document.querySelectorAll('a[href]')].map(link => link.getAttribute('href'));
    for (const href of links.filter(href => /\/releases\/download\//.test(href) || href.startsWith('https://dl.msime.app/'))) assert.match(href, /tibetan/i, `${locale}: foreign installer ${href}`);
  }
});

test('internal links and assets resolve to built files; no link leads to a removed page', () => {
  const removed = ['/skins', '/plugins', '/dictionaries', '/gallery', '/me', '/words', '/beta', '/zh-TW', '/docs', '/features', '/engine', '/model', '/code', '/about', '/resume', '/price', '/feedback', '/api/'];
  for (const path of [...pages, '/404/']) {
    const document = path === '/404/' ? parseHTML(read('404.html')).document : load(path);
    const refs = [
      ...[...document.querySelectorAll('a[href]')].map(element => element.getAttribute('href')),
      ...[...document.querySelectorAll('link[href], script[src], img[src]')].map(element => element.getAttribute('href') ?? element.getAttribute('src')),
    ];
    for (const ref of refs) {
      if (ref.startsWith('#') || /^https?:\/\//.test(ref)) {
        if (ref.startsWith(SITE_ORIGIN)) assert.ok(!removed.some(prefix => ref.slice(SITE_ORIGIN.length).startsWith(prefix)), `${path} → ${ref}`);
        continue;
      }
      assert.ok(ref.startsWith('/'), `${path} → ${ref}`);
      assert.ok(!removed.some(prefix => ref.startsWith(prefix)), `${path} links to removed ${ref}`);
      const target = ref.split(/[?#]/)[0];
      const file = target.endsWith('/') ? fileFor(target) : target.slice(1);
      assert.ok(existsSync(new URL(file, dist)), `${path} → ${ref} has no built file`);
    }
  }
});

test('Tibetan pages contain no Chinese beyond product names, the language switcher and quoted app labels', () => {
  // Chinese that may appear on a Tibetan page: product names, the switcher's own label and the app's Chinese settings labels quoted with a Tibetan gloss.
  const allowed = ['水杉藏文', '水杉输入法', '水杉五笔', '水杉日语', '水杉越南语', '中文', '设置', '输入', '语言与方案', '添加语言', '藏语', '维护与诊断', '卸载'];
  for (const path of PAGE_PATHS) {
    const document = load(path);
    let text = `${visibleText(document)} ${document.title} ${document.querySelector('meta[name="description"]').getAttribute('content')}`;
    for (const phrase of allowed) text = text.replaceAll(phrase, '');
    const han = text.match(/\p{Script=Han}+/gu);
    assert.equal(han, null, `${path}: ${han?.join(' ')}`);
    assert.ok(/[ༀ-࿿]/.test(visibleText(document)), `${path} has no Tibetan`);
  }
});

test('no page claims iOS or HarmonyOS support', () => {
  for (const path of pages) {
    const document = load(path);
    const items = [...document.querySelectorAll('li')].filter(item => /iOS/.test(item.textContent));
    for (const item of items) assert.ok(!item.className.includes('bg-panel ') || /ད་ལྟ་མེད|暂无/.test(item.textContent), `${path}: ${item.textContent}`);
  }
});

test('the CSP allows the inline theme script and nothing third-party beyond Cloudflare analytics', () => {
  const headers = read('_headers');
  const csp = headers.match(/Content-Security-Policy: ([^\n]+)/)[1];
  assert.match(csp, /script-src 'self' https:\/\/static\.cloudflareinsights\.com 'sha256-/);
  for (const host of ['umami', 'google', 'turnstile', 'challenges.cloudflare', 'api.msime.app', 'wasm.msime.app']) assert.ok(!csp.includes(host), host);
});
