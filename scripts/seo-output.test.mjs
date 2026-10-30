import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { seoPages, pageSeo, markdownPath, SITE_ORIGIN } from '../shared/site-seo.ts';
import { onRequest } from '../functions/docs.ts';
import { galleryImageBaseUrl, galleryItems } from '../src/gallery/items.ts';
import { stickerBaseUrl, stickerPacks } from '../src/gallery/stickers.ts';

const read = path => readFileSync(`dist/${path}`, 'utf8');
const publicPages = Object.entries(seoPages).filter(([, page]) => !page.noindex);
const indexed = publicPages.filter(([path]) => pageSeo(path).canonicalPath === path);
const file = path => path === '/' ? 'index.html' : `${path.slice(1)}index.html`;
const document = path => parseHTML(read(file(path))).document;

test('every indexable route has visible static content, matching metadata and discoverable Markdown', () => {
  const titles = new Set();
  for (const [path, page] of publicPages) {
    const doc = document(path);
    assert.equal(doc.querySelectorAll('h1').length, 1, `${path}: one primary heading`);
    assert.ok(doc.querySelector('#root').textContent.trim().length > 150, `${path}: real static content`);
    assert.ok(!doc.documentElement.classList.contains('preload'));
    assert.equal(doc.title, page.title);
    assert.ok(!titles.has(doc.title), `${path}: unique title`); titles.add(doc.title);
    assert.equal(doc.querySelector('meta[name=description]').content, page.description);
    assert.equal(doc.querySelector('meta[property="og:title"]').content, page.title);
    assert.equal(doc.querySelector('meta[name="twitter:description"]').content, page.description);
    assert.equal(doc.querySelector('link[rel=canonical]').href, pageSeo(path).canonical);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, pageSeo(path).canonical);
    assert.doesNotMatch(doc.querySelector('meta[name=robots]').content, /noindex/);
    assert.equal(doc.querySelector('link[type="text/markdown"]').href, `${SITE_ORIGIN}${markdownPath(path)}`);
    assert.ok(read(markdownPath(path).slice(1)).includes(`${SITE_ORIGIN}${path}`));
    assert.doesNotMatch(read(file(path)), /data-msg=|data-stck=/, `${path}: SSR did not fall back`);
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) assert.equal(JSON.parse(script.textContent)['@context'], 'https://schema.org');
    for (const element of doc.querySelectorAll('script[src], link[rel=stylesheet], img[src]')) {
      const url = element.getAttribute(element.tagName === 'SCRIPT' || element.tagName === 'IMG' ? 'src' : 'href');
      if (url.startsWith('/') && !url.startsWith('//')) assert.ok(existsSync(`dist${url}`), `${path}: missing asset ${url}`);
    }
  }
});

test('sitemap and AI index cover exactly the canonical public pages', () => {
  const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations.sort(), indexed.map(([path]) => `${SITE_ORIGIN}${path}`).sort());
  for (const [path] of indexed) {
    assert.ok(read('llms.txt').includes(`${SITE_ORIGIN}${markdownPath(path)}`));
    assert.ok(read('llms-full.txt').includes(read(markdownPath(path).slice(1))));
  }
  assert.doesNotMatch(read('llms.txt'), /\/resume/);
  assert.doesNotMatch(read('llms-full.txt'), /undefined|\{\{[A-Z_]+\}\}/);
});

test('all six guides and FAQ answers are present without JavaScript', () => {
  const landing = document('/docs/');
  assert.ok(read('docs.md').includes('文档版本：MSIME-Docs'));
  assert.equal(landing.querySelector('link[rel=canonical]').href, `${SITE_ORIGIN}/docs/windows/`);
  assert.ok(landing.querySelector('.docs-article')?.textContent.length > 400, 'the docs entry opens a readable guide');
  assert.equal(landing.querySelector('.docs-platform[aria-current="page"]')?.textContent, 'Windows');
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux', 'android', 'ios']) {
    const doc = document(`/docs/${guide}/`);
    assert.ok(doc.querySelector('.docs-article').textContent.length > 400, guide);
    assert.ok(doc.querySelectorAll('a[href^="/docs/"]').length >= 4, guide);
    assert.ok(read(`docs/${guide}.md`).includes('MSIME-Docs'));
  }
  const faq = document('/faq/');
  const schema = [...faq.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)).find(data => data['@type'] === 'FAQPage');
  assert.equal(schema.mainEntity.length, 32);
  for (const item of schema.mainEntity) {
    assert.ok(faq.querySelector('#root').textContent.includes(item.name));
    assert.ok(item.acceptedAnswer.text.length > 20);
  }
  assert.ok(document('/download/').querySelector('.download-panel').textContent.includes(JSON.parse(read('update.json')).version));
});

