import type { PlatformsManifest } from "../platforms-data";
import { PLATFORM_NAMES } from "../data/platforms";
import { useLocale } from "../use-locale";

/** 随发布清单更新的静态统计，无须为每位访客请求 GitHub 或上报新的事件。 */
export function DownloadStats({ manifest }: { manifest?: PlatformsManifest }) {
  const { t } = useLocale();
  const stats = manifest?.downloadStats;
  if (!stats) return null;
  const counts: { label: string; count?: number | null; status?: string; note?: string }[] = [
    { label: "累计下载", count: stats.total },
    { label: stats.platforms.windowsRust === undefined ? "Windows（含 Rust 新版）" : "Windows（旧版）", count: stats.platforms.windows },
    { label: "Windows（Rust 新版）", count: stats.platforms.windowsRust, status: "尚未单独统计" },
    ...(["macos", "linux", "android"] as const).map(platform => ({ label: PLATFORM_NAMES[platform], count: stats.platforms[platform] })),
    { label: PLATFORM_NAMES.ios, count: null, status: "暂无公开数据", note: "通过 TestFlight 分发" },
    { label: PLATFORM_NAMES.harmony, count: stats.platforms.harmony, status: "尚未单独统计", note: "GitHub HAP 测试包" },
  ];

  return (
    <section className="download-stats rounded-panel bg-panel p-[clamp(20px,3vw,32px)] shadow-ring-2" aria-labelledby="download-stats-title">
      <h2 id="download-stats-title" className="m-0 text-lg font-semibold text-ink">{t("GitHub 安装包下载统计")}</h2>
      <dl className="m-0 mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
        {counts.map(({ label, count, status, note }, index) => (
          <div key={label} className={index === 0 ? "col-span-2 sm:col-span-1" : undefined}>
            <dt className="text-sm text-muted">{t(label)}</dt>
            <dd className={typeof count === "number" ? "m-0 mt-1 text-[clamp(22px,2.5vw,30px)] font-bold text-ink tabular-nums" : "m-0 mt-2 text-sm font-medium text-muted"}>
              {typeof count === "number" ? count.toLocaleString("en-US") : t(status ?? "暂无公开数据")}
              {note && <span className="mt-1 block text-xs font-normal text-muted">{t(note)}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("统计现存正式版、预发布和 nightly 安装包的下载次数，不代表安装人数。不含国内镜像、软件源、蒲公英及 TestFlight；已删除安装包的历史下载无法计入。")}</p>
      <p className="m-0 mt-1 text-[13px] leading-[1.8] text-muted">{t("数据更新于 ")}<time dateTime={manifest.generatedAt}>{manifest.generatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>
    </section>
  );
}
