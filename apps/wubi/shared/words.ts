import { z } from "zod";
import { PINYIN_SYLLABLES } from "./pinyin-syllables.ts";

// Public origin of MSIME-Backend, which owns the submission API, Turnstile verification, rate limiting and the GitHub App. Not a secret; the CSP connect-src in public/_headers must list the same origin.
export const BACKEND_ORIGIN = "https://api.msime.app";
export const WORD_SUBMISSIONS_URL = `${BACKEND_ORIGIN}/v1/community/word-submissions`;
export const WORDS_REPO_URL = "https://github.com/metasequoiaime/msime-dictionary";
export const MAX_ENTRIES = 20;
export const MAX_WORD_LENGTH = 16;
export const MAX_NOTE_LENGTH = 200;
export const MAX_ENGLISH_WORD_LENGTH = 64;
export const MAX_DISPLAY_LENGTH = 64;
export const MAX_SOURCE_LENGTH = 64;
export const MAX_GLOSS_LENGTH = 200;

// The three kinds of submission the backend accepts (msime-cloud#61). Each is appended to its own file in msime-dictionary; the Turnstile action is `words` for all of them.
export const SUBMISSION_KINDS = ["words", "english", "translations"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
/** The two entry fields of each kind, in the order the form shows them and the file stores them. */
export const KIND_FIELDS = { words: ["word", "pinyin"], english: ["word", "display"], translations: ["source", "gloss"] } as const satisfies Record<SubmissionKind, readonly [string, string]>;
export const KIND_FILES: Record<SubmissionKind, string> = { words: "custom/words.txt", english: "custom/english.txt", translations: "custom/translations.txt" };

// These rules mirror the backend so users see mistakes before submitting. The backend stays authoritative and repeats every check.
// CJK unified ideographs only (all extension blocks), plus 〇 which is used in numerals such as 二〇二六. Radicals, punctuation, kana, Latin letters and control characters are rejected.
const HAN_WORD = /^[\p{Unified_Ideograph}〇]+$/u;
const QUANPIN = /^[a-z]+(?:'[a-z]+)*$/;

/** Accept common ways of typing pinyin and rewrite them to the dictionary form: lowercase, syllables joined by ', ü as v. */
export function normalizePinyin(value: string) {
  return value.trim().toLowerCase()
    .replace(/[\s’‘`·]+/g, "'")
    .replace(/'{2,}/g, "'")
    .replace(/^'|'$/g, "")
    .replace(/ü|u:/g, "v")
    .split("'")
    // The dictionary spells lüe/nüe as lve/nve; lue/nue are only input aliases.
    .map(syllable => syllable === "lue" ? "lve" : syllable === "nue" ? "nve" : syllable)
    .join("'");
}

const MAX_SYLLABLE_LENGTH = Math.max(...[...PINYIN_SYLLABLES].map(syllable => syllable.length));

/** Every way to split unseparated pinyin into exactly `count` valid syllables, stopping after `limit` results. */
export function pinyinSplits(pinyin: string, count: number, limit = 3): string[] {
  const results: string[] = [];
  const walk = (rest: string, parts: string[]) => {
    if (results.length >= limit) return;
    if (!rest) {
      if (parts.length === count) results.push(parts.join("'"));
      return;
    }
    if (parts.length >= count) return;
    for (let length = 1; length <= Math.min(MAX_SYLLABLE_LENGTH, rest.length); length++) {
      const syllable = rest.slice(0, length);
      if (PINYIN_SYLLABLES.has(syllable)) walk(rest.slice(length), [...parts, syllable]);
    }
  };
  walk(pinyin, []);
  return results;
}

// Pinyin typed without separators (ceshi for 测试) is split only when the character count allows exactly one reading; an ambiguous string such as fangan (fang'an or fan'gan) is left for the check below to reject with the candidates.
const splitUnambiguous = (pinyin: string, count: number) => {
  if (pinyin.includes("'") || count < 2) return pinyin;
  const splits = pinyinSplits(pinyin, count, 2);
  return splits.length === 1 ? splits[0] : pinyin;
};

export const wordEntrySchema = z.object({
  word: z.string().trim()
    .min(1, "请填写词语")
    .refine(value => [...value].length <= MAX_WORD_LENGTH, `词语最多 ${MAX_WORD_LENGTH} 个汉字`)
    .refine(value => HAN_WORD.test(value), "词语只能包含汉字，不能有字母、数字、标点或空格"),
  pinyin: z.string().max(200, "拼音过长").transform(normalizePinyin)
    .pipe(z.string().min(1, "请填写拼音").regex(QUANPIN, "拼音只能包含小写字母，音节之间用 ' 分隔，例如 wei'lai'ke'qi")),
}).transform(entry => ({ ...entry, pinyin: splitUnambiguous(entry.pinyin, [...entry.word].length) })).superRefine((entry, context) => {
  const syllables = entry.pinyin.split("'");
  const invalid = syllables.find(syllable => !PINYIN_SYLLABLES.has(syllable));
  const splits = syllables.length === 1 && [...entry.word].length > 1 ? pinyinSplits(entry.pinyin, [...entry.word].length) : [];
  if (splits.length > 1) context.addIssue({ code: "custom", path: ["pinyin"], message: `“${entry.pinyin}”有多种切分方式（${splits.join("、")}），请用空格或 ' 分隔音节` });
  else if (invalid) context.addIssue({ code: "custom", path: ["pinyin"], message: `“${invalid}”不是有效的全拼音节（ü 请写作 v，如 lv、nve）` });
  else if (HAN_WORD.test(entry.word) && syllables.length !== [...entry.word].length) context.addIssue({ code: "custom", path: ["pinyin"], message: `“${entry.word}”有 ${[...entry.word].length} 个字，但拼音有 ${syllables.length} 个音节` });
});
export type WordEntry = z.infer<typeof wordEntrySchema>;

const chars = (value: string) => [...value].length;
// Mirrors the backend's plainText: no control or format characters (tabs, newlines, zero-width, bidi), no line or paragraph separators and no replacement character, so a value stays one column of one line.
const PLAIN_TEXT = /^[^\p{Cc}\p{Cf}\u2028\u2029\uFFFD]*$/u;
const LOWERCASE_LETTERS = /^[a-z]+$/;

// One issue per entry, in the backend's order, so the first problem shown is the one the backend would report.
type Check = [field: string, failed: boolean, message: string];
const firstFailure = (checks: Check[], context: z.RefinementCtx) => {
  const failed = checks.find(([, fails]) => fails);
  if (failed) context.addIssue({ code: "custom", path: [failed[0]], message: failed[2] });
};

/** An English word: `word` is the lowercase key the user types, `display` the form the candidate shows (for example iphone → iPhone). */
export const englishEntrySchema = z.object({
  // Typing the key in capitals or with surrounding spaces is accepted and rewritten, as pinyin is; the backend itself only accepts a–z.
  word: z.string().transform(value => value.trim().toLowerCase()),
  display: z.string().transform(value => value.trim()),
}).superRefine((entry, context) => firstFailure([
  ["word", !entry.word, "请填写英文单词"],
  ["word", !LOWERCASE_LETTERS.test(entry.word), "单词是输入时键入的编码，只能包含英文字母 a–z，不能有数字、空格或符号"],
  ["word", entry.word.length > MAX_ENGLISH_WORD_LENGTH, `单词最多 ${MAX_ENGLISH_WORD_LENGTH} 个字母`],
  ["display", !entry.display, "请填写候选中显示的词形"],
  ["display", !PLAIN_TEXT.test(entry.display), "显示词形不能包含制表符、换行或其他控制字符"],
  ["display", chars(entry.display) > MAX_DISPLAY_LENGTH, `显示词形最多 ${MAX_DISPLAY_LENGTH} 个字符`],
], context));
export type EnglishEntry = z.infer<typeof englishEntrySchema>;

/** A candidate-window translation: `source` is the word looked up, `gloss` what is shown for it. */
export const translationEntrySchema = z.object({
  source: z.string().transform(value => value.trim()),
  gloss: z.string().transform(value => value.trim()),
}).superRefine((entry, context) => firstFailure([
  ["source", !entry.source, "请填写原词"],
  ["source", !PLAIN_TEXT.test(entry.source), "原词不能包含制表符、换行或其他控制字符"],
  ["source", entry.source.startsWith("#"), "原词不能以 # 开头"],
  ["source", chars(entry.source) > MAX_SOURCE_LENGTH, `原词最多 ${MAX_SOURCE_LENGTH} 个字符`],
  ["gloss", !entry.gloss, "请填写译文"],
  ["gloss", !PLAIN_TEXT.test(entry.gloss), "译文不能包含制表符、换行或其他控制字符"],
  ["gloss", chars(entry.gloss) > MAX_GLOSS_LENGTH, `译文最多 ${MAX_GLOSS_LENGTH} 个字符`],
], context));
export type TranslationEntry = z.infer<typeof translationEntrySchema>;

/** A source containing a Chinese character (U+3400 or above) is translated into English; any other source into Chinese. */
export const translationDirection = (source: string) => [...source].some(character => (character.codePointAt(0) ?? 0) >= 0x3400) ? "zh-en" : "en-zh";

const noteSchema = z.string().trim().max(MAX_NOTE_LENGTH, `备注最多 ${MAX_NOTE_LENGTH} 个字`).refine(value => !/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(value), "备注只能是一行文字").default("");

// Within one request the backend rejects a repeated pair (the first two columns); the same word with another reading, display or gloss is a different entry.
const submissionSchema = <T extends z.ZodType>(entry: T, pair: (entry: z.infer<T>) => [key: string, field: string, message: string]) => z.object({
  entries: z.array(entry).min(1, "请至少填写一个词条").max(MAX_ENTRIES, `每次最多提交 ${MAX_ENTRIES} 个词条`).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((item, index) => {
      const [key, field, message] = pair(item);
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index, field], message });
      seen.add(key);
    });
  }),
  note: noteSchema,
});

