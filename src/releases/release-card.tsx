import { useId, useMemo, useState } from "react";
import type { ReleaseItem } from "../data/schemas";
import { PLATFORM_NAMES } from "../data/platforms";
import { useLocale } from "../use-locale";
import { ExternalIcon, Pill, cx } from "../ui";
import { noteLines, releaseDate } from "./notes";

/** Lines shown before the "展开全部" toggle. */
const COLLAPSED_LINES = 5;

/** One release in the list (design-home §7): platform, prerelease flag, version and date on the left; title and notes on the right. Stacks into one column below 640px. */
export function ReleaseCard({ release }: { release: ReleaseItem }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const notesId = useId();
  const lines = useMemo(() => noteLines(release.body), [release.body]);
  const collapsible = lines.length > COLLAPSED_LINES;
  const shown = useMemo(() => {
    if (open || !collapsible) return lines;
    const head = lines.slice(0, COLLAPSED_LINES);
    // A heading as the last visible line would announce a section whose items are all hidden, so the collapsed view stops before it.
    while (head.length > 1 && head[head.length - 1].heading) head.pop();
    return head;
  }, [lines, open, collapsible]);

  return (
    <article className="grid grid-cols-1 gap-[clamp(12px,3vw,32px)] py-[26px] shadow-divider-t-2 md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-accent-soft px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-accent-ink">{PLATFORM_NAMES[release.platform]}</span>
          {release.prerelease && <Pill tone="warn">{t("预发布")}</Pill>}
        </div>
        <p className="m-0 mt-2.5 font-mono text-[15px] font-medium break-all text-ink">{release.version}</p>
        <p className="m-0 mt-1 text-[13px] text-muted">
          <time dateTime={release.publishedAt}>{releaseDate(release.publishedAt)}</time>
        </p>
      </div>
      <div className="min-w-0">
        <h2 className="m-0 font-sans text-lg leading-normal font-bold [overflow-wrap:anywhere] text-ink">{release.title}</h2>
        {shown.length > 0 && (
          <ul id={notesId} className="m-0 list-none p-0">
            {shown.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: note lines have no identity of their own and the list only grows or shrinks at the end
              <li key={index} className="mt-2 flex gap-2.5 text-[14.5px] leading-[1.8] text-body">
                <span className={cx("mt-[11px] size-[5px] flex-none rounded-full", line.heading ? "bg-transparent" : "bg-accent")} aria-hidden="true" />
                <span className={cx("min-w-0 [overflow-wrap:anywhere]", line.heading && "font-semibold text-ink")}>{line.text}</span>
              </li>
            ))}
          </ul>
        )}
        {(open || !collapsible) && release.truncated && <p className="m-0 mt-2 text-[13.5px] text-muted">{t("这份说明较长，完整内容请在 GitHub 查看。")}</p>}
        <div className="mt-3.5 flex flex-wrap items-center gap-4 text-sm">
          {collapsible && (
            <button
              type="button"
              className="border-0 bg-transparent p-0 text-sm text-accent-ink hover:text-ink"
              aria-expanded={open}
              aria-controls={notesId}
              onClick={() => setOpen(value => !value)}
            >
              {open ? t("收起") : t(`展开全部 ${lines.length} 条`)}
            </button>
          )}
          <a className="inline-flex items-center gap-1" href={release.url} target="_blank" rel="noreferrer">
            {t("在 GitHub 查看")}
            <ExternalIcon size={13} />
          </a>
        </div>
      </div>
    </article>
  );
}
