/** One line of a release body as the release list shows it: headings stand alone, everything else gets a bullet. */
export type NoteLine = { heading: boolean; text: string };

/** Markdown inline syntax reduced to its visible text. The result is rendered as a React text node, never as HTML. */
const inlineText = (line: string) =>
  line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const TABLE_DIVIDER = /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?$/;

/** Section titles that only wrap the whole body ("## 更新内容"); the card already says what the notes are. */
const WRAPPER_HEADINGS = new Set(["更新内容", "更新日志", "更新说明", "what's changed", "changelog", "release notes"]);

/** A heading the card already shows: one naming this version ("# 水杉输入法 v0.9.3") or a wrapper around the whole body. */
const repeatsCard = (text: string, version: string) => text.includes(version) || WRAPPER_HEADINGS.has(text.toLowerCase());

/**
 * Release notes as short lines (design-home §7): fenced code, rules, table dividers and images are dropped; list markers, quote markers and inline markup are stripped; table rows become "cell · cell". A line that is bold and nothing else ("**皮肤**") is a heading, and headings that repeat the card's title for `version` are dropped. The body comes from `/api/releases`, which already removed HTML comments and capped it at 8 KiB.
 */
export function noteLines(body: string, version: string): NoteLine[] {
  const lines: NoteLine[] = [];
  let fence: string | null = null;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const marker = /^(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker && (fence === null || marker[0] === fence[0])) {
      fence = fence === null ? marker : null;
      continue;
    }
    if (fence !== null || !line) continue;
    if (/^([-=*_])(?:\s*\1){2,}$/.test(line) || TABLE_DIVIDER.test(line)) continue;
    const heading = /^#{1,6}\s/.test(line) || /^(\*\*|__)[^*_]+\1$/.test(line);
    let content = line.replace(/^#{1,6}\s+/, "").replace(/^(?:>\s?)+/, "").replace(/^(?:[-*+]|\d+[.)])\s+/, "").replace(/^\[[ xX]\]\s+/, "");
    if (content.startsWith("|")) content = content.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()).filter(Boolean).join(" · ");
    const text = inlineText(content.replace(/\s#+$/, ""));
    if (text && !(heading && repeatsCard(text, version))) lines.push({ heading, text });
  }
  return lines;
}

/** `YYYY-MM-DD` in the visitor's time zone. Only called on the client: release data is never part of the prerendered page. */
export function releaseDate(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