test('noindex pages and Markdown duplicates do not pollute canonical indexing', () => {
  const notFound = parseHTML(read('404.html')).document;
  assert.match(notFound.querySelector('meta[name=robots]').content, /noindex/);
  assert.equal(notFound.querySelector('link[rel=canonical]'), null);
  assert.match(document('/resume/').querySelector('meta[name=robots]').content, /noindex/);
  assert.doesNotMatch(read('robots.txt'), /Disallow: \/resume/);
  for (const path of ['/me/', '/zh-TW/me/']) {
    assert.match(document(path).querySelector('meta[name=robots]').content, /noindex/, path);
    assert.doesNotMatch(read('sitemap.xml'), new RegExp(`${path}<`), path);
    assert.ok(!read('llms.txt').includes(`${SITE_ORIGIN}${markdownPath(path)}`), path);
  }
  for (const [path] of publicPages) assert.ok(read('_headers').includes(`${markdownPath(path)}\n  Content-Type: text/markdown; charset=utf-8\n  Link: <${pageSeo(path).canonical}>; rel="canonical"\n  X-Robots-Tag: noindex`));
  assert.ok(Math.max(...read('_headers').split('\n').map(line => line.length)) < 2000, 'Pages header line limit');
});

test('legacy guide redirects preserve queries without accepting unknown or external targets', async () => {
  let calls = 0;
  const next = async () => { calls++; return new Response('static'); };
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux', 'android', 'ios']) {
    const response = await onRequest({ request: new Request(`${SITE_ORIGIN}/docs/?platform=${guide}&utm_source=test`), next });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), `${SITE_ORIGIN}/docs/${guide}/?utm_source=test`);
  }
  const traditional = await onRequest({ request: new Request(`${SITE_ORIGIN}/zh-TW/docs/?platform=linux&utm_source=test`), next });
  assert.equal(traditional.headers.get('Location'), `${SITE_ORIGIN}/zh-TW/docs/linux/?utm_source=test`);
  for (const value of ['', '?platform=unknown', '?platform=https://example.com']) assert.equal((await onRequest({ request: new Request(`${SITE_ORIGIN}/docs/${value}`), next })).status, 200);
  assert.equal(calls, 3);
  const mirror = await onRequest({ request: new Request('https://metasequoiaime.pages.dev/docs/?platform=linux'), next });
  assert.equal(mirror.status, 301);
  assert.equal(mirror.headers.get('Location'), 'https://msime.app/docs/?platform=linux');
});


test('duplicate guide bodies share a canonical and AI indexes include them only once', () => {
  const bodies = new Map();
  for (const [path] of publicPages) {
    const doc = document(path);
    const article = doc.querySelector('.docs-article');
    if (!article) continue;
    const body = article.textContent.trim();
    const canonical = doc.querySelector('link[rel=canonical]').href;
    if (bodies.has(body)) assert.equal(canonical, bodies.get(body), `${path}: duplicate content has a different canonical`);
    bodies.set(body, canonical);
  }
  assert.doesNotMatch(read('sitemap.xml'), /<loc>https:\/\/msime\.app\/docs\/<\/loc>/);
  assert.ok(!read('llms.txt').includes('(https://msime.app/docs.md)'));
  const windows = document('/docs/windows/').querySelector('.docs-article h2[id]').textContent;
  assert.equal(read('llms-full.txt').split(`## ${windows}\n`).length - 1, 1);
  const schemas = [...document('/').querySelectorAll('script[type="application/ld+json"]')].flatMap(el => JSON.parse(el.textContent)['@graph'] ?? []);
  const app = schemas.find(item => item['@type'] === 'SoftwareApplication');
  assert.equal(app.offers.price, 0);
  assert.equal(app.offers.url, `${SITE_ORIGIN}/price/`);
  assert.ok(document('/price/').querySelector('#root').textContent.includes('可免费使用'));
  assert.equal(app.aggregateRating, undefined);
  assert.equal(app.review, undefined);
});


