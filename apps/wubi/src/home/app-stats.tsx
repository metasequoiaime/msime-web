import { useAppStatsQuery } from "../data/queries";
import type { AppStats } from "../data/schemas";
import { LocaleLink } from "../locale-link";
import { useLocale } from "../use-locale";
import { Card } from "../ui";

const ITEMS: { key: keyof Omit<AppStats, "generatedAt" | "stale">; label: string }[] = [
  { key: "skins", label: "社区皮肤" },
  { key: "skinDownloads", label: "皮肤下载" },
  { key: "dictionaries", label: "共享词库" },
  { key: "replies", label: "回复模板" },
  { key: "resourceSaves", label: "词库与模板收藏" },
];

/**
 * Counters from the App's creation community (msime-backend `/v1/community/stats`, proxied by `/api/app-stats`). Client-only and optional: the prerendered page never carries it, and nothing renders unless the Function answered, so a backend outage leaves no empty box.
 */
export function AppStatsCard() {
  const { t } = useLocale();
  const { data } = useAppStatsQuery();
  if (!data) return null;

  return (
    <Card className="mt-4 p-[clamp(20px,3vw,32px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 text-sm font-semibold text-accent-ink">{t("App 创作社区")}</h3>
        <LocaleLink className="text-sm font-semibold text-accent-ink no-underline hover:text-ink" to="/skins/">{t("浏览社区皮肤 →")}</LocaleLink>
      </div>
      {data.stale && <p className="m-0 mt-1.5 text-sm leading-[1.8] text-muted">{t("暂时无法更新，显示最近可用数据。")}</p>}
      <dl className="m-0 mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-x-5 gap-y-4">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex flex-col-reverse">
            <dt className="mt-0.5 text-[12.5px] text-muted">{t(item.label)}</dt>
            <dd className="m-0 text-[clamp(20px,2vw,26px)] font-bold text-ink tabular-nums">{data[item.key].toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
