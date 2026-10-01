import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { LocaleLink } from "../locale-link";
import { COMMUNITY_SECTIONS, type CommunitySection } from "./sections";
import { Button, Card, SearchIcon, cx } from "../ui";
import { useLocale } from "../use-locale";

/*
 * Pieces the three community pages share: 社区皮肤 (/skins/), 词库 (/dictionaries/) and 插件 (/plugins/). They browse what the App's 社区 and 插件 pages offer, with the same tabs, search, chips, status cards and metrics, and the sub-navigation that joins them under the header's single 社区 entry.
 */

/** Links between the three community pages, under each page's lead. The header has one 社区 entry for all three, so this is where a visitor moves between them. */
export function CommunitySectionNav({ current }: { current: CommunitySection }) {
  const { t } = useLocale();
  return (
    <nav aria-label={t("社区栏目")} className="mt-6">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-panel-2 p-1">
        {COMMUNITY_SECTIONS.map(section => (
          <li key={section.to}>
            <LocaleLink
              to={section.to}
              aria-current={section.to === current ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-full px-4 text-[14.5px] font-semibold no-underline transition-colors duration-150",
                section.to === current ? "bg-panel text-ink shadow-tab hover:text-ink" : "text-muted hover:text-ink"
              )}
            >
              {t(section.label)}
            </LocaleLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The FAQ page's category chips: a filled chip for the selected one, outlined chips for the rest. */
export const chipClass = (selected: boolean) =>
  cx(
    "inline-flex h-8 cursor-pointer items-center rounded-full border-0 px-3 text-[13.5px] leading-none whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10",
    selected ? "bg-btn text-btn-fg" : "bg-transparent text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink"
  );

/** A row of filter chips with 全部 first; `undefined` is 全部. */
export function FilterChips<T extends string>({ legend, values, labels, selected, onSelect }: { legend: string; values: readonly T[]; labels: Record<T, string>; selected: T | undefined; onSelect: (value: T | undefined) => void }) {
  const { t } = useLocale();
  return (
    <fieldset className="m-0 mt-4 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t(legend)}</legend>
      {[undefined, ...values].map(value => (
        <button key={value ?? "all"} type="button" className={chipClass(selected === value)} aria-pressed={selected === value} onClick={() => onSelect(value)}>
          {t(value ? labels[value] : "全部")}
        </button>
      ))}
    </fieldset>
  );
}

export type CatalogTab<T extends string> = { value: T; label: string; caption: string; icon: ComponentType<{ size?: number; className?: string }> };

/** The segmented tabs at the top of a community list. `caption` says where the items come from or show up, and is each tab's accessible description; the label alone is its name. Arrow keys move between tabs. */
export function CatalogTabs<T extends string>({ baseId, label, tabs, selected, onSelect }: { baseId: string; label: string; tabs: readonly CatalogTab<T>[]; selected: T; onSelect: (value: T) => void }) {
  const { t } = useLocale();
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-field bg-panel-2 p-1 sm:inline-flex sm:w-auto sm:max-w-full sm:flex-wrap" role="tablist" aria-label={t(label)}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const id = catalogTabId(baseId, tab.value);
        return (
          <button
            key={tab.value}
            id={id}
            type="button"
            role="tab"
            aria-selected={selected === tab.value}
            aria-controls={catalogPanelId(baseId)}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-caption`}
            tabIndex={selected === tab.value ? 0 : -1}
            className={cx("flex min-h-[38px] min-w-0 cursor-pointer flex-col items-start justify-center rounded-[9px] border-0 px-3 py-1.5 text-left transition-[background-color,color,box-shadow] duration-150 sm:px-[18px]", selected === tab.value ? "bg-panel text-ink shadow-tab" : "bg-transparent text-muted hover:text-ink")}
            onClick={() => onSelect(tab.value)}
            onKeyDown={event => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].value;
              onSelect(next);
              document.getElementById(catalogTabId(baseId, next))?.focus();
            }}
          >
            {/* The icon sits on the title row so the caption below gets the tab's full width and stays on one line at 360px. */}
            <span className="flex items-start gap-1.5">
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span id={`${id}-label`} className="text-[14.5px] font-semibold leading-snug">{t(tab.label)}</span>
            </span>
            <span id={`${id}-caption`} className="text-xs leading-snug text-muted">{t(tab.caption)}</span>
          </button>
        );
      })}
    </div>
  );
}

export const catalogTabId = (baseId: string, value: string) => `${baseId}-tab-${value}`;
export const catalogPanelId = (baseId: string) => `${baseId}-panel`;

/** Waits this long after the last keystroke before searching, so typing a name sends one request instead of one per character. */
const SEARCH_DELAY_MS = 300;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** Cuts a pasted search to what the backend accepts, at a character boundary. */
const fitQuery = (value: string, maxBytes: number) => {
  let result = value;
  while (byteLength(result) > maxBytes) result = [...result].slice(0, -1).join("");
  return result;
};

/** The search box's text and the trimmed query it settles into after a pause, or at once on Enter. */
export function useCatalogSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);
  return { input, setInput, query, submit: () => setQuery(input.trim()) };
}

export function CatalogSearch({ id, label, maxBytes, search }: { id: string; label: string; maxBytes: number; search: ReturnType<typeof useCatalogSearch> }) {
  const { t } = useLocale();
  return (
    <form className="relative w-full sm:w-[320px]" onSubmit={event => { event.preventDefault(); search.submit(); }}>
      <label className="sr-only" htmlFor={id}>{t(label)}</label>
      <SearchIcon className="pointer-events-none absolute top-[13px] left-3.5 text-muted" />
      <input
        id={id}
        className="block h-11 w-full rounded-field border-0 bg-panel-2 pr-3.5 pl-[42px] font-[inherit] text-base text-ink placeholder:text-muted md:text-[15px] [&::-webkit-search-cancel-button]:cursor-pointer [&::-webkit-search-cancel-button]:grayscale"
        type="search"
        placeholder={t(label)}
        value={search.input}
        autoComplete="off"
        spellCheck={false}
        onChange={event => search.setInput(fitQuery(event.target.value, maxBytes))}
      />
    </form>
  );
}

export function StatusCard({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <Card tone="raised" className="grid min-h-[220px] place-items-center rounded-shell p-8 text-center text-sm leading-[1.8] text-muted" role="status" aria-busy={busy || undefined}>
      <div>{children}</div>
    </Card>
  );
}

/** The error card with a retry button. */
export function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useLocale();
  return (
    <StatusCard>
      <p className="m-0">{t(message)}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={retry}>{t("重试")}</Button>
    </StatusCard>
  );
}

/** The responsive card grid every community list uses. */
export const CARD_GRID = "m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 p-0";

/** 加载更多 and its failure notice under a paged list. */
export function LoadMore({ hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage }: { hasNextPage: boolean; isFetchingNextPage: boolean; isFetchNextPageError: boolean; fetchNextPage: () => unknown }) {
  const { t } = useLocale();
  return (
    <>
      {isFetchNextPageError && <p className="m-0 mt-4 text-center text-sm text-warn" role="alert">{t("加载更多失败，请稍后再试。")}</p>}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {t(isFetchingNextPage ? "正在加载…" : "加载更多")}
          </Button>
        </div>
      )}
    </>
  );
}

export const StaleNotice = () => {
  const { t } = useLocale();
  return <p className="m-0 mb-4 text-sm text-muted">{t("暂时无法更新，显示最近可用数据。")}</p>;
};

/** `communityRating` in the App's community-helpers.ts. */
const ratingText = (count: number, average: number) => (count === 0 ? "暂无评分" : `${average.toFixed(1)} 分`);

/** Downloads (skins, plugins) or saves (dictionaries, which the App counts as 收藏) and the rating, under a community card's description. */
export function Metrics({ downloads, saves, ratingCount, ratingAverage }: { downloads?: number; saves?: number; ratingCount: number; ratingAverage: number }) {
  const { t } = useLocale();
  const rating = ratingText(ratingCount, ratingAverage);
  return (
    <p className="m-0 mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted tabular-nums">
      {downloads !== undefined && (
        <span>
          <span aria-hidden="true">↓ {downloads.toLocaleString("en-US")}</span>
          <span className="sr-only">{t(`下载 ${downloads.toLocaleString("en-US")} 次`)}</span>
        </span>
      )}
      {saves !== undefined && <span>{t(`${saves.toLocaleString("en-US")} 人收藏`)}</span>}
      <span>
        <span aria-hidden="true">☆ {t(rating)}</span>
        <span className="sr-only">{t(ratingCount === 0 ? "暂无评分" : `评分 ${rating}，${ratingCount} 人评价`)}</span>
      </span>
    </p>
  );
}

/** A byte count as KB or MB, one decimal below ten. */
export function formatBytes(bytes: number) {
  const [value, unit] = bytes >= 1024 * 1024 ? [bytes / 1024 / 1024, "MB"] : [Math.max(bytes / 1024, 0.1), "KB"];
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

/** The empty-list message for the current search; `where` names the active filter, e.g. 「自然」分类中. */
export const emptyText = (noun: string, query: string, where = "") => (query ? `${where}没有名称包含「${query}」的${noun}。` : `${where}还没有公开的${noun}。`);

/** Shared card body: name, author line, description, metrics, and a footer for where to get the item. */
export function CatalogCard({ preview, badge, name, author, details, description, children, footer }: { preview?: ReactNode; badge?: ReactNode; name: string; author: string; details?: string; description: string; children?: ReactNode; footer: ReactNode }) {
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col overflow-hidden rounded-tile">
      {preview}
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-4">
        {badge && <div className="mb-2 flex flex-wrap gap-1.5">{badge}</div>}
        <h3 className="m-0 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
        <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
          {author}
          {details && ` · ${details}`}
        </p>
        {description && <p className="m-0 mt-2 line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]">{description}</p>}
        {children}
        <div className="m-0 mt-auto pt-3 text-[12.5px] leading-[1.7] text-muted">{footer}</div>
      </div>
    </Card>
  );
}

/** The footer of a community card: the item is only in the App, behind a sign-in. `where` names the App page, `app` the edition that has it. */
export function GetInApp({ where, app = "水杉输入法" }: { where: string; app?: string }) {
  const { t } = useLocale();
  return (
    <p className="m-0">
      {t("在")}
      <LocaleLink to="/download/">{t(app)}</LocaleLink>
      {t(`的${where}搜索名称获取`)}
    </p>
  );
}