test('internal navigation and breadcrumbs use canonical pages without duplicate levels', () => {
  for (const [path] of publicPages) {
    const doc = document(path);
    assert.equal(doc.querySelectorAll('a[href="/docs/"]').length, 0, path);
    const graph = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(el => JSON.parse(el.textContent)['@graph'] ?? []);
    const crumbs = graph.find(item => item['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
    assert.equal(new Set(crumbs.map(item => item.item)).size, crumbs.length, path);
    for (const crumb of crumbs) assert.equal(pageSeo(new URL(crumb.item).pathname).canonical, crumb.item);
  }
});

test('the header has one 社区 entry for the three community pages, which switch between each other under their heroes', () => {
  const sections = ['/skins/', '/dictionaries/', '/plugins/'];
  for (const [prefix, entry, area] of [['', '社区', '社区栏目'], ['/zh-TW', '社群', '社群欄目']]) {
    for (const base of [...sections, '/']) {
      const doc = document(`${prefix}${base}`);
      for (const menu of ['.nav-list', '#nav-menu']) {
        const links = [...doc.querySelectorAll(`${menu} a`)];
        assert.equal(links.filter(link => sections.some(section => link.getAttribute('href') === `${prefix}${section}`)).length, 1, `${prefix}${base} ${menu}: one community entry`);
        const community = links.find(link => link.getAttribute('href') === `${prefix}/skins/`);
        assert.equal(community.textContent.trim(), entry);
        assert.equal(community.getAttribute('aria-current'), base === '/' ? null : 'page', `${prefix}${base} ${menu}`);
      }
      const switcher = doc.querySelector(`nav[aria-label="${area}"]`);
      if (base === '/') { assert.equal(switcher, null); continue; }
      assert.deepEqual([...switcher.querySelectorAll('a')].map(link => link.getAttribute('href')), sections.map(section => `${prefix}${section}`));
      assert.deepEqual([...switcher.querySelectorAll('a[aria-current="page"]')].map(link => link.getAttribute('href')), [`${prefix}${base}`]);
      assert.ok(doc.querySelector('.page-hero').compareDocumentPosition(switcher) & 4, `${prefix}${base}: the switcher follows the hero`);
    }
  }
});

test('the header has one 反馈 entry for the two feedback forms, which switch between each other under their heroes', () => {
  const sections = ['/feedback/', '/words/'];
  for (const [prefix, entry, area, labels] of [['', '反馈', '反馈栏目', ['Bug 与需求', '词库缺失']], ['/zh-TW', '回報', '回報欄目', ['Bug 與需求', '詞庫缺失']]]) {
    for (const base of [...sections, '/']) {
      const doc = document(`${prefix}${base}`);
      for (const menu of ['.nav-list', '#nav-menu']) {
        const links = [...doc.querySelectorAll(`${menu} a`)];
        assert.equal(links.filter(link => sections.some(section => link.getAttribute('href') === `${prefix}${section}`)).length, 1, `${prefix}${base} ${menu}: one feedback entry`);
        const feedback = links.find(link => link.getAttribute('href') === `${prefix}/feedback/`);
        assert.equal(feedback.textContent.trim(), entry);
        assert.equal(feedback.getAttribute('aria-current'), base === '/' ? null : 'page', `${prefix}${base} ${menu}`);
      }
      const switcher = doc.querySelector(`nav[aria-label="${area}"]`);
      if (base === '/') { assert.equal(switcher, null); continue; }
      assert.deepEqual([...switcher.querySelectorAll('a')].map(link => [link.getAttribute('href'), link.textContent.trim()]), sections.map((section, index) => [`${prefix}${section}`, labels[index]]));
      assert.deepEqual([...switcher.querySelectorAll('a[aria-current="page"]')].map(link => link.getAttribute('href')), [`${prefix}${base}`]);
      assert.ok(doc.querySelector('.page-hero').compareDocumentPosition(switcher) & 4, `${prefix}${base}: the switcher follows the hero`);
    }
  }
});

test('the 接入 pages describe their open-source libraries as SoftwareSourceCode', () => {
  for (const [path, name, license, repository] of [
    ['/engine/', 'msime-engine', 'https://www.mozilla.org/MPL/2.0/', 'https://github.com/metasequoiaime/msime'],
    ['/zh-TW/engine/', 'msime-engine', 'https://www.mozilla.org/MPL/2.0/', 'https://github.com/metasequoiaime/msime'],
    ['/model/', 'chinese-ime-lm', 'https://www.apache.org/licenses/LICENSE-2.0', 'https://github.com/metasequoiaime/chinese-ime-lm'],
    ['/zh-TW/model/', 'chinese-ime-lm', 'https://www.apache.org/licenses/LICENSE-2.0', 'https://github.com/metasequoiaime/chinese-ime-lm'],
  ]) {
    const graph = [...document(path).querySelectorAll('script[type="application/ld+json"]')].flatMap(el => JSON.parse(el.textContent)['@graph'] ?? []);
    const code = graph.find(item => item['@type'] === 'SoftwareSourceCode');
    assert.ok(code, `${path}: SoftwareSourceCode`);
    assert.equal(code.name, name, path);
    assert.equal(code.license, license, path);
    assert.equal(code.codeRepository, repository, path);
  }
  for (const path of ['/', '/download/', '/code/']) {
    const graph = [...document(path).querySelectorAll('script[type="application/ld+json"]')].flatMap(el => JSON.parse(el.textContent)['@graph'] ?? []);
    assert.equal(graph.find(item => item['@type'] === 'SoftwareSourceCode'), undefined, `${path}: no library schema`);
  }
});

test('the header has one 接入 entry for 引擎库 and 神经联想, which switch between each other under their heroes', () => {
  const sections = ['/engine/', '/model/'];
  for (const [prefix, entry, area, labels] of [['', '接入', '接入栏目', ['引擎库', '神经联想']], ['/zh-TW', '接入', '接入欄目', ['引擎庫', '神經聯想']]]) {
    for (const base of [...sections, '/']) {
      const doc = document(`${prefix}${base}`);
      for (const menu of ['.nav-list', '#nav-menu']) {
        const links = [...doc.querySelectorAll(`${menu} a`)];
        assert.equal(links.filter(link => sections.some(section => link.getAttribute('href') === `${prefix}${section}`)).length, 1, `${prefix}${base} ${menu}: one 接入 entry`);
        const integration = links.find(link => link.getAttribute('href') === `${prefix}/engine/`);
        assert.equal(integration.textContent.trim(), entry);
        assert.equal(integration.getAttribute('aria-current'), base === '/' ? null : 'page', `${prefix}${base} ${menu}`);
      }
      const switcher = doc.querySelector(`nav[aria-label="${area}"]`);
      if (base === '/') { assert.equal(switcher, null); continue; }
      assert.deepEqual([...switcher.querySelectorAll('a')].map(link => [link.getAttribute('href'), link.textContent.trim()]), sections.map((section, index) => [`${prefix}${section}`, labels[index]]));
      assert.deepEqual([...switcher.querySelectorAll('a[aria-current="page"]')].map(link => link.getAttribute('href')), [`${prefix}${base}`]);
      assert.ok(doc.querySelector('.page-hero').compareDocumentPosition(switcher) & 4, `${prefix}${base}: the switcher follows the hero`);
    }
  }
});

test('the home page has an 引擎库 section linking the page, the crate and the prebuilt C libraries', () => {
  for (const prefix of ['', '/zh-TW']) {
    const section = document(`${prefix}/`).querySelector('#home-engine').closest('section');
    const hrefs = [...section.querySelectorAll('a')].map(link => link.getAttribute('href'));
    assert.ok(hrefs.includes(`${prefix}/engine/`), prefix);
    assert.ok(hrefs.includes('https://crates.io/crates/msime-engine'), prefix);
    assert.ok(hrefs.includes('https://github.com/metasequoiaime/msime/releases?q=msime-engine-capi&expanded=true'), prefix);
  }
});

test('the header includes 接入 and 水杉娘, and 开源代码 is a GitHub button there and the last item of the menu panel', () => {
  for (const [prefix, labels, code] of [['', ['首页', '下载', '接入', '社区', '水杉娘', '文档', '反馈', '关于'], '开源代码'], ['/zh-TW', ['首頁', '下載', '接入', '社群', '水杉娘', '文件', '回報', '關於'], '開源程式碼']]) {
    for (const base of ['/', '/code/', '/download/', '/gallery/']) {
      const doc = document(`${prefix}${base}`);
      assert.deepEqual([...doc.querySelectorAll('.nav-list a')].map(link => link.textContent.trim()), labels, `${prefix}${base}`);
      assert.deepEqual([...doc.querySelectorAll('#nav-menu a')].map(link => link.textContent.trim()), [...labels, code], `${prefix}${base}`);
      assert.equal(doc.querySelector('#nav-menu li:last-child a').getAttribute('href'), `${prefix}/code/`);
      const buttons = [...doc.querySelectorAll('header a')].filter(link => link.getAttribute('href') === `${prefix}/code/`);
      assert.equal(buttons.length, 1, `${prefix}${base}: one GitHub button in the header bar`);
      const [button] = buttons;
      assert.equal(button.getAttribute('aria-label'), code);
      assert.equal(button.getAttribute('title'), code);
      assert.ok(button.querySelector('svg'), `${prefix}${base}: the button shows the GitHub mark`);
      assert.equal(button.getAttribute('aria-current'), base === '/code/' ? 'page' : null, `${prefix}${base}`);
      assert.ok(doc.querySelector(`.site-footer a[href="${prefix}/code/"]`), `${prefix}${base}: the footer still links 开源代码`);
    }
  }
});

test('the gallery exposes R2 thumbnails, full previews and sticker downloads without JavaScript in both locales', () => {
  assert.match(galleryImageBaseUrl, /^https:\/\/media\.msime\.app\/gallery\/[a-f0-9]{16}\/illustrations$/);
  assert.ok(!existsSync('dist/gallery/illustrations'), 'gallery images are served by R2, outside the Pages bundle');
  assert.match(stickerBaseUrl, /^https:\/\/media\.msime\.app\/gallery\/stickers\/[a-f0-9]{16}$/);
  for (const prefix of ['', '/zh-TW']) {
    const doc = document(`${prefix}/gallery/`);
    const cards = [...doc.querySelectorAll('#collection figure')];
    assert.equal(cards.length, galleryItems.length);
    assert.equal(new Set(cards.map(card => card.querySelector('a').getAttribute('href'))).size, cards.length);
    for (const card of cards) {
      const image = card.querySelector('img');
      const preview = card.querySelector('a').getAttribute('href');
      assert.equal(image.getAttribute('loading'), 'lazy');
      assert.ok(image.getAttribute('alt').includes('水杉娘'));
      assert.ok(card.querySelector('figcaption').textContent.trim());
      assert.ok(preview.startsWith(`${galleryImageBaseUrl}/`));
      assert.ok(preview.endsWith('-1536w.webp'));
      assert.equal(image.getAttribute('src'), preview.replace(/-1536w\.webp$/, '-480w.webp'));
    }
    assert.equal(doc.querySelectorAll('.page-hero img').length, 4);
    const stickerLinks = [...doc.querySelectorAll('#stickers a[download]')];
    assert.equal(stickerLinks.length, stickerPacks.length);
    for (const [index, link] of stickerLinks.entries()) {
      assert.equal(link.getAttribute('href'), `${stickerBaseUrl}/${stickerPacks[index].file}`);
      assert.ok(link.getAttribute('href').endsWith('.zip'));
    }
    assert.ok(doc.querySelector('#stickers').textContent.includes('水杉娘 ©'));
    assert.doesNotMatch(doc.querySelector('#root').textContent, /幼年/);
    for (const menu of ['.nav-list', '#nav-menu']) {
      assert.equal(doc.querySelector(`${menu} a[href="${prefix}/gallery/"]`).getAttribute('aria-current'), 'page');
    }
    assert.ok(doc.querySelector(`.site-footer a[href="${prefix}/gallery/"]`));
  }
});

test('the retired installer screenshot is not rendered anywhere', () => {
  for (const path of ['/docs/windows/', '/zh-TW/docs/windows/', '/download/', '/features/']) {
    assert.equal(document(path).querySelector('img[src*="install-finish"], img[srcset*="install-finish"]'), null, path);
  }
  assert.ok(!existsSync('dist/screenshots/install-finish.webp'));
});


// This asserted the opposite until the guides were checked against Search Console: one hard-coded hero meant several indexable URLs, each with its own title, canonical and sitemap entry, all opening on the same H1 and the same summary. The stability the old name was after is structural -- same hero shape on every tab -- not identical words.
test('each guide has its own hero and retains its introduction in the article', () => {
  const heroes = new Set();
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux', 'android', 'ios']) {
    const doc = document(`/docs/${guide}/`);
    const lead = doc.querySelector('#page-lead').textContent.trim();
    assert.ok(lead.length > 10, guide);
    assert.ok(doc.querySelector('#page-title').textContent.trim().length > 2, guide);
    heroes.add(doc.querySelector('.page-hero').textContent);
    assert.ok(doc.querySelector('.docs-guide-intro > div').textContent.trim().length > 10, guide);
    assert.ok(!doc.querySelector('.docs-article').textContent.trim().startsWith(lead), guide);
    assert.ok(doc.querySelector('script[src^="/assets/router-state-"]'));
    assert.equal(doc.querySelector('link[href^="/assets/router-state-"]').getAttribute('as'), 'script');
  }
  assert.equal(heroes.size, 6, 'every guide page needs its own main heading and summary');
});

test('both languages retain the same page structure, controls and complete content', async () => {
  const { traditionalPages, traditionalPath } = await import('../shared/locales.ts');
  for (const base of Object.keys(traditionalPages)) {
    const path = traditionalPath(base);
    const tw = document(path);
    const cn = document(base);
    assert.equal(tw.documentElement.lang, 'zh-Hant-TW');
    assert.equal(tw.querySelector('meta[property="og:locale"]').content, 'zh_TW');
    assert.equal(tw.querySelector('link[rel=canonical]').href, `${SITE_ORIGIN}${base === '/docs/' ? '/zh-TW/docs/windows/' : path}`);
    for (const [route, locale] of [[base, 'zh-Hans'], [path, 'zh-Hant-TW']]) {
      for (const doc of [cn, tw]) assert.equal(doc.querySelector(`link[hreflang="${locale}"]`).href, `${SITE_ORIGIN}${route.replace(/\/docs\/$/, "/docs/windows/")}`);
    }
    for (const selector of ['.header-wrap', '.site-footer', 'main', 'main section', 'main button', 'main input', 'main video', 'main table', 'main details', 'main h2', 'main h3']) {
      assert.equal(tw.querySelectorAll(selector).length, cn.querySelectorAll(selector).length, `${path}: ${selector}`);
    }
    assert.ok(!tw.querySelector('.traditional-page'), path);
    assert.ok(tw.querySelector('main').textContent.length >= cn.querySelector('main').textContent.length * 0.85, `${path}: no shortened translation`);
    for (const anchor of tw.querySelectorAll('main a[href^="/"]')) {
      const href = anchor.getAttribute('href').split(/[?#]/)[0];
      if (href in traditionalPages) assert.fail(`${path}: language lost at ${href}`);
    }
  }
  assert.ok(document('/zh-TW/feedback/').querySelector('form'));
  const twDownload = document('/zh-TW/download/');
  const release = JSON.parse(read('platforms.json')).platforms.windows;
  assert.ok(twDownload.querySelector('main').textContent.includes(release.version));
  assert.ok(twDownload.querySelector(`a[href="${release.downloads[0].url}"]`));
});

test('Traditional documents track complete source and preserve executable examples', async () => {
  const { createHash } = await import('node:crypto');
  const sources = JSON.parse(readFileSync('vendor/MSIME-Docs/guides/zh-TW/sources.json', 'utf8'));
  for (const name of ['windows', 'macos', 'macos-voice', 'linux', 'android', 'ios', 'faq']) {
    const source = readFileSync(`vendor/MSIME-Docs/guides/${name}.md`, 'utf8');
    const translated = readFileSync(`vendor/MSIME-Docs/guides/zh-TW/${name}.md`, 'utf8');
    assert.equal(createHash('sha256').update(source).digest('hex'), sources.files[`${name}.md`].sourceSha256, name);
    assert.deepEqual(translated.match(/```[^\n]*\n[\s\S]*?```/g), source.match(/```[^\n]*\n[\s\S]*?```/g), name);
    if (name !== 'faq') {
      const doc = document(`/zh-TW/docs/${name}/`);
      assert.ok(doc.querySelector('.docs-article').textContent.length > 300);
    }
  }
  const doc = document('/zh-TW/faq/');
  const schema = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)).find(item => item['@type'] === 'FAQPage');
  assert.equal(schema.mainEntity.length, 32);
  for (const answer of doc.querySelectorAll('.faq-answer')) assert.ok(answer.textContent.length > 50);
});


test('FAQ platform controls and original screenshots are available in both languages', () => {
  for (const path of ['/faq/', '/zh-TW/faq/']) {
    const doc = document(path);
    assert.deepEqual([...doc.querySelectorAll('input[name="faq-platform"]')].map(input => input.value), ['Windows', 'macOS', 'Linux', 'iOS', 'Android']);
    const images = [...doc.querySelectorAll('.faq-answer img')];
    assert.equal(images.length, 8);
    for (const img of images) {
      assert.match(img.getAttribute('src'), /^\/assets\/.*\.png$/);
      assert.ok(existsSync(`dist${img.getAttribute('src')}`));
      assert.ok(Number(img.getAttribute('width')) > 0 && Number(img.getAttribute('height')) > 0);
      assert.equal(img.parentElement.getAttribute('href'), img.getAttribute('src'));
      assert.equal(img.parentElement.getAttribute('target'), '_blank');
    }
    assert.ok(doc.querySelector('main').textContent.includes('WhiteCloud-OuO'));
  }
});

test('iOS installs directly from the unified download page', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    const doc = document(path);
    assert.ok(doc.querySelector('main a[href="https://testflight.apple.com/join/bUzPvyqt"]'));
    assert.ok(doc.querySelector('main').textContent.includes('TestFlight'));
    assert.ok(doc.querySelector('main').textContent.includes('90'));
  }
  for (const [path] of publicPages) assert.equal(document(path).querySelector('a[href*="/beta/"]'), null, path);
  assert.doesNotMatch(read('sitemap.xml'), /\/beta\//);
  assert.doesNotMatch(read('llms.txt'), /\/beta\.md/);
});