/** Request body of POST /v1/community/word-submissions for each kind, minus the kind and the Turnstile token. */
export const wordsSchema = submissionSchema(wordEntrySchema, entry => [`${entry.word}\t${entry.pinyin}`, "word", `“${entry.word}”重复填写了`]);
export const englishSchema = submissionSchema(englishEntrySchema, entry => [`${entry.word}\t${entry.display}`, "display", `“${entry.display}”重复填写了`]);
export const translationsSchema = submissionSchema(translationEntrySchema, entry => [`${entry.source}\t${entry.gloss}`, "gloss", `“${entry.source}”的这条翻译重复填写了`]);
export type WordsSubmission = z.infer<typeof wordsSchema>;
export const kindSchemas = { words: wordsSchema, english: englishSchema, translations: translationsSchema } as const;
export const kindEntrySchemas = { words: wordEntrySchema, english: englishEntrySchema, translations: translationEntrySchema } as const;

/** The JSON body to POST. `kind` is left out for words, its default, so the request stays valid for a backend that predates kinds (it rejects unknown fields). */
export function requestBody(kind: SubmissionKind, submission: { entries: unknown[]; note: string }, token: string) {
  return kind === "words" ? { entries: submission.entries, note: submission.note, token } : { kind, entries: submission.entries, note: submission.note, token };
}

