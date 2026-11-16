import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BACKEND_ORIGIN, createdSchema, englishSchema, ERROR_MESSAGES, formatLine, KIND_FIELDS, normalizePinyin, REJECTION_MESSAGES, rejectedSchema, rejectionMessage, requestBody, submissionError, SUBMISSION_KINDS, translationDirection, translationsSchema, WORD_SUBMISSIONS_URL, wordsConfigSchema, wordsSchema } from '../shared/words.ts';
import { PINYIN_SYLLABLES } from '../shared/pinyin-syllables.ts';

const valid = { entries: [{ word: '未来可期', pinyin: "wei'lai'ke'qi" }, { word: '扛把子', pinyin: 'Kang Ba  Zi' }], note: '网络流行语' };
const rejects = input => assert.equal(wordsSchema.safeParse(input).success, false, JSON.stringify(input).slice(0, 120));

test('pinyin input is normalized to the dictionary spelling', () => {
  assert.equal(normalizePinyin("  Wei Lai’ke qi "), "wei'lai'ke'qi");
  assert.equal(normalizePinyin("wei''lai'"), "wei'lai");
  assert.equal(normalizePinyin('lüe nue lu:'), "lve'nve'lv");
  assert.deepEqual(wordsSchema.parse(valid).entries[1], { word: '扛把子', pinyin: "kang'ba'zi" });
  // The backend picks the weight, so the preview line has no third column.
  assert.equal(formatLine('words', wordsSchema.parse(valid).entries[0]), "未来可期\twei'lai'ke'qi");
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
  for (const pinyin of ['', "wei'lai'ke", "wei'lai'ke'qi'ba", "wei'xyz'ke'qi", "wei'lai3'ke'qi", 'weilaike', "wei-lai-ke-qi"]) rejects({ entries: [{ word: '未来可期', pinyin }] });
  const issue = wordsSchema.safeParse({ entries: [{ word: '未来可期', pinyin: "wei'lai'ke" }] }).error.issues[0];
  assert.deepEqual(issue.path, ['entries', 0, 'pinyin']);
  assert.match(issue.message, /4 个字，但拼音有 3 个音节/);
});