test('all old beta links redirect to the localized download option', async () => {
  const { onRequest: beta } = await import('../functions/beta.ts');
  const { onRequest: traditionalBeta } = await import('../functions/zh-TW/beta.ts');
  const routes = JSON.parse(read('_routes.json')).include;
  for (const prefix of ['', '/zh-TW']) {
    for (const slash of ['', '/']) {
      const path = `${prefix}/beta${slash}`;
      assert.ok(routes.includes(path));
      for (const platform of ['macos', 'ios', '', 'unknown']) {
        const request = new Request(`${SITE_ORIGIN}${path}?utm_source=shared${platform ? `&platform=${platform}` : ''}`);
        const response = await (prefix ? traditionalBeta : beta)({ request });
        assert.equal(response.status, 301);
        const destination = new URL(response.headers.get('Location'));
        assert.equal(destination.pathname, `${prefix}/download/`);
        assert.equal(destination.searchParams.get('platform'), platform === 'macos' ? 'macos' : 'ios');
        assert.equal(destination.searchParams.get('utm_source'), 'shared');
      }
    }
  }
});

test('old release-list links land on the download page release list without touching the installer picker', async () => {
  const { onRequest: releases } = await import('../functions/releases.ts');
  const { onRequest: traditionalReleases } = await import('../functions/zh-TW/releases.ts');
  const routes = JSON.parse(read('_routes.json')).include;
  assert.doesNotMatch(read('_redirects'), /^\/(zh-TW\/)?releases\/? /m, 'the Functions own these paths; a _redirects rule would bypass the param mapping');
  for (const prefix of ['', '/zh-TW']) {
    for (const slash of ['', '/']) {
      const path = `${prefix}/releases${slash}`;
      assert.ok(routes.includes(path), path);
      for (const platform of ['macos', 'linux', '', 'all', 'unknown']) {
        const request = new Request(`${SITE_ORIGIN}${path}?utm_source=shared${platform ? `&platform=${platform}` : ''}`);
        const response = await (prefix ? traditionalReleases : releases)({ request });
        assert.equal(response.status, 301);
        const destination = new URL(response.headers.get('Location'));
        assert.equal(destination.pathname, `${prefix}/download/`);
        assert.equal(destination.hash, '#releases');
        assert.equal(destination.searchParams.get('platform'), null, 'the old filter never selects an installer');
        assert.equal(destination.searchParams.get('release'), ['macos', 'linux'].includes(platform) ? platform : null);
        assert.equal(destination.searchParams.get('utm_source'), 'shared');
      }
    }
  }
});


