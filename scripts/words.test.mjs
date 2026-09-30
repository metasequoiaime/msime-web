import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BACKEND_ORIGIN, createdSchema, formatLine, normalizePinyin, rejectedSchema, submissionError, WORD_SUBMISSIONS_URL, wordsConfigSchema, wordsSchema } from '../shared/words.ts';
import { PINYIN_SYLLABLES } from '../shared/pinyin-syllables.ts';

const valid = { entries: [{ word: '未来可期', pinyin: "wei'lai'ke'qi" }, { word: '扛把子', pinyin: 'Kang Ba  Zi' }], note: '网络流行语' };
const rejects = input => assert.equal(wordsSchema.safeParse(input).success, false, JSON.stringify(input).slice(0, 120));

test('pinyin input is normalized to the dictionary spelling', () => {
  assert.equal(normalizePinyin("  Wei Lai’ke qi "), "wei'lai'ke'qi");
  assert.equal(normalizePinyin("wei''lai'"), "wei'lai");
  assert.equal(normalizePinyin('lüe nue lu:'), "lve'nve'lv");
  assert.deepEqual(wordsSchema.parse(valid).entries[1], { word: '扛把子', pinyin: "kang'ba'zi" });
  assert.equal(formatLine(wordsSchema.parse(valid).entries[0]), "未来可期\twei'lai'ke'qi\t5000");
});

test('the syllable table is the engine list with ü written as v', () => {
  assert.equal(PINYIN_SYLLABLES.size, 402);
  for (const syllable of ['a', 'er', 'zhuang', 'lv', 'nve', 'biang']) assert.ok(PINYIN_SYLLABLES.has(syllable), syllable);
  for (const syllable of ['lue', 'nue', 'xyz', 'wei3', '']) assert.ok(!PINYIN_SYLLABLES.has(syllable), syllable);
});

test('words must be 1-16 Han characters', () => {
  assert.equal(wordsSchema.safeParse({ entries: [{ word: '二〇二六', pinyin: "er'ling'er'liu" }] }).success, true);
  assert.equal(wordsSchema.safeParse({ entries: [{ word: '𠀀', pinyin: 'qiu' }] }).success, true);
  assert.equal(wordsSchema.safeParse({ entries: [{ word: '字'.repeat(16), pinyin: Array(16).fill('zi').join("'") }] }).success, true);
  for (const word of ['', 'abc', 'AI助手', '未来\u0000', '未来 可期', '未来！', '⺀', '々々', '字'.repeat(17)]) rejects({ entries: [{ word, pinyin: Array([...word].length || 1).fill('zi').join("'") }] });
});

test('pinyin is required, made of valid syllables and matches the character count', () => {
  for (const pinyin of ['', "wei'lai'ke", "wei'lai'ke'qi'ba", "wei'xyz'ke'qi", "wei'lai3'ke'qi", 'weilaikeqi', "wei-lai-ke-qi"]) rejects({ entries: [{ word: '未来可期', pinyin }] });
  const issue = wordsSchema.safeParse({ entries: [{ word: '未来可期', pinyin: "wei'lai'ke" }] }).error.issues[0];
  assert.deepEqual(issue.path, ['entries', 0, 'pinyin']);
  assert.match(issue.message, /4 个字，但拼音有 3 个音节/);
});

test('submissions hold 1-20 entries without duplicates and an optional single-line note', () => {
  rejects({ entries: [] });
  const syllables = [...PINYIN_SYLLABLES].slice(0, 21);
  assert.equal(wordsSchema.safeParse({ entries: syllables.slice(0, 20).map(pinyin => ({ word: '字', pinyin })) }).success, true);
  rejects({ entries: syllables.map(pinyin => ({ word: '字', pinyin })) });
  const duplicate = wordsSchema.safeParse({ entries: [{ word: '未来', pinyin: "wei'lai" }, { word: '未来', pinyin: 'Wei Lai' }] });
  assert.equal(duplicate.success, false);
  assert.deepEqual(duplicate.error.issues[0].path, ['entries', 1, 'word']);
  // Same characters with a different reading are distinct entries (polyphones).
  assert.equal(wordsSchema.safeParse({ entries: [{ word: '行长', pinyin: "hang'zhang" }, { word: '行长', pinyin: "xing'zhang" }] }).success, true);
  assert.equal(wordsSchema.parse({ entries: valid.entries }).note, '');
  for (const note of ['line\nbreak', 'tab\there', 'x'.repeat(201)]) rejects({ ...valid, note });
});

test('the request body carries only entries and note; no contact or personal fields exist', () => {
  const parsed = wordsSchema.parse({ ...valid, email: 'someone@example.com', qq: '123', weight: 1 });
  assert.deepEqual(Object.keys(parsed).sort(), ['entries', 'note']);
  assert.deepEqual(Object.keys(parsed.entries[0]).sort(), ['pinyin', 'word']);
});

test('backend responses are parsed strictly and every documented status has a message', () => {
  assert.equal(WORD_SUBMISSIONS_URL, 'https://api.msime.app/v1/community/word-submissions');
  assert.ok(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').match(/connect-src ([^;]+)/)[1].split(' ').includes(BACKEND_ORIGIN), 'CSP connect-src must allow the backend origin');
  assert.equal(wordsConfigSchema.safeParse({ site_key: 'k', enabled: true }).success, true);
  assert.equal(wordsConfigSchema.safeParse({ siteKey: 'k' }).success, false);
  assert.equal(createdSchema.safeParse({ pull_request_url: 'https://github.com/metasequoiaime/msime-customdict/pull/12' }).success, true);
  for (const url of ['https://github.com/attacker/msime-customdict/pull/1', 'https://evil.example/metasequoiaime/msime-customdict/pull/1', 'javascript:alert(1)']) assert.equal(createdSchema.safeParse({ pull_request_url: url }).success, false, url);
  assert.deepEqual(rejectedSchema.parse({ error: 'bad', rejected: [{ index: 1, reason: '重复' }] }).rejected, [{ index: 1, reason: '重复' }]);
  assert.match(submissionError(409, {}), /重新验证后再次提交/);
  assert.match(submissionError(429, {}), /频繁/);
  assert.match(submissionError(502, { uncertain: true }), /确认词条未写入后再提交/);
  assert.match(submissionError(503, {}), /暂未开放/);
  assert.equal(submissionError(400, { error: '第 2 个词条拼音不正确' }), '第 2 个词条拼音不正确');
  assert.match(submissionError(400, {}), /未通过校验/);
});
