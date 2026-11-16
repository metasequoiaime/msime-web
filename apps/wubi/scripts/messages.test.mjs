import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenize } from '../src/rich-text.ts';
import { zh } from '../src/i18n/zh.ts';

const strings = (value, out = []) => {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) strings(item, out);
  return out;
};

test('inline marks parse into text, code and links', () => {
  assert.deepEqual(tokenize('按 `z` 见[指南](/guide/)'), [
    { kind: 'text', value: '按 ' },
    { kind: 'code', value: 'z' },
    { kind: 'text', value: ' 见' },
    { kind: 'link', value: '指南', href: '/guide/' },
  ]);
  assert.deepEqual(tokenize('a `b'), [{ kind: 'text', value: 'a `b' }]);
});

test('every message has balanced marks and links only to this site, msime.app or GitHub', () => {
  for (const text of strings(zh)) {
    for (const token of tokenize(text)) {
      if (token.kind === 'text') assert.ok(!token.value.includes('`'), `unclosed code mark: ${text}`);
      if (token.kind === 'link') assert.match(token.href, /^(\/(download|guide|faq)\/|https:\/\/(msime\.app|github\.com|testflight\.apple\.com)\/)/, token.href);
    }
  }
});

test('the content stays within the documented facts', () => {
  const all = strings(zh).join('\n');
  // 新世纪五笔 is not offered on this site (unverified for the edition); nothing may mention it.
  assert.doesNotMatch(all, /新世纪/);
  // Removed parts of msime.app must not be linked or promised.
  assert.doesNotMatch(all, /zh-TW|社区皮肤|水杉娘|\/me\//);
  // The engine licence is not stated; only data licences are.
  assert.doesNotMatch(all, /MPL|引擎.*GPL/);
  assert.ok(zh.faq.items.length >= 5 && zh.faq.items.length <= 10);
});
