import type { SitePlatformEntry } from "../data/platforms.ts";
import type { PlatformRelease } from "../platforms-data.ts";

export const WINDOWS_VARIANTS = ["pure", "online", "win7"] as const;
export type WindowsVariant = (typeof WINDOWS_VARIANTS)[number];
export type DownloadEntry = SitePlatformEntry & { windowsVariant?: WindowsVariant };

const WINDOWS_NAMES: Record<WindowsVariant, string> = {
  pure: "Windows 10/11（纯净版）",
  online: "Windows 10/11（联网版）",
  win7: "Windows 7",
};

/** Windows 产品共用平台身份，各自读取独立发布槽；缺少某版时不借用其他版本的安装包。 */
export function downloadChoices(entries: SitePlatformEntry[]): DownloadEntry[] {
  return entries.flatMap(entry => {
    if (entry.id !== "windows") return [entry];
    return WINDOWS_VARIANTS.map(windowsVariant => {
      const publication = windowsVariant === "pure" ? entry.release : windowsVariant === "online" ? entry.release?.experimental : entry.release?.windows7;
      const release: PlatformRelease | null = publication ? {
        ...publication,
        prerelease: windowsVariant === "pure" ? entry.release?.prerelease ?? false : windowsVariant === "online",
        preview: windowsVariant === "pure" ? entry.release?.preview ?? null : null,
        experimental: null,
        windows7: null,
      } : null;
      return {
        ...entry,
        windowsVariant,
        name: WINDOWS_NAMES[windowsVariant],
        release,
        publishedVersion: release?.version ?? null,
        href: windowsVariant === "pure" ? entry.href : `https://github.com/metasequoiaime/msime/releases?q=${windowsVariant === "win7" ? "windows7-v" : "windows-v"}`,
        sourceUrl: windowsVariant === "pure" ? entry.sourceUrl : "https://github.com/metasequoiaime/msime/tree/develop/platforms/windows",
      };
    });
  });
}
