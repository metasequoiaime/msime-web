export type Token = { kind: "text"; value: string } | { kind: "code"; value: string } | { kind: "link"; value: string; href: string };

/** Splits a message into plain text, `code` spans and [text](url) links. Unclosed marks stay literal text. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  let index = 0;
  const flush = () => {
    if (text) tokens.push({ kind: "text", value: text });
    text = "";
  };
  while (index < source.length) {
    const char = source[index];
    if (char === "`") {
      const end = source.indexOf("`", index + 1);
      if (end > index) {
        flush();
        tokens.push({ kind: "code", value: source.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    } else if (char === "[") {
      const middle = source.indexOf("](", index + 1);
      const end = middle > index ? source.indexOf(")", middle + 2) : -1;
      if (middle > index && end > middle) {
        flush();
        tokens.push({ kind: "link", value: source.slice(index + 1, middle), href: source.slice(middle + 2, end) });
        index = end + 1;
        continue;
      }
    }
    text += char;
    index += 1;
  }
  flush();
  return tokens;
}
