import type { ReactNode } from "react";
import { LocaleLink } from "./locale-link";
import { tokenize } from "./rich-text.ts";

const linkClass = "font-medium text-accent-ink underline decoration-accent-ring underline-offset-[3px] hover:decoration-accent";

/** Renders one message with its inline marks. Internal links ("/…") navigate within the site in the current locale; others open in a new tab. */
export function Rich({ text }: { text: string }) {
  // Keys are the token's position in the message: stable for a given text, and unique because tokens never overlap.
  let offset = 0;
  const nodes: ReactNode[] = tokenize(text).map((token) => {
    const key = `${token.kind}:${offset}`;
    offset += token.value.length + (token.kind === "link" ? token.href.length + 4 : token.kind === "code" ? 2 : 0);
    if (token.kind === "code") return <code key={key} className="inline-code">{token.value}</code>;
    if (token.kind === "text") return token.value;
    if (token.href.startsWith("/")) {
      const [path, hash] = token.href.split("#");
      return (
        <LocaleLink key={key} className={linkClass} to={path as "/"} hash={hash}>
          {token.value}
        </LocaleLink>
      );
    }
    return (
      <a key={key} className={linkClass} href={token.href} target="_blank" rel="noreferrer">
        {token.value}
      </a>
    );
  });
  return <>{nodes}</>;
}
