import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { seoPages, pageSeo, markdownPath, SITE_ORIGIN } from '../shared/site-seo.ts';
import { onRequest } from '../functions/docs.ts';

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

test('all four guides and FAQ answers are present without JavaScript', () => {
  const landing = document('/docs/');
  assert.ok(read('docs.md').includes('文档版本：MSIME-Docs'));
  assert.equal(landing.querySelector('link[rel=canonical]').href, `${SITE_ORIGIN}/docs/windows/`);
  assert.ok(landing.querySelector('.docs-article')?.textContent.length > 400, 'the docs entry opens a readable guide');
  assert.equal(landing.querySelector('.docs-platform[aria-current="page"]')?.textContent, 'Windows');
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux']) {
    const doc = document(`/docs/${guide}/`);
    assert.ok(doc.querySelector('.docs-article').textContent.length > 400, guide);
    assert.ok(doc.querySelectorAll('a[href^="/docs/"]').length >= 4, guide);
    assert.ok(read(`docs/${guide}.md`).includes('MSIME-Docs'));
  }
  const faq = document('/faq/');
  const schema = [...faq.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)).find(data => data['@type'] === 'FAQPage');
  assert.equal(schema.mainEntity.length, 18);
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
  for (const [path] of publicPages) assert.ok(read('_headers').includes(`${markdownPath(path)}\n  Content-Type: text/markdown; charset=utf-8\n  Link: <${pageSeo(path).canonical}>; rel="canonical"\n  X-Robots-Tag: noindex`));
  assert.ok(Math.max(...read('_headers').split('\n').map(line => line.length)) < 2000, 'Pages header line limit');
});

test('legacy guide redirects preserve queries without accepting unknown or external targets', async () => {
  let calls = 0;
  const next = async () => { calls++; return new Response('static'); };
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux']) {
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

test('the retired installer screenshot is not rendered anywhere', () => {
  for (const path of ['/docs/windows/', '/zh-TW/docs/windows/', '/download/', '/features/']) {
    assert.equal(document(path).querySelector('img[src*="install-finish"], img[srcset*="install-finish"]'), null, path);
  }
  assert.ok(!existsSync('dist/screenshots/install-finish.webp'));
});


// This asserted the opposite until the four guides were checked against Search Console: one hard-coded hero meant four indexable URLs, each with its own title, canonical and sitemap entry, all opening on the same H1 and the same summary. The stability the old name was after is structural -- same hero shape on every tab -- not identical words.
test('each guide has its own hero and retains its introduction in the article', () => {
  const heroes = new Set();
  for (const guide of ['windows', 'macos', 'macos-voice', 'linux']) {
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
  assert.equal(heroes.size, 4, 'every guide page needs its own main heading and summary');
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
  for (const name of ['windows', 'macos', 'macos-voice', 'linux', 'faq']) {
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
  assert.equal(schema.mainEntity.length, 18);
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
