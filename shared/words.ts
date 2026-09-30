import { z } from "zod";
import { PINYIN_SYLLABLES } from "./pinyin-syllables.ts";

// Public origin of MSIME-Backend, which owns the submission API, Turnstile verification, rate limiting and the GitHub App. Not a secret; the CSP connect-src in public/_headers must list the same origin.
export const BACKEND_ORIGIN = "https://api.msime.app";
export const WORD_SUBMISSIONS_URL = `${BACKEND_ORIGIN}/v1/community/word-submissions`;
export const WORDS_REPO_URL = "https://github.com/metasequoiaime/msime-dictionary";
// Community entries all use one fixed weight chosen by the backend; users do not choose it. Shown only in the preview.
export const WORD_WEIGHT = 5000;
export const MAX_ENTRIES = 20;
export const MAX_WORD_LENGTH = 16;
export const MAX_NOTE_LENGTH = 200;

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

export const wordEntrySchema = z.object({
  word: z.string().trim()
    .min(1, "请填写词语")
    .refine(value => [...value].length <= MAX_WORD_LENGTH, `词语最多 ${MAX_WORD_LENGTH} 个汉字`)
    .refine(value => HAN_WORD.test(value), "词语只能包含汉字，不能有字母、数字、标点或空格"),
  pinyin: z.string().max(200, "拼音过长").transform(normalizePinyin)
    .pipe(z.string().min(1, "请填写拼音").regex(QUANPIN, "拼音只能包含小写字母，音节之间用 ' 分隔，例如 wei'lai'ke'qi")),
}).superRefine((entry, context) => {
  const syllables = entry.pinyin.split("'");
  const invalid = syllables.find(syllable => !PINYIN_SYLLABLES.has(syllable));
  if (invalid) context.addIssue({ code: "custom", path: ["pinyin"], message: `“${invalid}”不是有效的全拼音节（ü 请写作 v，如 lv、nve）` });
  else if (HAN_WORD.test(entry.word) && syllables.length !== [...entry.word].length) context.addIssue({ code: "custom", path: ["pinyin"], message: `“${entry.word}”有 ${[...entry.word].length} 个字，但拼音有 ${syllables.length} 个音节` });
});
export type WordEntry = z.infer<typeof wordEntrySchema>;

/** Request body of POST /v1/community/word-submissions, minus the Turnstile token. */
export const wordsSchema = z.object({
  entries: z.array(wordEntrySchema).min(1, "请至少填写一个词条").max(MAX_ENTRIES, `每次最多提交 ${MAX_ENTRIES} 个词条`).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      const key = `${entry.word}\t${entry.pinyin}`;
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index, "word"], message: `“${entry.word}”重复填写了` });
      seen.add(key);
    });
  }),
  note: z.string().trim().max(MAX_NOTE_LENGTH, `备注最多 ${MAX_NOTE_LENGTH} 个字`).refine(value => !/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(value), "备注只能是一行文字").default(""),
});
export type WordsSubmission = z.infer<typeof wordsSchema>;

export const formatLine = (entry: WordEntry) => `${entry.word}\t${entry.pinyin}\t${WORD_WEIGHT}`;

// Response shapes of the backend API.
export const wordsConfigSchema = z.object({ site_key: z.string(), enabled: z.boolean() });
// The backend writes to custom/words.txt in msime-dictionary (msime-cloud#58), the canonical name GitHub returns in html_url; ime-dictionary is only a redirect. msime-customdict, the archived previous target, stays accepted so a pull request created by a backend that has not yet been redeployed is never reported as unknown. Drop it once no deployment can still write there.
export const createdSchema = z.object({ pull_request_url: z.string().regex(/^https:\/\/github\.com\/metasequoiaime\/(?:msime-dictionary|msime-customdict)\/pull\/\d+$/) });
export const rejectedSchema = z.object({ error: z.string().optional(), rejected: z.array(z.object({ index: z.number().int().nonnegative(), reason: z.string() })).optional() });

/** User-facing message for each documented error status of the backend API. */
export function submissionError(status: number, data: { error?: unknown; uncertain?: unknown }) {
  const detail = typeof data.error === "string" && data.error ? data.error : "";
  if (status === 409) return "有其他人同时提交了词条，你的词条尚未写入。请重新验证后再次提交。";
  if (status === 429) return "提交过于频繁，请稍后再试。";
  if (status === 502 || data.uncertain === true) return "暂时无法确认提交结果。请先查看词库仓库中最新的 Pull Request，确认词条未写入后再提交，避免重复。";
  if (status === 503) return "词条提交暂未开放，请稍后再试。";
  if (status === 400) return detail || "部分词条未通过校验，请修改后再提交。";
  return detail || "提交失败，请稍后再试。";
}
