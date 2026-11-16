import { useId } from "react";
import type { TocEntry } from "../toc";
import { useLocale } from "../use-locale";
import { ChevronDownIcon, cx } from "../ui";

type TocSelectProps = {
  entries: TocEntry[];
  activeId: string | null;
  /** Called with the chosen section before scrolling, so the scroll spy holds the selection until the smooth scroll settles. */
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * The guide's section index below 960px (design-home §5.2): a native `<select>` at the top of the content panel, where the sidebar would push the article a full screen down. Sub-sections are indented with a full-width space, the same way the design marks them.
 *
 * It follows the scroll spy, so it always names the section being read.
 */
export function TocSelect({ entries, activeId, onSelect, className }: TocSelectProps) {
  const { t } = useLocale();
  const id = useId();
  if (entries.length === 0) return null;

  return (
    <div className={cx("relative", className)}>
      <label className="sr-only" htmlFor={id}>
        {t("跳转到小节")}
      </label>
      <select
        id={id}
        className="block h-11 w-full cursor-pointer appearance-none truncate rounded-field border-0 bg-panel-2 pr-10 pl-3 font-[inherit] text-base text-ink md:text-[14.5px]"
        value={activeId ?? entries[0].id}
        onChange={(event) => {
          const target = document.getElementById(event.target.value);
          if (!target) return;
          onSelect(target.id);
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }}
      >
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {`${entry.isSubItem ? "　" : ""}${t(entry.text)}`}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