/** The line the backend appends to the kind's file. The backend picks each word's weight (the base dictionary's median for its syllable count), so a word line is shown without its third column. */
export function formatLine(kind: "words", entry: WordEntry): string;
export function formatLine(kind: "english", entry: EnglishEntry): string;
export function formatLine(kind: "translations", entry: TranslationEntry): string;
export function formatLine(kind: SubmissionKind, entry: WordEntry | EnglishEntry | TranslationEntry): string;
export function formatLine(kind: SubmissionKind, entry: WordEntry | EnglishEntry | TranslationEntry) {
  if (kind === "english") { const { word, display } = entry as EnglishEntry; return `${word}\t${display}\t1`; }
  if (kind === "translations") { const { source, gloss } = entry as TranslationEntry; return `${source}\t${gloss}`; }
  const { word, pinyin } = entry as WordEntry;
  return `${word}\t${pinyin}`;
}

// Response shapes of the backend API.
export const wordsConfigSchema = z.object({ site_key: z.string(), enabled: z.boolean() });
// The backend writes to msime-dictionary (msime-cloud#58), the canonical name GitHub returns in html_url; ime-dictionary is only a redirect. msime-customdict, the archived previous target, stays accepted so a pull request created by a backend that has not yet been redeployed is never reported as unknown. Drop it once no deployment can still write there.
export const createdSchema = z.object({ pull_request_url: z.string().regex(/^https:\/\/github\.com\/metasequoiaime\/(?:msime-dictionary|msime-customdict)\/pull\/\d+$/) });
export const rejectedSchema = z.object({ error: z.string().optional(), code: z.string().optional(), rejected: z.array(z.object({ index: z.number().int().nonnegative(), code: z.string().optional(), reason: z.string() })).optional() });
export type Rejection = NonNullable<z.infer<typeof rejectedSchema>["rejected"]>[number];