test('download actions and installation instructions share one surface without a sidebar', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    const doc = document(path);
    const surface = doc.querySelector('.content-flow');
    assert.ok(surface?.querySelector('.download-panel'));
    assert.ok(surface?.querySelector('#download-content'));
    assert.equal(doc.querySelector('main aside'), null);
    assert.equal(surface.querySelector('.doc-card'), null);
  }
});

test('the initial release filter follows the selected download platform in both locales', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    const doc = document(path);
    assert.match(doc.querySelector('.download-panel button[aria-pressed="true"]').textContent, /Windows/);
    assert.equal(doc.querySelector('#releases button[aria-pressed="true"]').textContent, 'Windows');
  }
});

test('简繁下载页展示九个入口，Windows 版本分开且旧链接默认纯净版', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    const tiles = [...document(path).querySelectorAll('.download-panel button[aria-pressed]')];
    assert.equal(tiles.length, 9);
    assert.match(tiles[0].textContent, /Windows 10\/11（[纯純][净淨]版）/);
    assert.match(tiles[1].textContent, /Windows 10\/11（[联聯][网網]版）/);
    assert.match(tiles[2].textContent, /Windows 7/);
    assert.equal(tiles[0].getAttribute('aria-pressed'), 'true');
    assert.ok(tiles.slice(1).every(tile => tile.getAttribute('aria-pressed') === 'false'));
    assert.deepEqual(tiles.slice(3).map(tile => /macOS|Linux|Android|iOS|HarmonyOS|Web/.exec(tile.textContent)?.[0]), ['macOS', 'Linux', 'Android', 'iOS', 'HarmonyOS', 'Web']);
  }
});

