import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { useEffect, useId, useState, type ComponentType, type ReactNode } from "react";
import { Button, Card, SearchIcon, cx } from "../ui";
import { useLocale } from "../use-locale";

/*
 * The building blocks the community galleries (社区皮肤, 词库, 插件) and the 我的 page share, so every list on the site has the same tabs, search box, status card, grid and 加载更多.
 */

/** The FAQ page's category chips: a filled chip for the selected one, outlined chips for the rest. */
export const chipClass = (selected: boolean) =>
  cx(
    "inline-flex h-8 cursor-pointer items-center rounded-full border-0 px-3 text-[13.5px] leading-none whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10",
    selected ? "bg-btn text-btn-fg" : "bg-transparent text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink"
  );

/** A row of chips that narrows a list: one value or 全部. */
export function Chips<T extends string>({ legend, values, labels, value, onChange, all = "全部" }: { legend: string; values: readonly T[]; labels: Record<T, string>; value: T | undefined; onChange: (value: T | undefined) => void; all?: string | null }) {
  const { t } = useLocale();
  const options: (T | undefined)[] = all === null ? [...values] : [undefined, ...values];
  return (
    <fieldset className="m-0 mt-4 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t(legend)}</legend>
      {options.map(option => (
        <button key={option ?? "all"} type="button" className={chipClass(value === option)} aria-pressed={value === option} onClick={() => onChange(option)}>
          {t(option ? labels[option] : all ?? "")}
        </button>
      ))}
    </fieldset>
  );
}

/** The id of one tab of a `SegmentedTabs`, for the panel's `aria-labelledby`. */
export const tabId = (panelId: string, value: string) => `${panelId}-tab-${value}`;

/** An icon component from ../ui, drawn before a captioned tab's title. */
type TabIcon = ComponentType<{ size?: number; className?: string }>;

/** The segmented control at the top of a gallery (键盘皮肤 / 候选窗皮肤), with the arrow keys moving between tabs. `panelId` is the `tabpanel` it controls, which should be labelled by `tabId(panelId, value)`. */
export function SegmentedTabs<T extends string>({ label, values, labels, captions, icons, value, onChange, panelId, size = "md" }: { label: string; values: readonly T[]; labels: Record<T, string>; captions?: Record<T, string>; icons?: Record<T, TabIcon>; value: T; onChange: (value: T) => void; panelId: string; size?: "md" | "sm" }) {
  const { t } = useLocale();
  // A caption says where each kind shows up (社区皮肤: 手机键盘、屏幕键盘 / 电脑打字时的候选框). Captioned tabs fill the width in two columns on a phone so the caption stays on one line at 360px.
  const captioned = captions !== undefined;
  return (
    <div className={captioned ? "grid w-full grid-cols-2 gap-1 rounded-field bg-panel-2 p-1 sm:inline-flex sm:w-auto sm:max-w-full sm:flex-wrap" : "inline-flex max-w-full flex-wrap gap-1 rounded-field bg-panel-2 p-1"} role="tablist" aria-label={t(label)}>
      {values.map(item => {
        const Icon = icons?.[item];
        const id = tabId(panelId, item);
        return (
        <button
          key={item}
          id={id}
          type="button"
          role="tab"
          aria-selected={value === item}
          aria-controls={panelId}
          aria-labelledby={captioned ? `${id}-label` : undefined}
          aria-describedby={captioned ? `${id}-caption` : undefined}
          tabIndex={value === item ? 0 : -1}
          className={cx(
            "cursor-pointer rounded-[9px] border-0 transition-[background-color,color,box-shadow] duration-150",
            captioned ? "flex min-h-[38px] min-w-0 flex-col items-start justify-center px-3 py-1.5 text-left sm:px-[18px]" : "inline-flex items-center font-semibold",
            captioned ? "" : size === "md" ? "min-h-[38px] px-[18px] py-1.5 text-[14.5px]" : "min-h-8 px-3.5 py-1 text-[13.5px]",
            value === item ? "bg-panel text-ink shadow-tab" : "bg-transparent text-muted hover:text-ink"
          )}
          onClick={() => onChange(item)}
          onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const step = event.key === "ArrowRight" ? 1 : values.length - 1;
            const next = values[(values.indexOf(item) + step) % values.length];
            onChange(next);
            document.getElementById(tabId(panelId, next))?.focus();
          }}
        >
          {captioned ? (
            <>
              {/* The icon sits on the title row so the caption below gets the tab's full width. */}
              <span className="flex items-start gap-1.5">
                {Icon && <Icon size={16} className="mt-0.5 shrink-0" />}
                <span id={`${id}-label`} className="text-[14.5px] font-semibold leading-snug">{t(labels[item])}</span>
              </span>
              <span id={`${id}-caption`} className="text-xs leading-snug text-muted">{t(captions[item])}</span>
            </>
          ) : (
            t(labels[item])
          )}
        </button>
        );
      })}
    </div>
  );
}

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** Cuts a pasted search to what the backend accepts, at a character boundary. */
export const fitBytes = (value: string, max: number) => {
  let result = value;
  while (byteLength(result) > max) result = [...result].slice(0, -1).join("");
  return result;
};

