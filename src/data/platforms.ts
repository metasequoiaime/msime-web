import type { PlatformRelease, Platforms } from "../platforms-data.ts";

// This module must stay free of runtime zod imports: the home page's platform cards import it, and zod is kept out of that chunk.

/** Every platform the site presents, in display order. `harmony` is HarmonyOS; `web` is the engine compiled to WebAssembly for embedding in web pages, last because it is not an installed input method. */
export const SITE_PLATFORMS = ["windows", "macos", "linux", "android", "ios", "harmony", "web"] as const;
export type SitePlatform = (typeof SITE_PLATFORMS)[number];

export const PLATFORM_NAMES: Record<SitePlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS",
  harmony: "HarmonyOS",
  web: "Web",
};

/** Filter values accepted by `/api/releases?platform=` and `releasesQuery()`. */
export const RELEASE_FILTERS = ["all", ...SITE_PLATFORMS] as const;
export type ReleaseFilter = (typeof RELEASE_FILTERS)[number];

export const IOS_TESTFLIGHT_URL = "https://testflight.apple.com/join/bUzPvyqt";

/** Android test builds are distributed through Pgyer (蒲公英), which serves a scan-or-tap install page reachable from mainland China; there is no GitHub release for Android yet. */
export const ANDROID_PGYER_URL = "https://www.pgyer.com/msime";

/**
 * How a platform reaches users today.
 * - `release`: installable packages on GitHub Releases, described by `public/platforms.json`.
 * - `testflight`: Apple's public beta only; the IPAs on GitHub are TestFlight builds, not sideloadable.
 * - `pgyer`: a test APK on Pgyer's install page, sideloaded rather than installed from a store.
 * - `source`: developed in the msime repository with no published package yet.
 * - `sdk`: a library for developers to embed (the web engine on npm), not something end users install.
 */
export type Distribution = "release" | "testflight" | "pgyer" | "source" | "sdk";

export type PlatformInfo = {
  id: SitePlatform;
  name: string;
  /** One-line description of the native host, as the design's platform cards show it. */
  host: string;
  distribution: Distribution;
  /** Where the platform card sends visitors: the releases page, TestFlight, Pgyer, or the platform's source directory. */
  href: string;
  /** Source directory, for "view the code" links. */
  sourceUrl: string;
};

const MSIME = "https://github.com/metasequoiaime/msime";

/** The web engine's npm package; the same files are attached to every `web-engine-v…` release in the msime repository. */
export const WEB_ENGINE_NPM_URL = "https://www.npmjs.com/package/@msime/web-engine";

/*
 * Static facts about the seven platforms. `public/platforms.json` belongs to the release automation and only covers the three desktop platforms with GitHub packages; Android, iOS and HarmonyOS details live here instead, so the manifest's shape never has to change for them. Windows keeps its separate repository; macOS and Linux releases come from the merged `msime` repository.
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
    href: `${MSIME}/releases`,
    sourceUrl: `${MSIME}/tree/develop/platforms/linux`,
  },
  android: {
    id: "android",
    name: PLATFORM_NAMES.android,
    host: "输入法服务独立进程，手写走 ML Kit Digital Ink",
    distribution: "pgyer",
    href: ANDROID_PGYER_URL,
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
  web: {
    id: "web",
    name: PLATFORM_NAMES.web,
    host: "Rust 引擎编译成 WebAssembly，在网页的 Web Worker 中运行",
    distribution: "sdk",
    href: WEB_ENGINE_NPM_URL,
    sourceUrl: `${MSIME}/tree/develop/packages/web-engine`,
  },
};

export type SitePlatformEntry = PlatformInfo & {
  /** The current stable release from `platforms.json`; `null` for platforms without GitHub packages or when the manifest is unavailable. */
  release: PlatformRelease | null;
};

/** All seven platforms in display order, each joined with its release from `platforms.json` when there is one. Pure: safe during SSR with seeded query data or with none. */
export function sitePlatforms(platforms?: Partial<Platforms>): SitePlatformEntry[] {
  return SITE_PLATFORMS.map(id => {
    const info = PLATFORM_CATALOG[id];
    const release = info.distribution === "release" && (id === "windows" || id === "macos" || id === "linux") ? (platforms?.[id] ?? null) : null;
    return { ...info, release };
  });
}
