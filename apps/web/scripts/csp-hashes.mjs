#!/usr/bin/env node
/**
 * 把构建产物里内联脚本的 SHA-256 摘要写进 `_headers` 的 `script-src`。
 *
 * 站点的 CSP 是 `script-src 'self'`，不含 `'unsafe-inline'` —— 这是对的，收紧的 CSP 正是这个纯静态站该有的样子。但每个入口 HTML 都带一段内联脚本：它在首帧之前从 localStorage 读出主题写到 `<html>` 上，没有它，关键 CSS 的默认值（深色）会先画出来，等主包执行完再翻成用户真正选的那套。实测 200kbps 下，浅色用户会盯着深色底六秒。
 *
 * 所以两者都要：脚本必须留在内联（外链脚本要多一次往返，首帧前的东西经不起这个），CSP 也必须收紧。CSP 给了第三条路 —— 按摘要放行。摘要在构建时算，写进产物里的 `_headers`，脚本内容一变摘要跟着变，不会有人记得手工更新而漏掉。
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

/** 递归收集 dist 下所有 HTML —— 站点是多入口的，每个目录一个 index.html。 */
export const htmlFiles = (dir, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, found);
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
};

/** CSP 的摘要算的是脚本节点里的原始文本，一个字节都不能差 —— 不能 trim。 */
export const hashInlineScripts = (html) =>
  [...html.matchAll(INLINE_SCRIPT)]
    .filter(match => !/^<script\b[^>]*\btype=['"]application\/(?:ld\+)?json['"]/i.test(match[0]))
    .map((match) => `'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`);

/** 只动 script-src 这一条指令，其余原样留着。 */
export const withScriptHashes = (headers, hashes) => {
  if (hashes.length === 0) return headers;

  return headers.replace(/(Content-Security-Policy:[^\n]*?script-src )([^;]*)/g, (whole, prefix, sources) => {
    const existing = sources.trim().split(/\s+/);
    const added = hashes.filter((hash) => !existing.includes(hash));
    return added.length === 0 ? whole : `${prefix}${sources.trim()} ${added.join(' ')}`;
  });
};

const main = () => {
  const dist = process.argv[2] ?? 'dist';
  const headersPath = join(dist, '_headers');

  const hashes = [...new Set(htmlFiles(dist).flatMap((file) => hashInlineScripts(readFileSync(file, 'utf8'))))];
  const headers = readFileSync(headersPath, 'utf8');
  const updated = withScriptHashes(headers, hashes);

  if (updated === headers && hashes.length > 0) {
    throw new Error('内联脚本的摘要没能写进 script-src，CSP 会拦掉它们');
  }

  writeFileSync(headersPath, updated);
  console.log(`script-src 放行 ${hashes.length} 段内联脚本: ${hashes.join(' ')}`);
};

if (import.meta.url === `file://${process.argv[1]}`) main();