/** Waits this long after the last keystroke before searching, so typing a name sends one request instead of one per character. */
const SEARCH_DELAY_MS = 300;

/** The search field and its debounced, trimmed value. */
export function useSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);
  return { input, setInput, query, submit: () => setQuery(input.trim()) };
}

export function SearchBox({ label, maxBytes, search, className }: { label: string; maxBytes: number; search: ReturnType<typeof useSearch>; className?: string }) {
  const { t } = useLocale();
  const id = useId();
  return (
    <form className={cx("relative w-full sm:w-[320px]", className)} onSubmit={event => { event.preventDefault(); search.submit(); }}>
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
        onChange={event => search.setInput(fitBytes(event.target.value, maxBytes))}
      />
    </form>
  );
}

export function StatusCard({ children, busy = false, compact = false }: { children: ReactNode; busy?: boolean; compact?: boolean }) {
  return (
    <Card tone="raised" className={cx("grid place-items-center rounded-shell p-8 text-center text-sm leading-[1.8] text-muted", compact ? "min-h-[140px]" : "min-h-[220px]")} role="status" aria-busy={busy || undefined}>
      <div>{children}</div>
    </Card>
  );
}

/** The grid every gallery uses: as many 260px-or-wider cards as fit. */
export const cardGridClass = "m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 p-0";

type Pages<T> = UseInfiniteQueryResult<InfiniteData<{ items: T[]; nextOffset: number | null; stale?: boolean }>>;

/**
 * Pending, error and empty states around a paged list, then the items and 加载更多. `noun` names what is listed in the messages (键盘皮肤, 词库…).
 */
export function PagedList<T>({ query, noun, empty, compact = false, children }: { query: Pages<T>; noun: string; empty: string; compact?: boolean; children: (items: T[]) => ReactNode }) {
  const { t } = useLocale();
  if (query.isPending) return <StatusCard busy compact={compact}>{t(`正在读取${noun}…`)}</StatusCard>;
  if (query.isError)
    return (
      <StatusCard compact={compact}>
        <p className="m-0">{t(`暂时无法读取${noun}，请稍后再试。`)}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void query.refetch()}>{t("重试")}</Button>
      </StatusCard>
    );
  const items = query.data.pages.flatMap(page => page.items);
  const stale = query.data.pages.some(page => page.stale);
  if (items.length === 0) return <StatusCard compact={compact}>{t(empty)}</StatusCard>;
  return (
    <>
      {stale && <p className="m-0 mb-4 text-sm text-muted">{t("暂时无法更新，显示最近可用数据。")}</p>}
      {children(items)}
      {query.isFetchNextPageError && <p className="m-0 mt-4 text-center text-sm text-warn" role="alert">{t("加载更多失败，请稍后再试。")}</p>}
      {query.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {t(query.isFetchingNextPage ? "正在加载…" : "加载更多")}
          </Button>
        </div>
      )}
    </>
  );
}

export function Downloads({ downloads }: { downloads: number }) {
  const { t } = useLocale();
  return (
    <p className="m-0 mt-2 text-[13px] text-muted tabular-nums">
      <span aria-hidden="true">↓ {downloads.toLocaleString("en-US")}</span>
      <span className="sr-only">{t(`下载 ${downloads.toLocaleString("en-US")} 次`)}</span>
    </p>
  );
}
