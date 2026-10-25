import { useDownloadStatsQuery, useTestflightStatsQuery } from "../data/queries";
import { resolveDownloadStats } from "../download/stats";

/** 首页使用清单里的统计快照，不轮询镜像接口。 */
export function useHomeDownloadStats() {
  const stats = useDownloadStatsQuery();
  const testflight = useTestflightStatsQuery();
  return resolveDownloadStats(stats.data, testflight.data, stats.data?.mirrorDownloadStats);
}
