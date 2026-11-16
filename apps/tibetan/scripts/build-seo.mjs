import { basePath, languageAlternates, OG_LOCALE, PAGE_PATHS } from "../shared/locales.ts";
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
const NOSCRIPT = {
  bo: '<p class="noscript-note">ནང་དོན་ཀློག་ཆོག ཁ་དོག་བརྗེ་བར་ JavaScript དགོས།</p>',
  zh: '<p class="noscript-note">正文与下载链接可以直接阅读，切换配色需要 JavaScript。</p>',
};
const PAGE_MODULES = { '/': 'home', '/download/': 'download', '/guide/': 'guide', '/faq/': 'faq' };
const contents = [];
const pages = [...Object.keys(seoPages), '/404/'];
// Every page starts from the single Vite entry. Read it once: the loop writes the home page back to dist/index.html, and later pages must not start from that prerendered copy.
const template = readFileSync(`${dist}/index.html`, 'utf8');
for (const path of pages) {
  const metadata = pageSeo(path);
  const base = basePath(path);
  const file = path === '/404/' ? '404.html' : path === '/' ? 'index.html' : `${path.slice(1)}index.html`;
  const { document } = parseHTML(template);
  const { html: body, bootstrap } = await render(path === '/404/' ? '/__not-found__/' : path);
  if (!body.includes('<h1')) throw new Error(`Static render failed for ${path}`);
  document.getElementById('root').innerHTML = body;
  const bootstrapCode = bootstrap.join('\n');
  const bootstrapFile = `/assets/router-state-${createHash('sha256').update(bootstrapCode).digest('hex').slice(0, 16)}.js`;
  write(`${dist}${bootstrapFile}`, bootstrapCode);
  const stateScript = document.createElement('script'); stateScript.src = bootstrapFile; stateScript.setAttribute('defer', ''); stateScript.setAttribute('data-router-state', ''); document.body.append(stateScript);
  const statePreload = document.createElement('link'); statePreload.rel = 'preload'; statePreload.setAttribute('as', 'script'); statePreload.href = bootstrapFile; document.head.append(statePreload);
  document.documentElement.classList.remove('preload');
  document.documentElement.setAttribute('data-prerendered', 'true');

  const module = PAGE_MODULES[base] ? `src/page-${PAGE_MODULES[base]}.tsx` : undefined;
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
  preload(module);
  const styles = new Set();
  const collect = key => { for (const css of manifest[key]?.css ?? []) styles.add(css); for (const dependency of manifest[key]?.imports ?? []) collect(dependency); };
  if (module) collect(module);
  for (const style of styles) if (!document.querySelector(`link[href="/${style}"]`)) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = `/${style}`; document.head.append(link); }

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
  meta('property', 'og:locale', OG_LOCALE[metadata.locale]);
  meta('name', 'robots', metadata.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  for (const prefix of ['og', 'twitter']) {
    meta(prefix === 'og' ? 'property' : 'name', `${prefix}:title`, metadata.title);
    meta(prefix === 'og' ? 'property' : 'name', `${prefix}:description`, metadata.description);
  }
  document.head.querySelector('link[rel="canonical"]')?.remove();
  if (metadata.canonical) {
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = metadata.canonical; document.head.append(canonical);
    meta('property', 'og:url', metadata.canonical);
  } else document.head.querySelector('meta[property="og:url"]')?.remove();
  const schema = structuredData(path);
  if (schema) { const script = document.createElement('script'); script.id = 'site-structured-data'; script.type = 'application/ld+json'; script.textContent = serializeJsonLd(schema); document.head.append(script); }
  const noscript = document.querySelector('noscript');
  if (noscript) noscript.innerHTML = NOSCRIPT[metadata.locale];

  if (!metadata.noindex) {
    const link = document.createElement('link'); link.rel = 'alternate'; link.type = 'text/markdown'; link.href = `${SITE_ORIGIN}${markdownPath(path)}`; link.title = 'Markdown'; document.head.append(link);
    const article = document.createElement('div');
    for (const element of document.querySelectorAll('main')) article.append(element.cloneNode(true));
    article.querySelectorAll('script, style, nav, svg, button').forEach(element => { element.remove(); });
    article.querySelectorAll('a[href]').forEach(element => {
      const value = element.getAttribute('href');
      if (value) element.setAttribute('href', new URL(value, metadata.canonical).href);
    });
    const text = `# ${metadata.title}\n\n> ${metadata.description}\n\n${metadata.canonical}\n\n${markdown.turndown(article.innerHTML).replace(/^# [^\n]+\n/, '')}\n`;
    write(`${dist}${markdownPath(path)}`, text);
    contents.push({ path, ...metadata, text });
  }
  write(`${dist}/${file}`, document.toString());
  console.log(`Static HTML + metadata: ${path}`);
}

// Pages are listed in the order of PAGE_PATHS, each Tibetan page before its Chinese counterpart.
const order = path => PAGE_PATHS.indexOf(basePath(path)) * 2 + (path.startsWith('/zh/') ? 1 : 0);
contents.sort((a, b) => order(a.path) - order(b.path));
write(`${dist}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${contents.map(page => `  <url><loc>${escapeXml(page.canonical)}</loc>${languageAlternates(page.path).map(alternate => `<xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${SITE_ORIGIN}${alternate.path}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`);
write(`${dist}/llms.txt`, `# 水杉藏文 MSIME Tibetan\n\n> The Tibetan-only edition of MSIME (水杉输入法): type Tibetan in EWTS (Extended Wylie) on a Latin keyboard. macOS, Linux, Android and an unsigned Windows preview. Pages are in Tibetan, with Simplified Chinese under /zh/.\n\nVersions and downloads come from the official release manifest; check the download page and the GitHub releases for the current state. The full product is at https://msime.app/.\n\n## Pages\n\n${contents.map(page => `- [${page.title}](${SITE_ORIGIN}${markdownPath(page.path)}): ${page.description}`).join('\n')}\n\n## More\n\n- [All pages as Markdown](${SITE_ORIGIN}/llms-full.txt)\n- [Sitemap](${SITE_ORIGIN}/sitemap.xml)\n- [MSIME](https://msime.app/): the full input method\n- [Source](https://github.com/metasequoiaime/msime)\n`);
write(`${dist}/llms-full.txt`, `# 水杉藏文 MSIME Tibetan\n\n${contents.map(page => page.text).join('\n\n---\n\n')}`);
let headers = readFileSync(`${dist}/_headers`, 'utf8');
for (const page of contents) headers += `\n${markdownPath(page.path)}\n  Content-Type: text/markdown; charset=utf-8\n  Link: <${page.canonical}>; rel="canonical"\n  X-Robots-Tag: noindex\n`;
headers += '\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n\n/llms-full.txt\n  Content-Type: text/plain; charset=utf-8\n';
write(`${dist}/_headers`, headers);
