import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { basePath, HTML_LANG, localeOf } from '../shared/locales.ts';
import { markdownPath, seoPages, SITE_ORIGIN } from '../shared/site-seo.ts';
import { editionDownloads } from '../src/download/editions.ts';
import { platformsSchema } from '../src/platforms-data.ts';

/*
 * Checks the prerendered output in dist/ (runs at the end of `pnpm build`).
 */
const dist = new URL('../dist/', import.meta.url);
const read = path => readFileSync(new URL(path, dist), 'utf8');
const fileOf = path => (path === '/' ? 'index.html' : `${path.slice(1)}index.html`);
const load = path => parseHTML(read(fileOf(path))).document;
const pages = Object.fromEntries(seoPages.map(path => [path, load(path)]));
const notFound = parseHTML(read('404.html')).document;
const manifest = platformsSchema.parse(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));

// Chinese UI and copy that the Japanese pages must not carry. Product names (水杉日语, 水杉输入法), the Chinese name of the language switch target (简体中文) and quoted settings labels (「输入模式」 and the like) are allowed on purpose.
const ZH_ONLY = ['跳到正文', '首页', '使用指南', '常见问题', '回到顶部', '下载水杉日语', '独立版本', '完整版', '镜像', '发布页', '核对', '页面不存在', '外观', '能做什么', '支持的平台', '罗马字', '假名', '候选', '安装'];

