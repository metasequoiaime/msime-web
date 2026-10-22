import { latestMirrorDownloadStats, type MirrorDownloadStats } from "../../shared/mirror-download-stats";
import type { TestFlightStats } from "../../shared/testflight-stats";
import type { PlatformsManifest } from "../platforms-data";
import { PLATFORM_NAMES } from "../data/platforms";
import { useLocale } from "../use-locale";

/** 下载累计值包含全部已取得的下载计数，镜像快照与实时汇总只取最新一份，避免重复相加。 */
export function DownloadStats({ manifest, testflight, mirror, mirrorUnavailable }: { manifest?: PlatformsManifest; testflight?: TestFlightStats | null; mirror?: MirrorDownloadStats; mirrorUnavailable?: boolean }) {
  const { t } = useLocale();
  const github = manifest?.downloadStats;
  const mirrorStats = latestMirrorDownloadStats(manifest?.mirrorDownloadStats, mirror);
  const stats = github && mirrorStats ? {
    total: github.total + mirrorStats.total,
    platforms: Object.fromEntries(Object.entries(github.platforms).map(([platform, count]) => [platform, count + (mirrorStats.platforms[platform] ?? 0)])) as typeof github.platforms,
  } : undefined;
  const otherDownloads = stats && mirrorStats ? mirrorStats.total - Object.keys(github?.platforms ?? {}).reduce((sum, platform) => sum + (mirrorStats.platforms[platform] ?? 0), 0) : 0;
  if (!github && !testflight) return null;
  const counts: { label: string; count?: number | null; status?: string; note?: string }[] = [
    ...(stats ? [
      { label: "累计下载", count: stats.total },
      { label: stats.platforms.windowsRust === undefined ? "Windows（含 Rust 新版）" : "Windows（纯净版）", count: stats.platforms.windows },
      { label: "Windows（Rust 新版）", count: stats.platforms.windowsRust, status: "尚未单独统计" },
      ...(["macos", "linux", "android"] as const).map(platform => ({ label: PLATFORM_NAMES[platform], count: stats.platforms[platform] })),
      { label: PLATFORM_NAMES.harmony, count: stats.platforms.harmony, status: "尚未单独统计", note: "HAP 测试包" },
    ] : github ? [{ label: "累计下载", status: "统计暂不可用" }] : []),
    ...(otherDownloads ? [{ label: "其他下载", count: otherDownloads }] : []),
    { label: PLATFORM_NAMES.ios, count: testflight?.installs, status: "暂无公开数据", note: testflight ? "TestFlight 安装次数" : "通过 TestFlight 分发" },
  ];

  return (
    <section className="download-stats rounded-panel bg-panel p-[clamp(20px,3vw,32px)] shadow-ring-2" aria-labelledby="download-stats-title">
      <h2 id="download-stats-title" className="m-0 text-lg font-semibold text-ink">{t("下载与安装统计")}</h2>
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
      {stats && <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("累计下载包含各平台安装包和国内镜像下载，不代表安装人数；镜像按官网点击计数。软件源与蒲公英暂无可用计数，已删除安装包的历史下载无法补回。")}</p>}
      {github && !mirrorStats && <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("下载统计暂不可用，正在等待完整的累计数据。")}</p>}
      {mirrorUnavailable && mirrorStats && <p className="m-0 mt-3 text-[13px] leading-[1.8] text-muted">{t("暂时无法更新，显示最近可用的累计数据。")}</p>}
      {stats && mirrorStats && manifest && <p className="m-0 mt-1 text-[13px] leading-[1.8] text-muted">{t("数据更新于 ")}<time dateTime={manifest.generatedAt < mirrorStats.generatedAt ? manifest.generatedAt : mirrorStats.generatedAt}>{(manifest.generatedAt < mirrorStats.generatedAt ? manifest.generatedAt : mirrorStats.generatedAt).slice(0, 16).replace("T", " ")} UTC</time></p>}
      {testflight && <div className="mt-3 text-[13px] leading-[1.8] text-muted">
        <p className="m-0">{t("iOS 按 Apple 可用构建的安装次数单独统计，不代表独立用户，不计入累计下载。")} {t(`指标覆盖日期：${testflight.periodStart} 至 ${testflight.periodEnd}。`)}</p>
        <p className="m-0 mt-1">{t("iOS 数据更新于 ")}<time dateTime={testflight.generatedAt}>{testflight.generatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>
      </div>}
    </section>
  );
}
