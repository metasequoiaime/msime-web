import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { PAGE_PATHS, SITE_ORIGIN, markdownPath, pageSeo, seoPages } from '../shared/site-seo.ts';
import { editionReleases, manifestSchema } from '../src/release-data.ts';

const read = path => readFileSync(`dist/${path}`, 'utf8');
const file = path => (path === '/' ? 'index.html' : `${path.slice(1)}index.html`);
const document = path => parseHTML(read(file(path))).document;
const pages = Object.keys(seoPages);
const htmlFiles = (dir, found = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) htmlFiles(path, found);
    else if (name.endsWith('.html')) found.push(path);
  }
  return found;
};

test('every page has visible static content and matching metadata for this domain', () => {
  for (const path of pages) {
    const doc = document(path);
    const page = pageSeo(path);
    assert.equal(doc.querySelectorAll('h1').length, 1, `${path}: one h1`);
    assert.ok(doc.querySelector('h1').textContent.trim().length > 2, `${path}: real h1`);
    assert.ok(doc.querySelector('#root').textContent.trim().length > 300, `${path}: static text`);
    assert.equal(doc.documentElement.getAttribute('lang'), 'zh-CN');
    assert.ok(!doc.documentElement.classList.contains('preload'));
    assert.equal(doc.title, page.title);
    assert.equal(doc.querySelector('meta[name=description]').getAttribute('content'), page.description);
    assert.equal(doc.querySelector('link[rel=canonical]').getAttribute('href'), `${SITE_ORIGIN}${path}`);
    assert.equal(doc.querySelector('meta[property="og:url"]').getAttribute('content'), `${SITE_ORIGIN}${path}`);
    assert.equal(doc.querySelector('meta[property="og:locale"]').getAttribute('content'), 'zh_CN');
    assert.doesNotMatch(doc.querySelector('meta[name=robots]').getAttribute('content'), /noindex/);
    const alternates = [...doc.querySelectorAll('link[hreflang]')].map(link => [link.getAttribute('hreflang'), link.getAttribute('href')]);
    assert.deepEqual(alternates, [['zh-CN', `${SITE_ORIGIN}${path}`], ['x-default', `${SITE_ORIGIN}${path}`]]);
    assert.equal(doc.querySelector('link[type="text/markdown"]').getAttribute('href'), `${SITE_ORIGIN}${markdownPath(path)}`);
    assert.ok(read(markdownPath(path).slice(1)).includes(`${SITE_ORIGIN}${path}`));
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) assert.equal(JSON.parse(script.textContent)['@context'], 'https://schema.org');
  }
});

test('sitemap and llms cover exactly the canonical public pages', () => {
  const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations.sort(), pages.map(path => `${SITE_ORIGIN}${path}`).sort());
  const llms = read('llms.txt');
  const linked = [...llms.matchAll(/\]\((https:\/\/wubi\.msime\.app\/[^)]+\.md)\)/g)].map(match => match[1]);
  assert.deepEqual(linked.sort(), pages.map(path => `${SITE_ORIGIN}${markdownPath(path)}`).sort());
  for (const path of pages) assert.ok(read('llms-full.txt').includes(read(markdownPath(path).slice(1))));
  assert.doesNotMatch(read('llms-full.txt'), /undefined|\{\{/);
  assert.match(read('_headers'), /script-src 'self' https:\/\/static\.cloudflareinsights\.com 'sha256-/);
});

test('the 404 page is noindex without canonical or og:url', () => {
  const notFound = parseHTML(read('404.html')).document;
  assert.match(notFound.querySelector('meta[name=robots]').getAttribute('content'), /noindex/);
  assert.equal(notFound.querySelector('link[rel=canonical]'), null);
  assert.equal(notFound.querySelector('meta[property="og:url"]'), null);
  assert.equal(notFound.querySelector('link[hreflang]'), null);
  assert.equal(notFound.querySelectorAll('h1').length, 1);
  assert.ok(!existsSync('dist/404.md'));
});

test('the download page lists only this edition\'s installers from the copied manifest', () => {
  const releases = editionReleases(manifestSchema.parse(JSON.parse(readFileSync('public/platforms.json', 'utf8'))));
  const doc = document('/download/');
  const listed = [...doc.querySelectorAll('.download-file-name')].map(code => code.textContent);
  const expected = [releases.macos, releases.linux, releases.android, ...(releases.windowsPreview ? [releases.windowsPreview] : [])].flatMap(release => release.files.map(file => file.name));
  assert.deepEqual(listed.sort(), expected.sort());
  assert.ok(listed.length >= 7, 'Linux and Android files at least');
  for (const name of listed) assert.match(name, /wubi/i);
  const hrefs = [...doc.querySelectorAll('.download-panel a[href]')].map(link => link.getAttribute('href'));
  for (const file of releases.linux.files) {
    assert.ok(hrefs.includes(file.url), file.name);
    if (file.sha256) assert.ok(doc.querySelector('.download-panel').textContent.includes(file.sha256));
  }
  // Without a macOS edition pkg in the manifest the card still links the macOS release.
  assert.ok(hrefs.includes(releases.macos.releaseUrl));
  for (const name of ['msime-android.apk', 'msime-linux_', 'MetasequoiaIME-Full_Setup', 'msime-android-pinyin']) assert.ok(!doc.querySelector('.download-panel').textContent.includes(name), name);
  assert.ok(hrefs.includes('https://msime.app/download/'));
});

test('no link or asset points at a removed page or a missing file', () => {
  const allowed = new Set(PAGE_PATHS);
  for (const path of htmlFiles('dist')) {
    const doc = parseHTML(readFileSync(path, 'utf8')).document;
    for (const element of doc.querySelectorAll('a[href], link[href], script[src], img[src]')) {
      const url = element.getAttribute(element.tagName === 'A' || element.tagName === 'LINK' ? 'href' : 'src');
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const pathname = url.split('#')[0].split('?')[0];
      if (element.tagName === 'A') assert.ok(allowed.has(pathname), `${path}: link to ${url}`);
      else assert.ok(existsSync(`dist${pathname}`), `${path}: missing asset ${url}`);
    }
    for (const link of doc.querySelectorAll('a[href^="https://wubi.msime.app"]')) assert.ok(allowed.has(new URL(link.getAttribute('href')).pathname), link.getAttribute('href'));
  }
  for (const removed of ['community.json', 'update.json', 'install.sh', 'og-cover.png', '_routes.json', 'msime', 'img/screenshots', 'docs', 'zh-TW']) assert.ok(!existsSync(`dist/${removed}`), removed);
});

test('no zh-TW or removed msime.app features remain on the pages', () => {
  for (const path of [...pages, '/404/']) {
    const text = path === '/404/' ? read('404.html') : read(file(path));
    assert.doesNotMatch(text, /zh-TW|zh-Hant|繁體|網頁|水杉娘|社区皮肤|umami|turnstile|accounts\.google/i, path);
    assert.doesNotMatch(text, /新世纪/, `${path}: 新世纪五笔 is not mentioned`);
  }
});

test('the FAQ answers are in the static HTML and its structured data', () => {
  const doc = document('/faq/');
  const schema = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => JSON.parse(script.textContent)['@graph'] ?? []).find(node => node['@type'] === 'FAQPage');
  assert.ok(schema.mainEntity.length >= 5 && schema.mainEntity.length <= 10);
  for (const item of schema.mainEntity) {
    assert.ok(doc.querySelector('#root').textContent.includes(item.name));
    assert.ok(item.acceptedAnswer.text.length > 20);
    assert.doesNotMatch(item.acceptedAnswer.text, /\]\(|`/);
  }
});
