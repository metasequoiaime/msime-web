import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { languageAlternates, PAGE_PATHS } from '../shared/locales.ts';
import { markdownPath, pageSeo, seoPages, SITE_ORIGIN } from '../shared/site-seo.ts';
import { editionDownloads } from '../src/data/edition.ts';
import { platformsSchema } from '../src/platforms-data.ts';

const read = path => readFileSync(`dist/${path}`, 'utf8');
const file = path => (path === '/' ? 'index.html' : `${path.slice(1)}index.html`);
const document = path => parseHTML(read(file(path))).document;
const pages = Object.keys(seoPages);
const vietnamesePages = pages.filter(path => !path.startsWith('/zh/'));

test('every page has one real h1, visible static text and metadata for the own domain', () => {
  for (const path of pages) {
    const doc = document(path);
    const page = pageSeo(path);
    assert.equal(doc.querySelectorAll('h1').length, 1, `${path}: one h1`);
    assert.ok(doc.querySelector('h1').textContent.trim().length > 2, `${path}: h1 has text`);
    assert.ok(doc.querySelector('#root').textContent.trim().length > 400, `${path}: static content`);
    assert.ok(!doc.documentElement.classList.contains('preload'));
    assert.equal(doc.documentElement.getAttribute('lang'), path.startsWith('/zh/') ? 'zh-CN' : 'vi');
    assert.equal(doc.title, page.title);
    assert.equal(doc.querySelector('meta[name=description]').content, page.description);
    assert.equal(doc.querySelector('link[rel=canonical]').href, `${SITE_ORIGIN}${path}`);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, `${SITE_ORIGIN}${path}`);
    assert.equal(doc.querySelector('meta[property="og:locale"]').content, path.startsWith('/zh/') ? 'zh_CN' : 'vi_VN');
    assert.equal(doc.querySelector('meta[property="og:image"]').content, `${SITE_ORIGIN}/msime-logo.png`);
    assert.doesNotMatch(doc.querySelector('meta[name=robots]').content, /noindex/);
    const alternates = [...doc.querySelectorAll('link[hreflang]')].map(link => ({ lang: link.getAttribute('hreflang'), path: link.href.slice(SITE_ORIGIN.length) }));
    assert.deepEqual(alternates, languageAlternates(path), `${path}: hreflang`);
    assert.equal(doc.querySelector('link[type="text/markdown"]').href, `${SITE_ORIGIN}${markdownPath(path)}`);
    assert.ok(read(markdownPath(path).slice(1)).includes(`${SITE_ORIGIN}${path}`));
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) assert.equal(JSON.parse(script.textContent)['@context'], 'https://schema.org');
    for (const element of doc.querySelectorAll('script[src], link[rel=stylesheet], link[rel=modulepreload], img[src]')) {
      const url = element.getAttribute(element.tagName === 'LINK' ? 'href' : 'src');
      if (url.startsWith('/') && !url.startsWith('//')) assert.ok(existsSync(`dist${url}`), `${path}: missing asset ${url}`);
    }
  }
});

