import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hashInlineScripts, withScriptHashes } from './csp-hashes.mjs';

const HEADERS = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'
  X-Frame-Options: DENY
`;

test('the digest is taken over the exact bytes the browser sees', () => {
  // 夹具是从真实构建产物里原样取出的那段主题引导脚本，摘要则是 Chromium 在生产站上报出来、
  // 要求加进 script-src 的值。把两边钉在一起：算法一旦偏一个字节（多 trim 一次、换个编码），这条就会红。
  const script = readFileSync(new URL('./fixtures/inline-theme-script.txt', import.meta.url), 'utf8');
  assert.deepEqual(hashInlineScripts(`<script>${script}</script>`), [
    "'sha256-vazMhngzYUTS1NjSKzABwx1KJzUZQlpnGu4l3/Pg1j8='",
  ]);
});

test('a script with a src is left alone, only inline blocks are hashed', () => {
  const html = '<script type="module" src="/assets/app.js"></script><script>a()</script>';
  assert.equal(hashInlineScripts(html).length, 1);
});

test('the hashes land in script-src and nothing else is disturbed', () => {
  const out = withScriptHashes(HEADERS, ["'sha256-AAA='"]);
  assert.match(out, /script-src 'self' 'sha256-AAA=';/);
  assert.match(out, /default-src 'self';/);
  assert.match(out, /style-src 'self' 'unsafe-inline';/);
  assert.match(out, /X-Frame-Options: DENY/);
});

test('running twice does not stack duplicate hashes', () => {
  const once = withScriptHashes(HEADERS, ["'sha256-AAA='"]);
  assert.equal(withScriptHashes(once, ["'sha256-AAA='"]), once);
});

test('no inline script means the policy is left exactly as written', () => {
  assert.equal(withScriptHashes(HEADERS, []), HEADERS);
});


test('JSON data blocks need no execution permission; modules and import maps still do', () => {
  assert.deepEqual(hashInlineScripts('<script type="application/ld+json">{"name":"資料"}</script><script type="application/json">{}</script>'), []);
  assert.equal(hashInlineScripts('<script type="module">a()</script><script type="importmap">{}</script>').length, 2);
});