// Per-entry rejection codes of the backend, by kind: the field the problem belongs to and the message shown next to it. Messages are written here rather than taken from the backend's reason so the page words every problem the same way its own checks do; the reason is only a fallback for a code this table does not know yet.
type RejectionMessage = { field: string; message: string | ((entry: Record<string, string>) => string) };
// The backend matches every column of an entry against the sensitive word list but does not say which column matched, so blocked_word is shown on the entry's first field and worded for the whole entry.
const BLOCKED_ENTRY_MESSAGE = "这个词条包含不允许提交的词语，请修改后再提交";
const listed = (field: string, message: string): RejectionMessage => ({ field, message: `${message}，无需重复提交` });
export const REJECTION_MESSAGES: Record<SubmissionKind, Record<string, RejectionMessage>> = {
  words: {
    word_required: { field: "word", message: "请填写词语" },
    invalid_word: { field: "word", message: "词语只能包含汉字，不能有字母、数字、标点或空格" },
    word_too_long: { field: "word", message: `词语最多 ${MAX_WORD_LENGTH} 个汉字` },
    pinyin_required: { field: "pinyin", message: "请填写拼音" },
    invalid_pinyin: { field: "pinyin", message: "拼音只能包含小写字母，音节之间用 ' 分隔，例如 wei'lai'ke'qi" },
    invalid_syllable: { field: "pinyin", message: "拼音中有无效的全拼音节（ü 请写作 v，如 lv、nve）" },
    syllable_count_mismatch: { field: "pinyin", message: entry => `“${entry.word}”的字数与拼音音节数不一致` },
    duplicate_entry: { field: "word", message: entry => `“${entry.word}”重复填写了` },
    already_listed: listed("word", "词库或待审核的提交中已有这个词条"),
    blocked_word: { field: "word", message: BLOCKED_ENTRY_MESSAGE },
  },
  english: {
    word_required: { field: "word", message: "请填写英文单词" },
    invalid_word: { field: "word", message: "单词是输入时键入的编码，只能包含小写英文字母 a–z，不能有大写、数字、空格或符号" },
    word_too_long: { field: "word", message: `单词最多 ${MAX_ENGLISH_WORD_LENGTH} 个字母` },
    display_required: { field: "display", message: "请填写候选中显示的词形" },
    invalid_display: { field: "display", message: "显示词形不能包含制表符、换行或其他控制字符" },
    display_too_long: { field: "display", message: `显示词形最多 ${MAX_DISPLAY_LENGTH} 个字符` },
    duplicate_entry: { field: "display", message: entry => `“${entry.display}”重复填写了` },
    already_listed: listed("display", "英文词库或待审核的提交中已有这个单词和显示词形"),
    blocked_word: { field: "word", message: BLOCKED_ENTRY_MESSAGE },
  },
  translations: {
    source_required: { field: "source", message: "请填写原词" },
    invalid_source: { field: "source", message: "原词不能以 # 开头，也不能包含制表符、换行或其他控制字符" },
    source_too_long: { field: "source", message: `原词最多 ${MAX_SOURCE_LENGTH} 个字符` },
    gloss_required: { field: "gloss", message: "请填写译文" },
    invalid_gloss: { field: "gloss", message: "译文不能包含制表符、换行或其他控制字符" },
    gloss_too_long: { field: "gloss", message: `译文最多 ${MAX_GLOSS_LENGTH} 个字符` },
    duplicate_entry: { field: "gloss", message: entry => `“${entry.source}”的这条翻译重复填写了` },
    already_listed: listed("gloss", "翻译表或待审核的提交中已有完全相同的翻译"),
    blocked_word: { field: "source", message: BLOCKED_ENTRY_MESSAGE },
  },
};

