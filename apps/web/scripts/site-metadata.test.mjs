import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { docsSearchSchema } from '../src/docs-search.ts';
import { downloadSearchSchema } from '../src/download-search.ts';
import { communitySchema } from '../src/community-data.ts';
import { fetchPlatforms } from '../src/platforms-data.ts';
import { seoPages, pageSeo } from '../shared/site-seo.ts';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const SITE = 'https://msime.app';

/** 路由表里每条静态路径都是一个页面。构建只为 SEO 注册表里的地址生成 HTML，漏注册的页面直接访问会落到 404。 */
const routedPages = () =>
  [...read('src/routes.tsx').matchAll(/path: "(\/[^"$]*)"/g)]
    .map(match => match[1].endsWith('/') ? match[1] : `${match[1]}/`)
    .filter(path => !REDIRECTS.includes(path));

// 旧的 /beta/ 只在路由里重定向到下载页，没有自己的页面。
const REDIRECTS = ['/beta/', '/zh-TW/beta/'];

// 简历页是个人页面，「我的」只对登录用户有内容，入口里都带 noindex，不进站点地图。
const NOINDEX = ['/resume/', '/me/'];

test('the SEO registry includes every routed page', () => {
  const routes = routedPages();
  assert.ok(routes.includes('/') && routes.includes('/zh-TW/docs/'));
  for (const path of routes) assert.ok(seoPages[path], path);
  assert.equal(Object.keys(seoPages).filter(path => path.startsWith('/docs/') && path !== '/docs/').length, 7);
});

test('pages excluded from the sitemap are registered as noindex', () => {
  for (const path of NOINDEX) assert.equal(seoPages[path].noindex, true, `${path} 必须登记 noindex，构建据此写入 robots`);
});

test('robots exposes the sitemap and permits reading noindex directives', () => {
  const robots = read('public/robots.txt');
  assert.match(robots, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
  for (const path of NOINDEX) assert.doesNotMatch(robots, new RegExp(`^Disallow: ${path}$`, 'm'));
  assert.match(robots, /^Disallow: \/api\/$/m);
});

test('the single entry carries the home metadata and the sharing tags every page inherits', () => {
  const html = read('index.html');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, pageSeo('/').canonical);
  assert.match(html, /<meta property="og:image" content="[^"]+og-cover\.png"/, '缺 og:image');
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/, '缺 twitter card');

  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.equal(ogTitle, title, 'og:title 应与 <title> 一致');
});

test('the 404 page is generated as not indexable and without a canonical of its own', () => {
  assert.equal(pageSeo('/404/').noindex, true);
  assert.equal(pageSeo('/404/').canonical, undefined);
  assert.match(read('scripts/build-seo.mjs'), /'\/404\/'/, '构建必须生成 dist/404.html，Cloudflare Pages 用它应答未匹配的地址');
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
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "script-src 'self' 'wasm-unsafe-eval'"]) {
    assert.ok(csp.includes(directive), `CSP 缺 ${directive}`);
  }
  // 候选窗皮肤的「下载皮肤包」是提交到 /api/skins/candidate/:id/download 的原生表单（src/skins/candidate-download-button.tsx），form-action 'none' 会让浏览器静默拦下提交，按钮点了没反应。只放行同源。
  assert.match(csp, /form-action 'self'(;|$)/);
  // 只放行头像、Turnstile 的脚本与验证框、词条提交所用的公共 API、Google 登录（GIS）和账号头像、下载页 Web 平台嵌入的在线演示（frame-src），以及 Cloudflare Web Analytics 和自托管 Umami 的统计脚本与上报地址。
  const externals = [...csp.matchAll(/https:\/\/[^\s;]+/g)].map(m => m[0]);
  assert.deepEqual(externals, ['https://challenges.cloudflare.com', 'https://accounts.google.com/gsi/client', 'https://static.cloudflareinsights.com', 'https://umami.yldm.tech', 'https://accounts.google.com/gsi/style', 'https://avatars.githubusercontent.com', 'https://*.googleusercontent.com', 'https://media.msime.app', 'https://api.msime.app', 'https://accounts.google.com/gsi/', 'https://cloudflareinsights.com', 'https://umami.yldm.tech', 'https://challenges.cloudflare.com', 'https://accounts.google.com/gsi/', 'https://wasm.msime.app']);
  assert.match(headers, /\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/msime\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  // 网页输入法要编译 wasm，但 script-src 仍然不能放行 eval 和内联脚本。
  const scriptSrc = csp.match(/script-src [^;]+/)?.[0] ?? '';
  assert.doesNotMatch(scriptSrc, /'unsafe-eval'|'unsafe-inline'/);
});


test('lightweight guide query validation accepts only known scalar values', () => {
  for (const platform of ['windows', 'macos', 'macos-voice', 'linux', 'android', 'ios']) assert.deepEqual(docsSearchSchema({ platform }), { platform });
  for (const platform of ['__proto__', 'constructor', 'unknown', ['windows'], {}, null, 1]) assert.deepEqual(docsSearchSchema({ platform }), {});
  assert.deepEqual(docsSearchSchema({ unrelated: 'ignored' }), {});
});

test('download query validation preserves the selected platform and release filter', () => {
  assert.deepEqual(downloadSearchSchema({ platform: 'linux', release: 'linux', unrelated: 'ignored' }), { platform: 'linux', release: 'linux' });
  assert.deepEqual(downloadSearchSchema({ platform: 'ios' }), { platform: 'ios' });
  for (const windows of ['pure', 'online', 'win7']) assert.deepEqual(downloadSearchSchema({ platform: 'windows', windows }), { platform: 'windows', windows });
  for (const windows of ['unknown', ['online'], {}, null]) assert.deepEqual(downloadSearchSchema({ platform: 'windows', windows }), { platform: 'windows' });
  assert.deepEqual(downloadSearchSchema({ platform: 'linux', windows: 'online' }), { platform: 'linux' });
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


test('release data stays valid without an iOS artifact', async (t) => {
  const manifest = JSON.parse(read('public/platforms.json'));
  assert.equal(manifest.platforms.ios, undefined);
  t.mock.method(globalThis, 'fetch', async () => Response.json(manifest));
  const result = await fetchPlatforms();
  assert.deepEqual(Object.keys(result.platforms).sort(), ['android', 'harmony', 'linux', 'macos', 'windows']);
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