test('下载页不重复展示首页的下载与安装统计', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    assert.equal(document(path).querySelector('.download-stats'), null);
  }
});

test('首页两种语言把统计数字放进对应的平台卡片', () => {
  for (const path of ['/', '/zh-TW/']) {
    const doc = document(path);
    const shell = doc.querySelector('.home-platforms-shell');
    const summary = shell?.querySelector('[data-download-summary]');
    assert.ok(shell);
    assert.ok(summary);
    assert.match(shell.className, /(?:^| )bg-panel(?: |$)/);
    assert.doesNotMatch(shell.className, /(?:^| )bg-panel-2(?: |$)/);
    assert.equal([...shell.querySelectorAll('ul > li')].filter(item => /(?:^| )bg-panel-2(?: |$)/.test(item.className)).length, 9);
    assert.equal(doc.querySelectorAll('.download-stats').length, 0);
    assert.equal(shell.querySelectorAll('[data-platform]').length, 9);
    assert.match(shell.querySelector('ul').className, /(?:^| )lg:grid-cols-5(?: |$)/);
    assert.match(shell.querySelector('[data-platform="web"]').className, /(?:^| )lg:col-span-2(?: |$)/);
    for (const id of ['windows', 'macos', 'linux', 'android', 'ios', 'harmony']) {
      assert.ok(shell.querySelector(`[data-platform="${id}"] strong`), `${id} has a displayed count`);
    }
    assert.ok(shell.querySelector('[data-platform="windowsRust"] strong'));
    // 期望值取自这次构建的清单：发版和统计刷新会改变它，写死的数字会让下载清单的自动 PR 一直挂着。
    const manifest = JSON.parse(read('platforms.json'));
    // Windows 7 只在清单里有正式发布时才显示数字。比较布尔值：断言失败时 node 会把整个 DOM 节点展开打印，曾把 CI 执行机的内存撑满。
    assert.equal(Boolean(shell.querySelector('[data-platform="windows7"] strong')), Boolean(manifest.platforms.windows.windows7));
    assert.equal(shell.querySelector('[data-platform="web"] strong')?.textContent, manifest.npmDownloadStats.downloads.toLocaleString('en-US'));
    assert.ok(shell.querySelector('[data-platform="web"] a'));
    assert.doesNotMatch(shell.querySelector('[data-platform="web"]').textContent, /把输入法嵌进你的网页/);
    assert.ok(summary.querySelector('strong'));
    assert.match(shell.textContent, /六个平台|六個平台|六個平臺/);
  }
});