test('internal links only point at pages that exist', () => {
  const known = new Set(pages);
  for (const path of pages) {
    for (const link of document(path).querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const target = href.split(/[?#]/)[0];
      if (target.includes('.')) assert.ok(existsSync(`dist${target}`), `${path}: missing file ${href}`);
      else assert.ok(known.has(target), `${path}: link to unknown page ${href}`);
    }
  }
});

test('nothing links to pages the official site has and this one dropped', () => {
  const removed = /href="\/(?:zh\/)?(?:docs|features|community|skins|dictionaries|plugins|gallery|me|feedback|price|privacy|terms|engine|model|code|about|resume|words|beta|zh-TW)\//;
  for (const path of [...pages, '/404/']) assert.doesNotMatch(read(path === '/404/' ? '404.html' : file(path)), removed, path);
  for (const name of ['functions', 'community.json', 'update.json', 'testflight-stats.json', 'install.sh', '_routes.json', 'og-cover.png']) assert.ok(!existsSync(`dist/${name}`), `${name} is gone`);
});

test('sitemap and llms.txt cover exactly the canonical public pages', () => {
  const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations.sort(), pages.map(path => `${SITE_ORIGIN}${path}`).sort());
  const llms = read('llms.txt');
  for (const path of pages) {
    assert.ok(llms.includes(`${SITE_ORIGIN}${markdownPath(path)}`), path);
    assert.ok(read('llms-full.txt').includes(read(markdownPath(path).slice(1))), path);
  }
  assert.doesNotMatch(read('llms-full.txt'), /undefined|\{\{[A-Z_]+\}\}/);
  assert.doesNotMatch(read('sitemap.xml'), /https:\/\/msime\.app/);
});

test('the 404 page is noindex without canonical or og:url', () => {
  const doc = parseHTML(read('404.html')).document;
  assert.match(doc.querySelector('meta[name=robots]').content, /noindex/);
  assert.equal(doc.querySelector('link[rel=canonical]'), null);
  assert.equal(doc.querySelector('meta[property="og:url"]'), null);
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.equal(doc.querySelectorAll('link[hreflang]').length, 0);
});

test('the download page lists exactly this edition\'s installers from the copied manifest', () => {
  const downloads = editionDownloads(platformsSchema.parse(JSON.parse(readFileSync('public/platforms.json', 'utf8'))));
  const expected = ['macos', 'linux', 'android', 'windows'].flatMap(platform => downloads[platform].release?.files.map(entry => entry.name) ?? []);
  assert.ok(expected.length >= 7, 'Linux and Android installers are listed');
  for (const path of ['/download/', '/zh/download/']) {
    const doc = document(path);
    const listed = [...doc.querySelectorAll('[data-file]')].map(element => element.getAttribute('data-file'));
    assert.deepEqual(listed.sort(), [...expected].sort(), path);
    for (const name of listed) assert.match(name, /vietnamese/i);
    for (const link of doc.querySelectorAll('a[href*="/releases/download/"], a[href*="dl.msime.app"]')) assert.match(link.getAttribute('href'), /vietnamese/i, `${path}: ${link.getAttribute('href')}`);
    for (const platform of ['macos', 'linux', 'android', 'ios', 'windows']) assert.ok(doc.getElementById(platform), `${path}: ${platform} section`);
  }
});

test('the guide and FAQ answers are in the static HTML', () => {
  for (const prefix of ['', '/zh']) {
    const guide = document(`${prefix}/guide/`);
    for (const id of ['macos', 'linux', 'android', 'ios', 'windows', 'telex', 'vni', 'tone-style', 'keys', 'settings']) assert.ok(guide.getElementById(id), `${prefix}/guide/: #${id}`);
    const text = guide.querySelector('main').textContent;
    for (const word of ['tiếng', 'người', 'đường', 'hoà', 'hòa', 'thuỷ', 'thủy']) assert.ok(text.includes(word), `${prefix}/guide/: ${word}`);
    const faq = document(`${prefix}/faq/`);
    const questions = faq.querySelectorAll('details');
    assert.ok(questions.length >= 5 && questions.length <= 10);
    for (const item of questions) assert.ok(item.querySelector('p').textContent.length > 20);
  }
});

// Han characters may appear on Vietnamese pages only as product names and quoted settings labels of the app, which is itself labelled in Chinese.
const HAN_ALLOWED = ['水杉越南语', '水杉输入法', '水杉五笔', '水杉日语', '水杉藏文', '设置', '输入', '越南语', '26', '键', '方案', '声调位置', '新式', '旧式', '立即安装', '维护与诊断', '卸载'];
test('Vietnamese pages contain no Han text outside the allowlist', () => {
  for (const path of [...vietnamesePages, '/404/']) {
    const doc = parseHTML(read(path === '/404/' ? '404.html' : file(path))).document;
    let text = `${doc.querySelector('#root').textContent} ${doc.title} ${doc.querySelector('meta[name=description]').content} ${doc.querySelector('noscript')?.textContent ?? ''}`;
    for (const allowed of [...HAN_ALLOWED].sort((a, b) => b.length - a.length)) text = text.replaceAll(allowed, '');
    const han = text.match(/\p{Script=Han}+/gu);
    assert.equal(han, null, `${path}: ${han?.join(' ')}`);
  }
});

test('Chinese pages are written in Chinese', () => {
  for (const path of pages.filter(path => path.startsWith('/zh/'))) {
    const text = document(path).querySelector('main').textContent;
    assert.ok((text.match(/\p{Script=Han}/gu) ?? []).length > 100, path);
  }
});

test('the page set is exactly four pages in two languages plus 404', () => {
  assert.equal(pages.length, PAGE_PATHS.length * 2);
  const html = [];
  const walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = `${dir}/${entry.name}`; if (entry.isDirectory()) walk(path); else if (entry.name.endsWith('.html')) html.push(path.slice('dist/'.length)); } };
  walk('dist');
  assert.deepEqual(html.sort(), [...pages.map(file), '404.html'].sort());
});