test('every page is prerendered with its language, canonical, og:url and hreflang on the site\'s own domain', () => {
  for (const [path, document] of Object.entries(pages)) {
    const locale = localeOf(path);
    assert.equal(document.documentElement.getAttribute('lang'), HTML_LANG[locale], path);
    assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${SITE_ORIGIN}${path}`, path);
    assert.equal(document.querySelector('meta[property="og:url"]')?.getAttribute('content'), `${SITE_ORIGIN}${path}`, path);
    assert.equal(document.querySelector('meta[property="og:locale"]')?.getAttribute('content'), locale === 'ja' ? 'ja_JP' : 'zh_CN', path);
    assert.equal(document.querySelector('meta[property="og:image"]')?.getAttribute('content'), `${SITE_ORIGIN}/msime-logo.png`, path);
    assert.match(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '', /^index/, path);
    const base = basePath(path);
    const alternates = Object.fromEntries([...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(link => [link.getAttribute('hreflang'), link.getAttribute('href')]));
    assert.deepEqual(alternates, { ja: `${SITE_ORIGIN}${base}`, 'zh-CN': `${SITE_ORIGIN}${base === '/' ? '/zh/' : `/zh${base}`}`, 'x-default': `${SITE_ORIGIN}${base}` }, path);
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1, path);
  }
});

test('every page has one real h1 and visible static text', () => {
  for (const [path, document] of [...Object.entries(pages), ['/404/', notFound]]) {
    const headings = document.querySelectorAll('#root h1');
    assert.equal(headings.length, 1, `${path} h1 count`);
    assert.ok(headings[0].textContent.trim().length > 1, `${path} h1 text`);
    assert.ok(document.querySelector('#root main')?.textContent.trim().length > (path === '/404/' ? 40 : 200), `${path} has too little static text`);
    assert.ok(document.querySelector('#root .header-wrap') && document.querySelector('#root .site-footer'), `${path} shell`);
  }
});

test('the 404 page is noindex without canonical or og:url', () => {
  assert.equal(notFound.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, follow');
  assert.equal(notFound.querySelector('link[rel="canonical"]'), null);
  assert.equal(notFound.querySelector('meta[property="og:url"]'), null);
  assert.equal(notFound.querySelectorAll('link[hreflang]').length, 0);
  assert.equal(notFound.documentElement.getAttribute('lang'), 'ja');
});

test('sitemap, llms.txt and the Markdown copies cover exactly the canonical public pages', () => {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locs.sort(), seoPages.map(path => `${SITE_ORIGIN}${path}`).sort());
  const llms = read('llms.txt');
  const listed = [...llms.matchAll(/\]\((https:\/\/japanese\.msime\.app\/[^)]+\.md)\)/g)].map(match => match[1]);
  assert.deepEqual(listed.sort(), seoPages.map(path => `${SITE_ORIGIN}${markdownPath(path)}`).sort());
  for (const path of seoPages) assert.ok(existsSync(new URL(markdownPath(path).slice(1), dist)), `${markdownPath(path)} missing`);
  assert.ok(!llms.includes('https://msime.app/docs'), 'llms.txt lists the official site\'s pages');
  assert.match(read('robots.txt'), /Sitemap: https:\/\/japanese\.msime\.app\/sitemap\.xml/);
});

test('the download page lists this edition\'s installers and nothing else', () => {
  const editions = editionDownloads(manifest);
  const expected = [...editions.macos.files, ...editions.linux.files.map(item => item.download), ...editions.android.files, ...editions.windows.files];
  assert.ok(expected.length >= 7, 'Linux and Android files are in the manifest');
  for (const path of ['/download/', '/zh/download/']) {
    const document = pages[path];
    const fileLinks = [...document.querySelectorAll('a[href]')].map(link => link.getAttribute('href')).filter(href => /\/releases\/download\/|^https:\/\/dl\.msime\.app\//.test(href));
    for (const href of fileLinks) assert.match(decodeURIComponent(href), /japanese/i, `${path} links a file of another edition: ${href}`);
    for (const download of expected) {
      assert.ok(fileLinks.includes(download.url), `${path} misses ${download.name}`);
      if (download.mirrorUrl) assert.ok(fileLinks.includes(download.mirrorUrl), `${path} misses the mirror of ${download.name}`);
      if (download.sha256) assert.ok(document.querySelector('main').textContent.includes(download.sha256), `${path} misses the SHA-256 of ${download.name}`);
    }
    assert.ok(document.getElementById('static-query-data'), `${path} seeds the manifest`);
  }
});

test('no link or asset points at a page or file the site does not have', () => {
  const htmlFiles = (dir, found = []) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) htmlFiles(path, found);
      else if (entry.name.endsWith('.html')) found.push(path);
    }
    return found;
  };
  const known = new Set(seoPages);
  for (const file of htmlFiles(dist.pathname)) {
    const document = parseHTML(readFileSync(file, 'utf8')).document;
    for (const element of document.querySelectorAll('a[href], link[href], script[src], img[src]')) {
      const value = element.getAttribute('href') ?? element.getAttribute('src');
      if (!value || value.startsWith('#') || value.startsWith('data:')) continue;
      const url = new URL(value, SITE_ORIGIN);
      if (url.origin !== SITE_ORIGIN) continue;
      const path = url.pathname;
      if (path.endsWith('/')) assert.ok(known.has(path), `${file}: link to ${path}, which is not a page`);
      else assert.ok(existsSync(new URL(path.slice(1), dist)), `${file}: ${path} does not exist in dist`);
    }
  }
});

test('Japanese pages carry no leftover Chinese copy', () => {
  for (const [path, document] of Object.entries(pages)) {
    if (localeOf(path) !== 'ja') continue;
    const text = `${document.title} ${document.querySelector('meta[name="description"]').getAttribute('content')} ${document.getElementById('root').textContent}`;
    for (const phrase of ZH_ONLY) assert.ok(!text.includes(phrase), `${path} contains Chinese "${phrase}"`);
  }
  const noscript = pages['/'].querySelector('noscript').innerHTML;
  assert.ok(noscript.includes('JavaScript なしでも'), 'Japanese noscript note');
});

test('the CSP allows only this site and Cloudflare Web Analytics', () => {
  const headers = read('_headers');
  const policy = /Content-Security-Policy: ([^\n]+)/.exec(headers)[1];
  const hosts = [...policy.matchAll(/https:\/\/[^\s;]+/g)].map(match => match[0]);
  assert.deepEqual([...new Set(hosts)].sort(), ['https://cloudflareinsights.com', 'https://static.cloudflareinsights.com']);
  assert.match(policy, /script-src 'self' https:\/\/static\.cloudflareinsights\.com 'sha256-[^']+'/);
  assert.ok(!existsSync(new URL('_routes.json', dist)), 'no Pages Functions routing');
});