/** Field and message for one rejected entry; `entry` is what was submitted at that index. */
export function rejectionMessage(kind: SubmissionKind, rejection: Rejection, entry: Record<string, string> = {}) {
  const known = rejection.code ? REJECTION_MESSAGES[kind][rejection.code] : undefined;
  if (!known) return { field: KIND_FIELDS[kind][0] as string, message: rejection.reason || "这个词条未通过校验" };
  return { field: known.field, message: typeof known.message === "function" ? known.message(entry) : known.message };
}

export const KIND_UNAVAILABLE_MESSAGE = "提交服务暂不支持这一类型，请稍后再试，或先提交词语。";

// Top-level error codes of the backend. 503 covers several causes, and the code says which and whether anything was written.
export const ERROR_MESSAGES: Record<string, string> = {
  invalid_json: "请求格式不正确，请刷新页面后重试。",
  invalid_kind: KIND_UNAVAILABLE_MESSAGE,
  invalid_entry_count: `每次提交 1 到 ${MAX_ENTRIES} 个词条。`,
  invalid_note: "备注过长或格式不正确，请修改后再提交。",
  invalid_entries: "部分词条未通过校验，请修改后再提交。",
  token_required: "请先完成提交验证。",
  json_required: "请求格式不正确，请刷新页面后重试。",
  request_too_large: "提交的内容过长，请减少词条后再试。",
  origin_required: "请从官网表单提交。",
  verification_failed: "验证已失效，请重新验证后提交。",
  rate_limit_exceeded: "提交过于频繁，请稍后再试。",
  concurrent_update: "有其他人同时提交了词条，你的词条尚未写入。请重新验证后再次提交。",
  outcome_unknown: "暂时无法确认提交结果。请先查看词库仓库中最新的 Pull Request，确认词条未写入后再提交，避免重复。",
  word_submissions_disabled: "词条提交暂未开放，请稍后再试。",
  word_submissions_misconfigured: "词条提交暂未开放，请稍后再试。",
  verification_unavailable: "验证服务暂时不可用，词条尚未写入，请重新验证后再试。",
  rate_limit_unavailable: "提交服务暂时不可用，词条尚未写入，请稍后再试。",
  github_unavailable: "暂时无法读取词库仓库，词条尚未写入，请稍后再试。",
  // Sensitive word screening. A top-level blocked_word means the note matched; matching entries come back per entry instead (REJECTION_MESSAGES). blocked_content is what the community upload endpoints answer for the same check; word submissions do not send it today, but it gets the same wording rather than a generic failure if they ever do. None of these mean the service is down.
  blocked_word: "备注包含不允许提交的词语，请修改后再提交。",
  blocked_content: "内容包含不允许发布的词语，请修改后再提交。",
  screening_unavailable: "审核服务暂时不可用，词条尚未写入，请稍后重试。",
};

/** User-facing message for each documented error of the backend API: by code when the backend sends one, otherwise by status. */
export function submissionError(status: number, data: { error?: unknown; code?: unknown; uncertain?: unknown }, kind: SubmissionKind = "words") {
  const code = typeof data.code === "string" ? data.code : "";
  // A backend that predates kinds (before msime-cloud#61) rejects the unknown `kind` field as invalid_json rather than invalid_kind. Nothing is written either way; say the kind is not available yet instead of blaming the request.
  if (kind !== "words" && status === 400 && (code === "invalid_kind" || code === "invalid_json")) return KIND_UNAVAILABLE_MESSAGE;
  if (status === 502 || data.uncertain === true) return ERROR_MESSAGES.outcome_unknown;
  if (code in ERROR_MESSAGES) return ERROR_MESSAGES[code];
  const detail = typeof data.error === "string" && data.error ? data.error : "";
  if (status === 409) return ERROR_MESSAGES.concurrent_update;
  if (status === 429) return ERROR_MESSAGES.rate_limit_exceeded;
  if (status === 503) return detail || ERROR_MESSAGES.word_submissions_disabled;
  if (status === 400) return detail || ERROR_MESSAGES.invalid_entries;
  return detail || "提交失败，请稍后再试。";
}
