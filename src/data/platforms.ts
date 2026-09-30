import type { PlatformRelease, Platforms } from "../platforms-data.ts";

// This module must stay free of runtime zod imports: the home page's platform cards import it, and zod is kept out of that chunk.

/** Every platform the site presents, in display order. `harmony` is HarmonyOS. */
export const SITE_PLATFORMS = ["windows", "macos", "linux", "android", "ios", "harmony"] as const;
export type SitePlatform = (typeof SITE_PLATFORMS)[number];

export const PLATFORM_NAMES: Record<SitePlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS",
  harmony: "HarmonyOS",
};

/** Filter values accepted by `/api/releases?platform=` and `releasesQuery()`. */
export const RELEASE_FILTERS = ["all", ...SITE_PLATFORMS] as const;
export type ReleaseFilter = (typeof RELEASE_FILTERS)[number];

export const IOS_TESTFLIGHT_URL = "https://testflight.apple.com/join/bUzPvyqt";

/**
 * How a platform reaches users today.
 * - `release`: installable packages on GitHub Releases, described by `public/platforms.json`.
 * - `testflight`: Apple's public beta only; the IPAs on GitHub are TestFlight builds, not sideloadable.
 * - `source`: developed in the msime repository with no published package yet.
 */
export type Distribution = "release" | "testflight" | "source";

export type PlatformInfo = {
  id: SitePlatform;
  name: string;
  /** One-line description of the native host, as the design's platform cards show it. */
  host: string;
  distribution: Distribution;
  /** Where the platform card sends visitors: the releases page, TestFlight, or the platform's source directory. */
  href: string;
  /** Source directory, for "view the code" links. */
  sourceUrl: string;
};

const MSIME = "https://github.com/metasequoiaime/msime";

/*
 * Static facts about the six platforms. `public/platforms.json` belongs to the release automation and only covers the three desktop platforms with GitHub packages; Android, iOS and HarmonyOS details live here instead, so the manifest's shape never has to change for them. The repository casing matches the URLs the automation writes (`MSIME-Windows`, `MSIME-Linux`).
 */
export const PLATFORM_CATALOG: Record<SitePlatform, PlatformInfo> = {
  windows: {
    id: "windows",
    name: PLATFORM_NAMES.windows,
    host: "进程内 TSF DLL + 进程外 Server，命名管道通信",
    distribution: "release",
    href: "https://github.com/metasequoiaime/MSIME-Windows/releases",
    sourceUrl: "https://github.com/metasequoiaime/MSIME-Windows",
  },
  macos: {
    id: "macos",
    name: PLATFORM_NAMES.macos,
    host: "InputMethodKit bundle，Sparkle 自动更新",
    distribution: "release",
    href: `${MSIME}/releases`,
    sourceUrl: `${MSIME}/tree/develop/platforms/macos`,
  },
  linux: {
    id: "linux",
    name: PLATFORM_NAMES.linux,
    host: "IBus 与 Fcitx5 两个并列入口，提供 DEB、RPM 与 TGZ",
    distribution: "release",
    href: "https://github.com/metasequoiaime/MSIME-Linux/releases",
    sourceUrl: `${MSIME}/tree/develop/platforms/linux`,
  },
  android: {
    id: "android",
    name: PLATFORM_NAMES.android,
    host: "输入法服务独立进程，手写走 ML Kit Digital Ink",
    distribution: "source",
    href: `${MSIME}/tree/develop/platforms/android`,
    sourceUrl: `${MSIME}/tree/develop/platforms/android`,
  },
  ios: {
    id: "ios",
    name: PLATFORM_NAMES.ios,
    host: "原生 App 内嵌键盘扩展，App Group 共享状态",
    distribution: "testflight",
    href: IOS_TESTFLIGHT_URL,
    sourceUrl: `${MSIME}/tree/develop/platforms/ios`,
  },
  harmony: {
    id: "harmony",
    name: PLATFORM_NAMES.harmony,
    host: "InputMethodExtensionAbility，NAPI 调 host-api",
    distribution: "source",
    href: `${MSIME}/tree/develop/platforms/harmony`,
    sourceUrl: `${MSIME}/tree/develop/platforms/harmony`,
  },
};

export type SitePlatformEntry = PlatformInfo & {
  /** The current stable release from `platforms.json`; `null` for platforms without GitHub packages or when the manifest is unavailable. */
  release: PlatformRelease | null;
};

/** All six platforms in display order, each joined with its release from `platforms.json` when there is one. Pure: safe during SSR with seeded query data or with none. */
export function sitePlatforms(platforms?: Partial<Platforms>): SitePlatformEntry[] {
  return SITE_PLATFORMS.map(id => {
    const info = PLATFORM_CATALOG[id];
    const release = info.distribution === "release" && (id === "windows" || id === "macos" || id === "linux") ? (platforms?.[id] ?? null) : null;
    return { ...info, release };
  });
}
