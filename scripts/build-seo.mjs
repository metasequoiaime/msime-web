import { traditionalPages, traditionalPath, baseLocalePath, isTraditional, languageAlternates } from "../shared/locales.ts";
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { seoPages, pageSeo, structuredData, serializeJsonLd, SITE_ORIGIN, markdownPath } from '../shared/site-seo.ts';

const dom = parseHTML('<html><head></head><body></body></html>');
for (const key of ['document', 'Node', 'HTMLElement', 'HTMLParagraphElement', 'HTMLAnchorElement']) globalThis[key] = dom[key];
const { render } = await import('../dist-ssr/entry-static.js');
const dist = resolve('dist');
const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));
const write = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const markdown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
markdown.keep(['table']);
const contents = [];
const docsCommit = execFileSync('git', ['-C', 'vendor/MSIME-Docs', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const pages = [...Object.keys(seoPages), '/404/'];
const translatedTemplates = Object.fromEntries(Object.keys(traditionalPages).map(path => [traditionalPath(path), readFileSync(`${dist}/${path === '/' ? 'index.html' : path.startsWith('/docs/') ? 'docs/index.html' : `${path.slice(1)}index.html`}`, 'utf8')]));
const docsTemplate = readFileSync(`${dist}/docs/index.html`, 'utf8');
for (const path of pages) {
  const metadata = pageSeo(path);
  const basePath = baseLocalePath(path);
  const guide = /^\/docs\/([^/]+)\/$/.exec(path)?.[1];
  const file = path === '/404/' ? '404.html' : path === '/' ? 'index.html' : `${path.slice(1)}index.html`;
  const template = guide ? 'docs/index.html' : file;
  const html = parseHTML(translatedTemplates[path] ?? (guide ? docsTemplate : readFileSync(`${dist}/${template}`, 'utf8')));
  const document = html.document;
  // The features page reads the dictionary release from platforms.json, so it is seeded too and its dictionary block is in the static HTML.
  const data = basePath === '/download/' ? { platforms: JSON.parse(readFileSync('public/platforms.json')), 'update-manifest': JSON.parse(readFileSync('public/update.json')) } : basePath === '/features/' ? { platforms: JSON.parse(readFileSync('public/platforms.json')) } : basePath === '/' ? { community: JSON.parse(readFileSync('public/community.json')) } : {};
  const { html: body, bootstrap } = await render(path === '/404/' ? '/__not-found__/' : path, data);
  if (!body.includes('<h1') || body.includes('data-msg=') || body.includes('data-stck=')) throw new Error(`Static render failed for ${path}: ${body.slice(body.indexOf('data-msg='), body.indexOf('data-msg=') + 500)}`);
  document.getElementById('root').innerHTML = body;
  const bootstrapCode = bootstrap.join('\n');
  const bootstrapFile = `/assets/router-state-${createHash('sha256').update(bootstrapCode).digest('hex').slice(0, 16)}.js`;
  write(`${dist}${bootstrapFile}`, bootstrapCode);
  const stateScript = document.createElement('script'); stateScript.src = bootstrapFile; stateScript.setAttribute('defer', ''); stateScript.setAttribute('data-router-state', ''); document.body.append(stateScript);
  const statePreload = document.createElement('link'); statePreload.rel = 'preload'; statePreload.setAttribute('as', 'script'); statePreload.href = bootstrapFile; document.head.append(statePreload);
  document.documentElement.classList.remove('preload');
  document.documentElement.setAttribute('data-prerendered', 'true');
  const pageModule = basePath.startsWith('/docs/') ? 'docs' : basePath === '/' ? 'home' : basePath.split('/')[1];
  const routeEntry = Object.keys(manifest).find(key => key === `src/page-${pageModule}.tsx`);
  const visited = new Set();
  const preload = key => {
    if (!key || visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) return;
    if (!document.head.querySelector(`link[href="/${entry.file}"]`)) {
      const link = document.createElement('link'); link.rel = 'modulepreload'; link.href = `/${entry.file}`; document.head.append(link);
    }
    for (const dependency of entry.imports ?? []) preload(dependency);
  };
  preload(routeEntry);

  document.title = metadata.title;
  document.documentElement.lang = metadata.language;
  document.head.querySelectorAll('link[hreflang]').forEach(element => { element.remove(); });
  for (const alternate of languageAlternates(path)) {
    const link = document.createElement('link'); link.rel = 'alternate'; link.setAttribute('hreflang', alternate.lang); link.href = `${SITE_ORIGIN}${alternate.path}`; document.head.append(link);
  }
  const meta = (attribute, name, content) => {
    let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element); }
    element.setAttribute('content', content);
  };
  meta('name', 'description', metadata.description);
  meta('property', 'og:locale', isTraditional(path) ? 'zh_TW' : 'zh_CN');
  meta('name', 'robots', metadata.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  for (const prefix of ['og', 'twitter']) {
    meta(prefix === 'og' ? 'property' : 'name', `${prefix}:title`, metadata.title);
    meta(prefix === 'og' ? 'property' : 'name', `${prefix}:description`, metadata.description);
  }
  document.head.querySelector('link[rel="canonical"]')?.remove();
  if (metadata.canonical) {
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = metadata.canonical; document.head.append(canonical);
    meta('property', 'og:url', metadata.canonical);
  }
  const schema = structuredData(path);
  if (schema) { const script = document.createElement('script'); script.id = 'site-structured-data'; script.type = 'application/ld+json'; script.textContent = serializeJsonLd(schema); document.head.append(script); }
  const module = `src/page-${pageModule}.tsx`;
  const styles = new Set();
  const collect = key => { for (const css of manifest[key]?.css ?? []) styles.add(css); for (const dependency of manifest[key]?.imports ?? []) collect(dependency); };
  collect(module);
  for (const style of styles) if (!document.querySelector(`link[href="/${style}"]`)) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = `/${style}`; document.head.append(link); }
  if (Object.keys(data).length) { const script = document.createElement('script'); script.type = 'application/json'; script.id = 'static-query-data'; script.textContent = serializeJsonLd(data); document.body.append(script); }
  const noscript = document.querySelector('noscript');
  if (noscript) noscript.innerHTML = isTraditional(path) ? '<p class="noscript-note">正文與下載連結可直接閱讀。搜尋與表單提交需要 JavaScript。</p>' : '<p class="noscript-note">正文与文档可直接阅读。搜索、表单提交和交互预览需要 JavaScript；也可以前往 <a href="https://github.com/metasequoiaime">GitHub 项目</a> 查看发布与提交反馈。</p>';
  // Native disclosure remains usable without JS; decorative reveals must never hide static content.
  if (!metadata.noindex) {
    const link = document.createElement('link'); link.rel = 'alternate'; link.type = 'text/markdown'; link.href = `${SITE_ORIGIN}${markdownPath(path)}`; link.title = 'Markdown'; document.head.append(link);
    const article = document.createElement('div');
    for (const element of document.querySelectorAll('main, .page-hero')) if (!element.parentElement?.closest('main, .page-hero')) article.append(element.cloneNode(true));
    article.querySelectorAll('script, style, nav, aside, button, form, input, select, textarea, video, .faq-filters, .feedback-heading + .feedback-layout').forEach(element => { element.remove(); });
    article.querySelectorAll('a[href], img[src]').forEach(element => {
      const attribute = element.tagName === 'A' ? 'href' : 'src';
      const value = element.getAttribute(attribute);
      if (value && !value.startsWith('data:')) element.setAttribute(attribute, new URL(value, metadata.canonical).href);
    });
    const text = `# ${metadata.title}\n\n> ${metadata.description}\n\n来源：${metadata.canonical}\n${basePath.startsWith('/docs/') || basePath === '/faq/' ? `文档版本：MSIME-Docs ${docsCommit}\n` : ''}\n${markdown.turndown(article.innerHTML).replace(/^# [^\n]+\n/, '')}\n`;
    write(`${dist}${markdownPath(path)}`, text);
    contents.push({ path, ...metadata, text });
  }
  write(`${dist}/${file}`, document.toString());
  console.log(`Static HTML + metadata: ${path}`);
}
const canonicalContents = contents.filter(page => page.path === page.canonicalPath);
write(`${dist}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${canonicalContents.map(page => `  <url><loc>${escapeXml(page.canonical)}</loc>${languageAlternates(page.path).map(alternate => `<xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${SITE_ORIGIN}${alternate.path}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`);
write(`${dist}/llms.txt`, `# 水杉输入法 MSIME\n\n> 开源中文输入法。本站提供各平台下载、功能介绍、官方使用指南与常见问题。\n\n文档内容由固定版本的 MSIME-Docs 生成。版本、下载和签名状态请以下载页及对应发布页为准。\n\n## 页面与文档\n\n${canonicalContents.map(page => `- [${page.title}](${SITE_ORIGIN}${markdownPath(page.path)}): ${page.description}`).join('\n')}\n\n## 完整内容\n\n- [完整 Markdown](${SITE_ORIGIN}/llms-full.txt): 上述页面的合并正文\n- [站点地图](${SITE_ORIGIN}/sitemap.xml): 规范 HTML 地址\n- [GitHub 组织](https://github.com/metasequoiaime): 源码、发布与 Issue\n`);
write(`${dist}/llms-full.txt`, `# 水杉输入法 MSIME — 网站正文\n\n文档版本：MSIME-Docs ${docsCommit}\n\n${canonicalContents.map(page => page.text).join('\n\n---\n\n')}`);
let headers = readFileSync(`${dist}/_headers`, 'utf8');
for (const page of contents) headers += `\n${markdownPath(page.path)}\n  Content-Type: text/markdown; charset=utf-8\n  Link: <${page.canonical}>; rel="canonical"\n  X-Robots-Tag: noindex\n`;
headers += '\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n\n/llms-full.txt\n  Content-Type: text/plain; charset=utf-8\n';
write(`${dist}/_headers`, headers);
