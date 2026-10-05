import { RELEASE_FILTERS, SITE_PLATFORMS, type ReleaseFilter, type SitePlatform } from "./data/platforms.ts";

/** Search parameters owned by the download page. Unknown values are dropped so a bad link falls back to the normal defaults. */
export function downloadSearchSchema(search: Record<string, unknown>): { platform?: SitePlatform; release?: ReleaseFilter } {
  const result: { platform?: SitePlatform; release?: ReleaseFilter } = {};
  const platform = search.platform;
  const release = search.release;
  if (typeof platform === "string" && SITE_PLATFORMS.includes(platform as SitePlatform)) result.platform = platform as SitePlatform;
  if (typeof release === "string" && RELEASE_FILTERS.includes(release as ReleaseFilter)) result.release = release as ReleaseFilter;
  return result;
}
