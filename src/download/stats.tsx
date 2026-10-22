import { latestMirrorDownloadStats, type MirrorDownloadStats } from "../../shared/mirror-download-stats";
import type { TestFlightStats } from "../../shared/testflight-stats";
import type { PlatformsManifest } from "../platforms-data";
import { PLATFORM_NAMES } from "../data/platforms";
import { useLocale } from "../use-locale";

/** 下载累计值包含全部已取得的下载计数，镜像快照与实时汇总只取最新一份，避免重复相加。 */
export function DownloadStats({ manifest, testflight, mirror, mirrorUnavailable }: { manifest?: PlatformsManifest; testflight?: TestFlightStats | null; mirror?: MirrorDownloadStats; mirrorUnavailable?: boolean }) {
  const { t } = useLocale();
  const github = manifest?.downloadStats;
  const pgyer = manifest?.pgyerDownloadStats;
  const mirrorStats = latestMirrorDownloadStats(manifest?.mirrorDownloadStats, mirror);
  const iosDownloads = testflight || mirrorStats?.platforms.ios !== undefined ? (testflight?.installs ?? 0) + (mirrorStats?.platforms.ios ?? 0) : undefined;
  const stats = github && mirrorStats ? {
    total: github.total + mirrorStats.total + (testflight?.installs ?? 0) + (pgyer?.total ?? 0),
    platforms: Object.fromEntries(Object.entries(github.platforms).map(([platform, count]) => [platform, count + (mirrorStats.platforms[platform] ?? 0) + (platform === "android" ? pgyer?.total ?? 0 : 0)])) as typeof github.platforms,
  } : undefined;
  const otherDownloads = stats && mirrorStats ? mirrorStats.total - Object.keys(github?.platforms ?? {}).reduce((sum, platform) => sum + (mirrorStats.platforms[platform] ?? 0), 0) - (mirrorStats.platforms.ios ?? 0) : 0;
  const updatedAt = manifest && mirrorStats ? [manifest.generatedAt, mirrorStats.generatedAt, ...(testflight ? [testflight.generatedAt] : []), ...(pgyer ? [pgyer.generatedAt] : [])].sort((a, b) => Date.parse(a) - Date.parse(b))[0] : undefined;
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
    { label: PLATFORM_NAMES.ios, count: iosDownloads, status: "暂无公开数据", note: testflight ? "含 TestFlight 安装次数" : "通过 TestFlight 分发" },
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
      {stats && <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("累计下载包含已采集的各平台安装包、国内镜像、蒲公英和 iOS 安装次数，不代表安装人数或全部完成下载。镜像按文件请求计数，外部网盘及历史镜像按官网点击计数。软件源暂无可用计数，已删除且未保存的安装包历史无法补回。")}</p>}
      {stats && !pgyer && <p className="m-0 mt-1 text-[13px] leading-[1.8] text-muted">{t("蒲公英累计数据暂不可用。")}</p>}
      {github && !mirrorStats && <p className="m-0 mt-5 text-[13px] leading-[1.8] text-muted">{t("下载统计暂不可用，正在等待完整的累计数据。")}</p>}
      {mirrorUnavailable && mirrorStats && <p className="m-0 mt-3 text-[13px] leading-[1.8] text-muted">{t("暂时无法更新，显示最近可用的累计数据。")}</p>}
      {stats && updatedAt && <p className="m-0 mt-1 text-[13px] leading-[1.8] text-muted">{t("数据更新于 ")}<time dateTime={updatedAt}>{updatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>}
      {testflight && <div className="mt-3 text-[13px] leading-[1.8] text-muted">
        <p className="m-0">{t("iOS 按 Apple 可用构建的安装次数统计并计入累计下载，不代表独立用户。")} {t(`指标覆盖日期：${testflight.periodStart} 至 ${testflight.periodEnd}。`)}</p>
        <p className="m-0 mt-1">{t("iOS 数据更新于 ")}<time dateTime={testflight.generatedAt}>{testflight.generatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>
      </div>}
    </section>
  );
}
