import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { docsSearchSchema } from '../src/docs-search.ts';
import { downloadSearchSchema } from '../src/download-search.ts';
import { communitySchema } from '../src/community-data.ts';
import { fetchPlatforms } from '../src/platforms-data.ts';
import { seoPages, pageSeo } from '../shared/site-seo.ts';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const SITE = 'https://msime.app';

/** 仓库里每个带 index.html 的目录就是一个页面；根目录的 index.html 是首页。 */
const pageDirectories = () =>
  readdirSync(new URL('.', root), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .filter(entry => !['node_modules', 'dist', 'public', 'scripts', 'src', 'vendor'].includes(entry.name))
    .filter(entry => existsSync(new URL(`${entry.name}/index.html`, root)))
    .map(entry => `/${entry.name}/`);

// 简历页是个人页面，「我的」只对登录用户有内容，入口里都带 noindex，不进站点地图。
const NOINDEX = ['/resume/', '/me/'];

test('the SEO registry includes every entry page', () => {
  for (const path of ['/', ...pageDirectories()]) assert.ok(seoPages[path], path);
  assert.equal(Object.keys(seoPages).filter(path => path.startsWith('/docs/') && path !== '/docs/').length, 4);
});

test('pages excluded from the sitemap actually say so in their own markup', () => {
  for (const path of NOINDEX) {
    const html = read(`${path.slice(1)}index.html`);
    assert.match(html, /<meta name="robots"[^>]*noindex/, `${path} 必须自己声明 noindex`);
  }
});

test('robots exposes the sitemap and permits reading noindex directives', () => {
  const robots = read('public/robots.txt');
  assert.match(robots, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
  for (const path of NOINDEX) assert.doesNotMatch(robots, new RegExp(`^Disallow: ${path}$`, 'm'));
  assert.match(robots, /^Disallow: \/api\/$/m);
});

test('every entry carries its registered canonical and matching sharing metadata', () => {
  for (const path of ['/', ...pageDirectories()]) {
    const html = read(path === '/' ? 'index.html' : `${path.slice(1)}index.html`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical, pageSeo(path).canonical, `${path} canonical`);
    assert.match(html, /<meta property="og:image" content="[^"]+og-cover\.png"/, `${path} 缺 og:image`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/, `${path} 缺 twitter card`);

    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.equal(ogTitle, title, `${path} og:title 应与 <title> 一致`);
  }
});

test('the 404 entry exists, is not indexable, and has no canonical of its own', () => {
  const html = read('404.html');
  assert.match(html, /<meta name="robots"[^>]*noindex/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(read('vite.config.ts'), /404\.html/, '404.html 必须是构建入口，否则不会进产物');
});

test('the web manifest is valid and points at icons that exist', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'));
  assert.ok(manifest.name && manifest.start_url && manifest.icons?.length);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(new URL(`public${icon.src}`, root)), `缺图标 ${icon.src}`);
  }
});

test('the response headers lock the page down and keep hashed assets cacheable', () => {
  const headers = read('public/_headers');
  const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1] ?? '';
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'"]) {
    assert.ok(csp.includes(directive), `CSP 缺 ${directive}`);
  }
  // 只放行头像、Turnstile 的脚本与验证框、词条提交所用的公共 API、Google 登录（GIS）和账号头像，以及下载页 Web 平台嵌入的在线演示（frame-src）。
  const externals = [...csp.matchAll(/https:\/\/[^\s;]+/g)].map(m => m[0]);
  assert.deepEqual(externals, ['https://challenges.cloudflare.com', 'https://accounts.google.com/gsi/client', 'https://accounts.google.com/gsi/style', 'https://avatars.githubusercontent.com', 'https://*.googleusercontent.com', 'https://media.msime.app', 'https://api.msime.app', 'https://accounts.google.com/gsi/', 'https://challenges.cloudflare.com', 'https://accounts.google.com/gsi/', 'https://wasm.msime.app']);
  assert.match(headers, /\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
});


test('lightweight guide query validation accepts only known scalar values', () => {
  for (const platform of ['windows', 'macos', 'macos-voice', 'linux']) assert.deepEqual(docsSearchSchema({ platform }), { platform });
  for (const platform of ['__proto__', 'constructor', 'unknown', ['windows'], {}, null, 1]) assert.deepEqual(docsSearchSchema({ platform }), {});
  assert.deepEqual(docsSearchSchema({ unrelated: 'ignored' }), {});
});

test('download query validation preserves the selected platform and release filter', () => {
  assert.deepEqual(downloadSearchSchema({ platform: 'linux', release: 'linux', unrelated: 'ignored' }), { platform: 'linux', release: 'linux' });
  assert.deepEqual(downloadSearchSchema({ platform: 'ios' }), { platform: 'ios' });
  for (const search of [
    { platform: '__proto__' },
    { platform: ['linux'] },
    { platform: {} },
    { release: 'unknown' },
    { release: ['linux'] },
    { release: null },
  ]) assert.deepEqual(downloadSearchSchema(search), {});
});

test('deferred community validation still rejects unsafe URLs and invalid metrics', () => {
  const data = JSON.parse(read('public/community.json'));
  assert.ok(communitySchema.safeParse(data).success);
  for (const url of ['javascript:alert(1)', 'https://github.com.evil.example/user', 'https://evil.example/']) {
    const invalid = structuredClone(data); invalid.contributors[0].url = url;
    assert.equal(communitySchema.safeParse(invalid).success, false);
  }
  const invalid = structuredClone(data); invalid.contributors[0].avatarUrl = 'https://evil.example/avatar.png';
  assert.equal(communitySchema.safeParse(invalid).success, false);
  assert.equal(communitySchema.safeParse({ ...data, totalStars: -1 }).success, false);
});


test('desktop release data stays valid without an iOS artifact', async (t) => {
  const manifest = JSON.parse(read('public/platforms.json'));
  assert.equal(manifest.platforms.ios, undefined);
  t.mock.method(globalThis, 'fetch', async () => Response.json(manifest));
  const result = await fetchPlatforms();
  assert.deepEqual(Object.keys(result.platforms).sort(), ['linux', 'macos', 'windows']);
});

test('a broken preview drops only the preview, never the stable release beside it', async (t) => {
  const manifest = JSON.parse(read('public/platforms.json'));
  const stable = manifest.platforms.macos;
  const preview = { version: '0.50.0-build.11', releaseUrl: 'https://github.com/metasequoiaime/msime/releases/tag/v0.50.0-build.11', publishedAt: '2026-09-18T07:46:28Z', signed: true, downloads: stable.downloads };
  const serve = platforms => t.mock.method(globalThis, 'fetch', async () => Response.json({ ...manifest, platforms: { ...manifest.platforms, macos: { ...stable, ...platforms } } }));
  serve({ preview });
  assert.equal((await fetchPlatforms()).platforms.macos.preview.version, '0.50.0-build.11');
  serve({ preview: { ...preview, releaseUrl: 'https://evil.example/releases' } });
  const result = await fetchPlatforms();
  assert.equal(result.platforms.macos.preview, null);
  assert.equal(result.platforms.macos.version, stable.version);
  // 旧清单没有 preview 字段，照样能读
  const { preview: _omitted, ...legacy } = stable;
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...manifest, platforms: { ...manifest.platforms, macos: legacy } }));
  assert.equal((await fetchPlatforms()).platforms.macos.preview, null);
});
