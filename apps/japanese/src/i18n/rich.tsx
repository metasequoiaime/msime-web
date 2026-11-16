import { Fragment, type ReactNode } from "react";
import { LocaleLink } from "../locale-link";

// `code` spans and [label](href) links; nothing else is interpreted.
const TOKEN = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

const linkClass = "font-medium text-accent-ink underline decoration-accent-ring underline-offset-[3px] hover:text-ink";

/** Renders a `Rich` message string. Internal links (`/download/`) get the current locale's prefix and go through the router; external ones open in a new tab. */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [, code, label, href] = match;
    if (code !== undefined) parts.push(<code key={index} className="rounded-[6px] bg-panel-2 px-1.5 py-0.5 font-code text-[0.88em] text-ink [overflow-wrap:anywhere]">{code}</code>);
    else if (href.startsWith("/"))
      parts.push(
        <LocaleLink key={index} to={href} className={linkClass}>
          {label}
        </LocaleLink>
      );
    else
      parts.push(
        <a key={index} href={href} className={linkClass} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