test('unseparated pinyin is split only when the character count allows one reading', () => {
  assert.deepEqual(wordsSchema.parse({ entries: [{ word: '测试', pinyin: 'ceshi' }] }).entries[0].pinyin, "ce'shi");
  assert.deepEqual(wordsSchema.parse({ entries: [{ word: '未来可期', pinyin: 'WeiLaiKeQi' }] }).entries[0].pinyin, "wei'lai'ke'qi");
  // A single character keeps its one syllable; separators the user typed are never re-split.
  assert.equal(wordsSchema.parse({ entries: [{ word: '先', pinyin: 'xian' }] }).entries[0].pinyin, 'xian');
  assert.equal(wordsSchema.parse({ entries: [{ word: '西安', pinyin: "xi'an" }] }).entries[0].pinyin, "xi'an");
  const ambiguous = wordsSchema.safeParse({ entries: [{ word: '方案', pinyin: 'fangan' }] }).error.issues[0];
  assert.deepEqual(ambiguous.path, ['entries', 0, 'pinyin']);
  assert.match(ambiguous.message, /多种切分方式/);
  assert.match(ambiguous.message, /fang'an/);
  assert.match(ambiguous.message, /fan'gan/);
  assert.match(wordsSchema.safeParse({ entries: [{ word: '测试', pinyin: 'ceshx' }] }).error.issues[0].message, /不是有效的全拼音节/);
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
  // msime-dictionary is the canonical name GitHub returns (ime-dictionary is only a redirect); msime-customdict, the archived previous target, stays accepted until no deployment can still write there. The first URL is the shape msime-cloud#58's tests expect.
  for (const url of ['https://github.com/metasequoiaime/msime-dictionary/pull/12', 'https://github.com/metasequoiaime/msime-customdict/pull/12']) assert.equal(createdSchema.safeParse({ pull_request_url: url }).success, true, url);
  for (const url of [
    'https://github.com/metasequoiaime/ime-dictionary/pull/12',
    'https://github.com/attacker/msime-dictionary/pull/1',
    'https://github.com/attacker/msime-customdict/pull/1',
    'https://evil.example/metasequoiaime/msime-dictionary/pull/1',
    'https://evil.example/metasequoiaime/msime-customdict/pull/1',
    'http://github.com/metasequoiaime/msime-dictionary/pull/1',
    'https://github.com/metasequoiaime/msime-dictionary-fork/pull/1',
    'https://github.com/metasequoiaime/msime/pull/1',
    'https://github.com/metasequoiaime/msime-dictionary/pull/1/files',
    'https://github.com/metasequoiaime/msime-dictionary/issues/1',
    'javascript:alert(1)',
  ]) assert.equal(createdSchema.safeParse({ pull_request_url: url }).success, false, url);
  assert.deepEqual(rejectedSchema.parse({ error: 'bad', rejected: [{ index: 1, reason: '重复' }] }).rejected, [{ index: 1, reason: '重复' }]);
  assert.match(submissionError(409, {}), /重新验证后再次提交/);
  assert.match(submissionError(429, {}), /频繁/);
  assert.match(submissionError(502, { uncertain: true }), /确认词条未写入后再提交/);
  assert.match(submissionError(503, {}), /暂未开放/);
  assert.equal(submissionError(503, { error: '暂时无法读取词库仓库，词条尚未写入，请稍后再试。' }), '暂时无法读取词库仓库，词条尚未写入，请稍后再试。');
  assert.equal(submissionError(400, { error: '第 2 个词条拼音不正确' }), '第 2 个词条拼音不正确');
  assert.match(submissionError(400, {}), /未通过校验/);
  // A code the page knows wins over the backend's wording.
  assert.equal(submissionError(403, { error: 'x', code: 'verification_failed' }), ERROR_MESSAGES.verification_failed);
  assert.equal(submissionError(503, { error: 'x', code: 'github_unavailable' }), ERROR_MESSAGES.github_unavailable);
  assert.match(submissionError(502, { code: 'outcome_unknown', uncertain: true }), /确认词条未写入后再提交/);
  // Sensitive word screening: a blocked note asks for an edit, an unavailable screen says nothing was written; neither claims the service is down for good.
  assert.equal(submissionError(400, { error: '备注包含不允许提交的内容，请修改后再提交。', code: 'blocked_word' }), ERROR_MESSAGES.blocked_word);
  assert.match(submissionError(400, { code: 'blocked_word' }), /备注.*请修改后再提交/);
  assert.match(submissionError(422, { code: 'blocked_content' }), /不允许发布的词语，请修改后再提交/);
  assert.match(submissionError(503, { error: '词条提交暂时不可用，请稍后再试。', code: 'screening_unavailable' }), /审核服务暂时不可用，词条尚未写入/);
  assert.equal(rejectionMessage('translations', { index: 0, code: 'blocked_word', reason: '包含不允许提交的内容' }).field, 'source');
});

const english = { entries: [{ word: 'iphone', display: 'iPhone' }, { word: ' GitHub ', display: ' GitHub ' }], note: '' };
const translations = { entries: [{ source: '水杉', gloss: 'dawn redwood' }, { source: ' metasequoia ', gloss: ' 水杉 ' }], note: '' };
const firstIssue = (schema, input) => { const result = schema.safeParse(input); assert.equal(result.success, false, JSON.stringify(input)); return result.error.issues[0]; };

test('english entries mirror the backend: lowercase a-z key, plain display', () => {
  assert.deepEqual(englishSchema.parse(english).entries, [{ word: 'iphone', display: 'iPhone' }, { word: 'github', display: 'GitHub' }]);
  assert.equal(formatLine('english', englishSchema.parse(english).entries[0]), 'iphone\tiPhone\t1');
  assert.equal(englishSchema.safeParse({ entries: [{ word: 'a'.repeat(64), display: 'd'.repeat(64) }] }).success, true);
  const cases = [
    [{ word: '', display: 'x' }, 'word', /请填写英文单词/],
    [{ word: 'e-mail', display: 'e-mail' }, 'word', /a–z/],
    [{ word: 'wi fi', display: 'Wi-Fi' }, 'word', /a–z/],
    [{ word: 'café', display: 'café' }, 'word', /a–z/],
    [{ word: 'a'.repeat(65), display: 'x' }, 'word', /64 个字母/],
    [{ word: 'iphone', display: '  ' }, 'display', /请填写/],
    [{ word: 'iphone', display: 'i\tPhone' }, 'display', /控制字符/],
    [{ word: 'iphone', display: 'i\u200bPhone' }, 'display', /控制字符/],
    [{ word: 'iphone', display: 'i\u2028Phone' }, 'display', /控制字符/],
    [{ word: 'iphone', display: 'x'.repeat(65) }, 'display', /64 个字符/],
  ];
  for (const [entry, field, message] of cases) {
    const issue = firstIssue(englishSchema, { entries: [entry] });
    assert.deepEqual(issue.path, ['entries', 0, field], JSON.stringify(entry));
    assert.match(issue.message, message, JSON.stringify(entry));
  }
  // Only the (word, display) pair is a duplicate.
  assert.equal(englishSchema.safeParse({ entries: [{ word: 'iphone', display: 'iPhone' }, { word: 'iphone', display: 'IPHONE' }] }).success, true);
  assert.deepEqual(firstIssue(englishSchema, { entries: [{ word: 'iphone', display: 'iPhone' }, { word: 'IPhone', display: 'iPhone ' }] }).path, ['entries', 1, 'display']);
});

test('translation entries mirror the backend and report their direction', () => {
  assert.deepEqual(translationsSchema.parse(translations).entries[1], { source: 'metasequoia', gloss: '水杉' });
  assert.equal(formatLine('translations', translationsSchema.parse(translations).entries[0]), '水杉\tdawn redwood');
  assert.equal(translationsSchema.safeParse({ entries: [{ source: 's'.repeat(64), gloss: 'g'.repeat(200) }] }).success, true);
  const cases = [
    [{ source: ' ', gloss: 'x' }, 'source', /请填写原词/],
    [{ source: 'a\tb', gloss: 'x' }, 'source', /控制字符/],
    [{ source: '#tag', gloss: 'x' }, 'source', /# 开头/],
    [{ source: 's'.repeat(65), gloss: 'x' }, 'source', /64 个字符/],
    [{ source: 'word', gloss: '' }, 'gloss', /请填写译文/],
    [{ source: 'word', gloss: 'a\nb' }, 'gloss', /控制字符/],
    [{ source: 'word', gloss: 'a\u200db' }, 'gloss', /控制字符/],
    [{ source: 'word', gloss: 'g'.repeat(201) }, 'gloss', /200 个字符/],
  ];
  for (const [entry, field, message] of cases) {
    const issue = firstIssue(translationsSchema, { entries: [entry] });
    assert.deepEqual(issue.path, ['entries', 0, field], JSON.stringify(entry));
    assert.match(issue.message, message, JSON.stringify(entry));
  }
  // A new gloss for a source is an override, not a duplicate; only an identical pair is.
  assert.equal(translationsSchema.safeParse({ entries: [{ source: 'bank', gloss: '银行' }, { source: 'bank', gloss: '河岸' }] }).success, true);
  assert.deepEqual(firstIssue(translationsSchema, { entries: [{ source: 'bank', gloss: '银行' }, { source: ' bank', gloss: '银行 ' }] }).path, ['entries', 1, 'gloss']);
  assert.equal(translationDirection('水杉'), 'zh-en');
  assert.equal(translationDirection('Wi-Fi 热点'), 'zh-en');
  assert.equal(translationDirection('㐀'), 'zh-en');
  assert.equal(translationDirection('metasequoia'), 'en-zh');
  assert.equal(translationDirection('café'), 'en-zh');
});

test('every kind shares the entry count and note rules', () => {
  for (const [schema, entry] of [[englishSchema, { word: 'a', display: 'a' }], [translationsSchema, { source: 'a', gloss: 'a' }]]) {
    assert.equal(schema.safeParse({ entries: [] }).success, false);
    assert.equal(schema.safeParse({ entries: Array.from({ length: 21 }, (_, index) => ({ ...Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, value + 'a'.repeat(index)])) })) }).success, false);
    assert.equal(schema.safeParse({ entries: [entry], note: 'line\nbreak' }).success, false);
    assert.deepEqual(Object.keys(schema.parse({ entries: [{ ...entry, weight: 1 }], note: '' }).entries[0]).sort(), Object.keys(entry).sort());
  }
});

