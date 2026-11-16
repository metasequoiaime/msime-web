import { SEASON_OPTIONS } from "../season";
import { CloseIcon, cx } from "../ui";
import { useLocale } from "../use-locale";
import { CATEGORY_NAMES, GALLERY_CATEGORIES, GALLERY_SEASON_NAMES, GALLERY_SEASONS, type GalleryCategory, type GallerySeason } from "./data";

const PALETTE_LABELS: Record<GallerySeason, string> = { spring: "嫩绿", summer: "翠绿", autumn: "赭红", winter: "霜白" };
const focus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

type GalleryFiltersProps = {
  season: GallerySeason | "all";
  category: GalleryCategory | "all";
  count: number;
  filtered: boolean;
  onSeasonChange: (value: GallerySeason | "all") => void;
  onCategoryChange: (value: GalleryCategory | "all") => void;
  onReset: () => void;
};

export function GalleryFilters({ season, category, count, filtered, onSeasonChange, onCategoryChange, onReset }: GalleryFiltersProps) {
  const { t } = useLocale();
  return <div className="mt-7">
    <div className="overflow-hidden rounded-[16px] bg-panel/80 shadow-hair">
      <fieldset className="m-0 min-w-0 border-0 px-3 pt-1 sm:px-5">
        <legend className="sr-only">{t("季节")}</legend>
        <div className="grid grid-cols-5 gap-1 border-b border-hair sm:flex sm:gap-5">
          {(["all", ...GALLERY_SEASONS] as const).map(value => {
            const active = season === value;
            const color = value === "all" ? "var(--accent)" : SEASON_OPTIONS[value].dot;
            return <button key={value} type="button" aria-label={t(value === "all" ? "全部季节" : GALLERY_SEASON_NAMES[value])} aria-pressed={active} onClick={() => onSeasonChange(value)} className={cx("group relative flex min-h-[54px] min-w-0 cursor-pointer items-center justify-center gap-2 border-0 bg-transparent px-1 text-sm transition-colors sm:min-h-[58px] sm:px-2", focus, active ? "font-semibold text-ink" : "text-muted hover:text-ink")}>
              {value === "all" ? <span aria-hidden="true" className="grid size-3 shrink-0 grid-cols-2 gap-0.5">{GALLERY_SEASONS.map(value => <span key={value} className="rounded-[1px]" style={{ backgroundColor: SEASON_OPTIONS[value].dot }} />)}</span> : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
              <span>{t(value === "all" ? "全部" : GALLERY_SEASON_NAMES[value])}</span>
              {value !== "all" && <span aria-hidden="true" className="hidden text-xs font-normal text-muted sm:inline">{t(PALETTE_LABELS[value])}</span>}
              <span aria-hidden="true" className={cx("absolute inset-x-1 bottom-0 h-0.5 rounded-full transition-[transform,opacity] duration-200 sm:inset-x-2", active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0 group-hover:opacity-30")} style={{ backgroundColor: color }} />
            </button>;
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-4 px-3 py-2 sm:px-5">
        <span aria-hidden="true" className="hidden shrink-0 text-xs text-muted sm:block">{t("分类")}</span>
        <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
          <legend className="sr-only">{t("插画分类")}</legend>
          <div className="flex gap-1">
            {(["all", ...GALLERY_CATEGORIES] as const).map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => onCategoryChange(value)} className={cx("min-h-11 min-w-0 flex-1 cursor-pointer rounded-[7px] border-0 px-1.5 text-[13px] transition-colors sm:min-h-9 sm:flex-none sm:px-3.5", focus, category === value ? "bg-accent-soft font-semibold text-accent-ink" : "bg-transparent text-muted hover:bg-panel-2 hover:text-ink")}>
              {t(value === "all" ? "全部" : CATEGORY_NAMES[value])}
            </button>)}
          </div>
        </fieldset>
      </div>
    </div>
    <div className="mt-2 flex min-h-10 items-center justify-between gap-3 px-1">
      <p className="m-0 text-xs text-muted" role="status"><span className="mr-1.5 font-mono font-medium text-body">{count}</span>{t("张插画")}</p>
      {filtered && <button type="button" onClick={onReset} className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-row border-0 bg-transparent px-2 text-xs text-muted transition-colors hover:bg-panel-2 hover:text-ink">{t("重置筛选")}<CloseIcon size={12} /></button>}
    </div>
  </div>;
}