test('the current macOS DMG guide describes the in-app install flow', () => {
  const macos = document('/download/').querySelector('#download-macos');
  assert.ok(macos);
  assert.match(macos.textContent, /立即安装/);
  assert.match(macos.textContent, /进入设置/);
  assert.match(macos.textContent, /~/);
  assert.doesNotMatch(macos.textContent, /打开「应用程序」里的 MSIME。它会把输入法装进/);
});

test('简繁下载页的 HarmonyOS 只走华为应用市场，不提供 HAP 下载', () => {
  for (const path of ['/download/', '/zh-TW/download/']) {
    const doc = document(path);
    const harmony = doc.querySelector('#download-harmony');
    assert.ok(harmony);
    assert.match(harmony.textContent, /[华華][为為][应應]用市[场場]/);
    assert.match(harmony.textContent, /hdc install/);
    assert.doesNotMatch(harmony.textContent, /GitHub 下[载載]|安[装裝] HAP 後|安装 HAP 后|HAP 測試|HAP 测试/);
    assert.equal(doc.querySelectorAll('a[href$=".hap"]').length, 0);
    // 预渲染状态里不带自动化的逐个产物下载账本，nightly HAP 的文件名不会出现在页面里。
    const state = read(doc.querySelector('script[data-router-state]').getAttribute('src').slice(1));
    assert.doesNotMatch(state, /downloadHistory|unsigned-nightly[^"]*\.hap/);
  }
});

test('iOS 安装量放入首页 iOS 平台卡片', async t => {
  const dom = parseHTML('<html><head></head><body></body></html>');
  const keys = ['document', 'Node', 'HTMLElement', 'HTMLParagraphElement', 'HTMLAnchorElement'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  t.after(() => keys.forEach((key, index) => {
    if (previous[index]) Object.defineProperty(globalThis, key, previous[index]);
    else delete globalThis[key];
  }));
  for (const key of keys) globalThis[key] = dom[key];
  const { render } = await import('../dist-ssr/entry-static.js');
  const platforms = JSON.parse(readFileSync('public/platforms.json', 'utf8'));
  platforms.pgyerDownloadStats = { generatedAt: '2026-10-22T00:00:00.000Z', total: 9, builds: [{ id: 'a'.repeat(64), downloads: 9 }] };
  platforms.mirrorDownloadStats = { total: 20, platforms: { windows: 7, windowsRust: 3, macos: 10 }, generatedAt: '2026-10-22T00:00:00Z' };
  const community = JSON.parse(readFileSync('public/community.json', 'utf8'));
  const testflight = { schemaVersion: 1, generatedAt: '2026-10-21T10:00:00.000Z', installs: 123, buildCount: 2, periodStart: '2026-10-01', periodEnd: '2026-10-21' };
  for (const path of ['/', '/zh-TW/']) {
    for (const installs of [0, 123]) {
      const { html } = await render(path, { community, 'download-stats': platforms, 'testflight-stats': { ...testflight, installs } });
      const doc = parseHTML(html).document;
      const ios = doc.querySelector('[data-platform="ios"]');
      assert.equal(ios.querySelector('strong').textContent, String(installs));
      assert.match(ios.textContent, /TestFlight/);
      assert.equal(doc.querySelector('[data-download-summary] strong').textContent, (platforms.downloadStats.total + 20 + 9 + installs).toLocaleString('en-US'));
    }
    const { html } = await render(path, { community, 'download-stats': platforms, 'testflight-stats': null });
    const ios = parseHTML(html).document.querySelector('[data-platform="ios"]');
    assert.doesNotMatch(ios.textContent, /\d/);
  }
});

test('首页平台卡片按平台显示镜像合并后的累计值', async t => {
  const dom = parseHTML('<html><head></head><body></body></html>');
  const keys = ['document', 'Node', 'HTMLElement', 'HTMLParagraphElement', 'HTMLAnchorElement'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  t.after(() => keys.forEach((key, index) => {
    if (previous[index]) Object.defineProperty(globalThis, key, previous[index]);
    else delete globalThis[key];
  }));
  for (const key of keys) globalThis[key] = dom[key];
  const { render } = await import('../dist-ssr/entry-static.js');
  const manifest = JSON.parse(readFileSync('public/platforms.json', 'utf8'));
  const community = JSON.parse(readFileSync('public/community.json', 'utf8'));
  const github = { total: 210, platforms: { windows: 10, windowsRust: 20, macos: 30, linux: 40, android: 50, harmony: 60 } };
  const mirror = { total: 28, platforms: { windows: 1, windowsRust: 2, macos: 3, linux: 4, android: 5, harmony: 6, future: 7 }, generatedAt: '2026-10-22T00:00:00Z' };
  for (const path of ['/', '/zh-TW/']) {
    for (const scenario of [
      { saved: mirror, expected: [238, 11, 22, 33, 44, 55, 66] },
      { saved: { ...mirror, total: 0, platforms: {}, generatedAt: '2026-10-21T00:00:00Z' }, expected: [210, 10, 20, 30, 40, 50, 60] },
      { saved: undefined, expected: [] },
    ]) {
      const data = { community, 'download-stats': { generatedAt: manifest.generatedAt, downloadStats: github, mirrorDownloadStats: scenario.saved, pgyerDownloadStats: undefined }, 'testflight-stats': null };
      const { html } = await render(path, data);
      const doc = parseHTML(html).document;
      const summary = doc.querySelector('[data-download-summary]');
      if (!scenario.saved) {
        assert.equal(summary, null);
        continue;
      }
      assert.equal(Number(summary.querySelector('strong').textContent.replaceAll(',', '')), scenario.expected[0]);
      const values = Object.fromEntries(['windows', 'macos', 'linux', 'android', 'harmony'].map(platform => [platform, Number(doc.querySelector(`[data-platform="${platform}"] strong`).textContent.replaceAll(',', ''))]));
      assert.deepEqual([values.windows, Number(doc.querySelector('[data-platform="windowsRust"] strong')?.textContent?.replaceAll(',', '') ?? 0), values.macos, values.linux, values.android, values.harmony], scenario.expected.slice(1));
    }
  }
});

test('the terms, the privacy policy and the login dialog ask for explicit consent instead of implying it', () => {
  // The phrases AppGallery rejected under guideline 7.5, and the old terms' clauses that treated logging in or continued use as acceptance.
  const implied = ['登录即表示', '登录即代表', '登入即表示', '登入即代表', '登錄即表示', '登錄即代表', '开始使用本服务，即表示', '開始使用本服務，即表示', '的，视为接受', '的，視為接受'];
  for (const path of ['/terms/', '/privacy/', '/zh-TW/terms/', '/zh-TW/privacy/']) {
    const text = document(path).querySelector('#root').textContent;
    for (const phrase of implied) assert.ok(!text.includes(phrase), `${path}: implied consent "${phrase}"`);
  }
  assert.ok(document('/terms/').querySelector('#root').textContent.includes('主动勾选「我已阅读并同意《用户协议》和《隐私政策》」'));
  assert.equal(document('/privacy/').querySelector('h1').textContent, '隐私政策');
  assert.equal(document('/zh-TW/privacy/').querySelector('h1').textContent, '隱私政策');
  const bundle = readdirSync('dist/assets').filter(name => name.endsWith('.js')).map(name => read(`assets/${name}`)).join('\n');
  for (const phrase of implied) assert.ok(!bundle.includes(phrase), `bundle: implied consent "${phrase}"`);
  assert.ok(bundle.includes('我已阅读并同意《用户协议》和《隐私政策》'), 'bundle: login consent checkbox');
  assert.ok(bundle.includes('请先阅读并勾选同意《用户协议》和《隐私政策》'), 'bundle: login consent prompt');
});
