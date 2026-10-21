import type { PlatformsManifest } from "../platforms-data";
import { PLATFORM_NAMES } from "../data/platforms";
import { useLocale } from "../use-locale";

/** 随发布清单更新的静态统计，无须为每位访客请求 GitHub 或上报新的事件。 */
export function DownloadStats({ manifest }: { manifest?: PlatformsManifest }) {
  const { t } = useLocale();
  const stats = manifest?.downloadStats;
  if (!stats) return null;
  const counts = [
    { label: "累计下载", count: stats.total },
    ...Object.entries(stats.platforms).map(([platform, count]) => ({ label: PLATFORM_NAMES[platform as keyof typeof stats.platforms], count })),
  ];

  return (
    <section className="download-stats rounded-panel bg-panel p-[clamp(20px,3vw,32px)] shadow-ring-2" aria-labelledby="download-stats-title">
      <h2 id="download-stats-title" className="m-0 text-lg font-semibold text-ink">{t("GitHub 安装包下载统计")}</h2>
      <dl className="m-0 mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-5">
        {counts.map(({ label, count }, index) => (
          <div key={label} className={index === 0 ? "col-span-2 sm:col-span-1" : undefined}>
            <dt className="text-sm text-muted">{t(label)}</dt>
            <dd className="m-0 mt-1 text-[clamp(22px,2.5vw,30px)] font-bold text-ink tabular-nums">{count.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("统计现存正式版、预发布和 nightly 安装包的下载次数，不代表安装人数。不含国内镜像、软件源、蒲公英及 TestFlight；已删除安装包的历史下载无法计入。")}</p>
      <p className="m-0 mt-1 text-[13px] leading-[1.8] text-muted">{t("数据更新于 ")}<time dateTime={manifest.generatedAt}>{manifest.generatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>
    </section>
  );
}
