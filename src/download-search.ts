import { RELEASE_FILTERS, SITE_PLATFORMS, type ReleaseFilter, type SitePlatform } from "./data/platforms.ts";
import { WINDOWS_VARIANTS, type WindowsVariant } from "./download/windows.ts";

/** 下载页拥有的查询参数；非法值丢弃，旧链接沿用原平台与 Windows 纯净版默认值。 */
export function downloadSearchSchema(search: Record<string, unknown>): { platform?: SitePlatform; release?: ReleaseFilter; windows?: WindowsVariant } {
  const result: { platform?: SitePlatform; release?: ReleaseFilter; windows?: WindowsVariant } = {};
  const platform = search.platform;
  const release = search.release;
  if (typeof platform === "string" && SITE_PLATFORMS.includes(platform as SitePlatform)) result.platform = platform as SitePlatform;
  if (typeof release === "string" && RELEASE_FILTERS.includes(release as ReleaseFilter)) result.release = release as ReleaseFilter;
  if (result.platform === "windows" && typeof search.windows === "string" && WINDOWS_VARIANTS.includes(search.windows as WindowsVariant)) result.windows = search.windows as WindowsVariant;
  return result;
}
