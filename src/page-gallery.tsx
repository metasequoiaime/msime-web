import { useLayoutEffect, useRef, useState } from "react";
import { CATEGORY_NAMES, GALLERY_CATEGORIES, GALLERY_ITEMS, GALLERY_SEASONS, imageUrl, SEASON_PORTRAITS, type GalleryItem } from "./gallery/data";
import { GalleryViewer } from "./gallery/viewer";
import { GalleryFilters } from "./gallery/filters";
import { usePageMeta } from "./page-meta";
import { ArrowRightIcon, Container, SearchIcon } from "./ui";
import { useLocale } from "./use-locale";
import { usePageSearch } from "./use-page-search";

export function GalleryPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, update } = usePageSearch();
  const category = choice("category", ["all", ...GALLERY_CATEGORIES], "all");
  const season = choice("season", ["all", ...GALLERY_SEASONS], "all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ items: readonly GalleryItem[]; index: number } | null>(null);
  const search = query.trim().normalize("NFKC").toLocaleLowerCase();
  const grid = useRef<HTMLUListElement>(null);
  const previousFilter = useRef({ category, season, search });
  useLayoutEffect(() => {
    const previous = previousFilter.current;
    previousFilter.current = { category, season, search };
    if ((previous.category === category && previous.season === season && previous.search === search) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations = Array.from(grid.current?.children ?? []).map((card, index) => card.animate([
      { opacity: 0, transform: "translateY(10px) scale(.985)" },
      { opacity: 1, transform: "none" },
    ], { duration: 280, delay: Math.min(index, 7) * 22, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" }));
    return () => { for (const animation of animations) animation.cancel(); };
  }, [category, season, search]);
  const seasonalItems = GALLERY_ITEMS.filter(item => season === "all" || item.season === season);
  const items = seasonalItems.filter(item => (category === "all" || item.category === category) && (!search || t(item.name).normalize("NFKC").toLocaleLowerCase().includes(search) || item.name.toLocaleLowerCase().includes(search)));
  const open = (item: GalleryItem, collection: readonly GalleryItem[]) => setPreview({ items: collection, index: collection.indexOf(item) });

  return <>
    <div className="page-hero" data-band="true">
      <Container className="page-enter grid items-center gap-10 pt-[clamp(40px,6vw,72px)] pb-[clamp(36px,5vw,56px)] md:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <p id="page-kicker" className="m-0 text-sm font-medium tracking-[.15em] text-accent-ink">MSIME GALLERY</p>
          <h1 id="page-title" className="mt-5 mb-5 font-heading text-[clamp(38px,5vw,62px)] leading-[1.25] font-bold tracking-tight text-ink">{t("你好，")}<br />{t("我是水杉娘。")}</h1>
          <p id="page-lead" className="m-0 max-w-[28em] text-[16.5px] leading-[1.9] text-body">{t("从键帽边的小小日常，到春夏秋冬的不同模样。这里收藏了水杉娘的姿势、表情、服装和场景。")}</p>
          <p className="mt-6 mb-0 text-xs text-muted">{t(`${GALLERY_ITEMS.length} 张插画 · 四季日常`)}</p>
          <a href="#collection" className="mt-8 inline-flex min-h-11 items-center gap-3 rounded-full bg-btn px-6 text-sm font-semibold text-btn-fg no-underline transition-opacity hover:opacity-85">{t("逛逛画廊")}<ArrowRightIcon size={16} /></a>
        </div>
        <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label={t("水杉娘的四季")}>
          {SEASON_PORTRAITS.map(({ label, caption, color, item }, index) => <button key={label} type="button" onClick={() => open(item, SEASON_PORTRAITS.map(season => season.item))} className="group relative cursor-zoom-in overflow-hidden rounded-tile bg-white p-0 text-left shadow-hair transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" aria-label={t(`查看大图：${item.name}`)}>
            <img src={imageUrl(item)} alt={t(`水杉娘 · ${item.name}`)} width={480} height={480} loading={index < 2 ? "eager" : "lazy"} decoding="async" className="block aspect-square w-full object-contain p-4 pb-7 transition-transform duration-300 motion-safe:group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-white/90 px-4 py-2.5 text-xs" style={{ color }}><span className="font-heading text-base font-bold">{t(label)}</span><span>{t(caption)}</span></span>
          </button>)}
        </section>
      </Container>
    </div>
    <main>
      <Container as="section" id="collection" className="scroll-mt-28 pt-[clamp(32px,5vw,56px)]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="m-0 text-xs font-medium tracking-[.14em] text-accent-ink">THE COLLECTION</p><h2 className="mt-2 mb-0 font-heading text-[26px] font-bold text-ink">{t("水杉娘的日常")}</h2></div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-full bg-panel px-4 text-muted shadow-hair sm:w-64 focus-within:outline-2 focus-within:outline-accent"><SearchIcon size={17} /><span className="sr-only">{t("搜索插画名称")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("找找表情、衣服或节日…")} className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted" /></label>
        </div>
        <GalleryFilters
          season={season}
          category={category}
          count={items.length}
          filtered={season !== "all" || category !== "all" || !!search}
          onSeasonChange={value => update({ season: value === "all" ? undefined : value, category: undefined }, false, false)}
          onCategoryChange={value => update({ category: value === "all" ? undefined : value }, false, false)}
          onReset={() => { setQuery(""); update({ category: undefined, season: undefined }, false, false); }}
        />
        {items.length ? <ul ref={grid} className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {items.map(item => <li key={item.path} className="min-w-0"><figure className="m-0 overflow-hidden rounded-tile bg-panel shadow-hair transition-shadow hover:shadow-card">
            <a href={imageUrl(item, 1536)} className="group block cursor-zoom-in overflow-hidden bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" aria-label={t(`查看大图：${item.name}`)} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(item, items); }}>
              <img src={imageUrl(item)} alt={t(`水杉娘 · ${item.name}`)} width={480} height={480} loading="lazy" decoding="async" className="block aspect-square w-full object-contain p-3 transition-transform duration-300 motion-safe:group-hover:scale-105" />
            </a>
            <figcaption className="flex items-center justify-between gap-2 px-3 py-3.5 sm:px-4"><span className="min-w-0 truncate text-sm font-medium text-ink">{t(item.name)}</span><span className="shrink-0 text-[11px] text-muted">{t(CATEGORY_NAMES[item.category])}</span></figcaption>
          </figure></li>)}
        </ul> : <div className="py-20 text-center"><p className="m-0 text-body">{t("没有符合筛选条件的插画，试试其他季节、分类或关键词。")}</p><button type="button" className="mt-4 min-h-11 cursor-pointer rounded-full bg-accent-soft px-5 text-sm text-accent-ink" onClick={() => { setQuery(""); update({ category: undefined, season: undefined }, false, false); }}>{t("查看全部插画")}</button></div>}
        <p className="mt-8 mb-0 text-center text-xs leading-7 text-muted">{t("点击插画可以放大欣赏。更多水杉娘的故事，慢慢收集中。")}</p>
      </Container>
    </main>
    {preview && <GalleryViewer items={preview.items} initialIndex={preview.index} onClose={() => setPreview(null)} />}
  </>;
}
