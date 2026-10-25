import { useDownloadStatsQuery, useTestflightStatsQuery } from "../data/queries";
import { DownloadStats } from "../download/stats";

/** 首页使用清单里的统计快照，不轮询镜像接口；下载页仍保留实时镜像汇总。 */
export function HomeDownloadStats() {
  const stats = useDownloadStatsQuery();
  const testflight = useTestflightStatsQuery();
  return <DownloadStats manifest={stats.data} testflight={testflight.data} mirror={stats.data?.mirrorDownloadStats} embedded />;
}
