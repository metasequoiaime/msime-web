import { useLocale } from "./use-locale";
import type { TocEntry } from "./toc";

type TocNavProps = {
  entries: TocEntry[];
  activeId: string | null;
  tocRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
  onNavigateNarrow?: () => void;
};

/** 侧栏里的小节索引。文档页和内容页共用，站内同一个东西只有一种样子。 */
export function TocNav({ entries, activeId, tocRef, onSelect, onNavigateNarrow }: TocNavProps) {
  const { t } = useLocale();
  return (
    <nav className="docs-toc" id="docs-toc" ref={tocRef as React.RefObject<HTMLElement>}>
      {t(entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          className={`${entry.isSubItem ? "docs-toc-sub" : ""}${entry.id === activeId ? " is-active" : ""}`.trim()}
          aria-current={entry.id === activeId ? "location" : undefined}
          onClick={() => {
            onSelect(entry.id);
            // Below --breakpoint-2xl (60rem) the index is a disclosure above the content (styles/shell.css); close it once a section is picked.
            if (window.matchMedia("(width < 60rem)").matches) onNavigateNarrow?.();
          }}
        >
          {t(entry.text)}
        </a>
      )))}
    </nav>
  );
}
