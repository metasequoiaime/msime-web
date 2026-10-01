import { LocaleLink } from "./locale-link";
import { cx } from "./ui";
import { useLocale } from "./use-locale";

/** One page of a header entry that stands for several pages. `to` is the page's locale-free address. */
export type Section = { readonly to: "/skins/" | "/dictionaries/" | "/plugins/" | "/feedback/" | "/words/"; readonly label: string };

/** Pages that share one header entry: `label` names the switcher for screen readers, and must read correctly after the Traditional conversion too. */
export type SectionGroup = { readonly label: string; readonly sections: readonly Section[] };

/** Whether a locale-free path is one of a group's pages, so the site shell can mark the group's header entry current. */
export const inSectionGroup = (group: SectionGroup, path: string) => group.sections.some((section) => path.startsWith(section.to));

/** Switches between the pages behind one header entry (社区: 皮肤, 词库, 插件; 反馈: Bug 与需求, 词库缺失), under each page's hero, since the header links only to the first of them. It is an underlined strip across the content width rather than another segmented control, so it reads as page navigation and not as one more filter above the page's own tabs. The segments are ordinary links in the tab order, and the current one carries `aria-current="page"`. */
export function SectionNav<G extends SectionGroup>({ group, current }: { group: G; current: G["sections"][number]["to"] }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto w-full max-w-inner px-[clamp(20px,4.4vw,48px)] pt-8">
      <nav aria-label={t(group.label)} className="flex gap-7 shadow-divider-b">
        {group.sections.map((section) => {
          const selected = section.to === current;
          return (
            <LocaleLink
              key={section.to}
              to={section.to}
              aria-current={selected ? "page" : undefined}
              className={cx(
                "inline-flex h-11 items-center text-[15.5px] leading-none whitespace-nowrap no-underline transition-[color,box-shadow] duration-150",
                selected ? "font-bold text-ink shadow-[inset_0_-2px_0_var(--accent)] hover:text-ink" : "font-semibold text-muted hover:text-ink"
              )}
            >
              {t(section.label)}
            </LocaleLink>
          );
        })}
      </nav>
    </div>
  );
}
