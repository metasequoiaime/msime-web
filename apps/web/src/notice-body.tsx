import { useMemo } from "react";
import { renderNoticeBody } from "./notice-markdown";

/** Loaded on demand by the notice banner, so markdown-it stays out of the entry chunk on the many visits with no notice to show. */
export function NoticeBody({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => ({ __html: renderNoticeBody(source) }), [source]);
  // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it renders with raw HTML disabled and refuses unsafe link schemes (src/notice-markdown.ts).
  return <div className={className} dangerouslySetInnerHTML={html} />;
}