test('the request body omits kind for words so a backend without kinds still accepts it', () => {
  assert.deepEqual(requestBody('words', { entries: [{ word: '未来', pinyin: "wei'lai" }], note: '' }, 't'), { entries: [{ word: '未来', pinyin: "wei'lai" }], note: '', token: 't' });
  assert.deepEqual(requestBody('english', englishSchema.parse(english), 't'), { kind: 'english', entries: [{ word: 'iphone', display: 'iPhone' }, { word: 'github', display: 'GitHub' }], note: '', token: 't' });
  assert.deepEqual(Object.keys(requestBody('translations', translationsSchema.parse(translations), 't')), ['kind', 'entries', 'note', 'token']);
  assert.deepEqual(SUBMISSION_KINDS, ['words', 'english', 'translations']);
});

test('the new kinds say they are unavailable while the backend rejects them', () => {
  for (const kind of ['english', 'translations']) {
    for (const code of ['invalid_kind', 'invalid_json']) assert.match(submissionError(400, { error: '请求格式不正确。', code }, kind), /暂不支持这一类型/);
  }
  assert.match(submissionError(400, { error: '请求格式不正确。', code: 'invalid_json' }, 'words'), /请求格式不正确/);
});

test('every backend rejection code maps to a field of its kind and a Chinese message', () => {
  const codes = {
    words: ['word_required', 'invalid_word', 'word_too_long', 'pinyin_required', 'invalid_pinyin', 'invalid_syllable', 'syllable_count_mismatch', 'duplicate_entry', 'already_listed', 'blocked_word'],
    english: ['word_required', 'invalid_word', 'word_too_long', 'display_required', 'invalid_display', 'display_too_long', 'duplicate_entry', 'already_listed', 'blocked_word'],
    translations: ['source_required', 'invalid_source', 'source_too_long', 'gloss_required', 'invalid_gloss', 'gloss_too_long', 'duplicate_entry', 'already_listed', 'blocked_word'],
  };
  const entries = { words: { word: '未来', pinyin: "wei'lai" }, english: { word: 'iphone', display: 'iPhone' }, translations: { source: 'bank', gloss: '银行' } };
  for (const kind of SUBMISSION_KINDS) {
    assert.deepEqual(Object.keys(REJECTION_MESSAGES[kind]).sort(), [...codes[kind]].sort(), kind);
    for (const code of codes[kind]) {
      const { field, message } = rejectionMessage(kind, { index: 0, code, reason: 'backend reason' }, entries[kind]);
      assert.ok(KIND_FIELDS[kind].includes(field), `${kind} ${code} → ${field}`);
      assert.match(message, /\p{Script=Han}/u, `${kind} ${code}`);
      assert.notEqual(message, 'backend reason');
    }
  }
  assert.equal(rejectionMessage('words', { index: 0, code: 'syllable_count_mismatch', reason: '' }, entries.words).field, 'pinyin');
  assert.match(rejectionMessage('translations', { index: 0, code: 'duplicate_entry', reason: '' }, entries.translations).message, /bank/);
  // An unknown code falls back to the backend's reason on the first field.
  assert.deepEqual(rejectionMessage('english', { index: 0, code: 'new_code', reason: '新的原因' }), { field: 'word', message: '新的原因' });
  assert.deepEqual(rejectedSchema.parse({ error: 'x', code: 'invalid_entries', rejected: [{ index: 0, code: 'gloss_required', reason: '请填写译文' }] }).rejected[0].code, 'gloss_required');
  for (const code of ['invalid_json', 'invalid_kind', 'invalid_entry_count', 'invalid_note', 'invalid_entries', 'token_required', 'json_required', 'request_too_large', 'origin_required', 'verification_failed', 'rate_limit_exceeded', 'concurrent_update', 'outcome_unknown', 'word_submissions_disabled', 'word_submissions_misconfigured', 'verification_unavailable', 'rate_limit_unavailable', 'github_unavailable', 'blocked_word', 'blocked_content', 'screening_unavailable']) assert.match(ERROR_MESSAGES[code] ?? '', /\p{Script=Han}/u, code);
});
