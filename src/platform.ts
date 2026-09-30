import { PLATFORM_NAMES, SITE_PLATFORMS, type SitePlatform } from "./data/platforms.ts";

export const DESKTOP_PLATFORMS = ["windows", "macos", "linux"] as const;
export type DesktopPlatform = (typeof DESKTOP_PLATFORMS)[number];

/** Every platform the download page offers, in the site's display order (Windows, macOS, Linux, Android, iOS, HarmonyOS). These are also the accepted values of the download page's `?platform=` parameter. */
export const PLATFORMS = SITE_PLATFORMS;

export type Platform = SitePlatform;

export const PLATFORM_LABELS: Record<Platform, string> = PLATFORM_NAMES;

/**
 * 按 UA 猜访客的系统，猜不出当作 Windows。
 *
 * 只用来决定默认给谁看哪一份内容，六个平台的入口始终都在页面上 —— 猜错了也只是多点一下，不会挡住任何人。
 *
 * 顺序有讲究：iPhone 和 iPad 必须排在 macOS 前面，iPhone 的 UA 里含 `like Mac OS X`，而 iPadOS 13 起干脆自称 Macintosh，只能靠多点触控把它和真 Mac 分开。OpenHarmony（HarmonyOS NEXT 的 ArkWeb）要排在 Android 前面；更早的 HarmonyOS 2–4 跑的是 Android 应用，UA 里同时带着 Android，按 Android 处理。Android 的 UA 也带 Linux 字样，所以 Linux 必须排在最后并排掉 Android。
 */
export const detectPlatform = (): Platform => {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Mac OS X|Macintosh/.test(ua)) return "macos";
  if (/OpenHarmony/.test(ua)) return "harmony";
  if (/Android/.test(ua)) return "android";
  if (/Linux/.test(ua)) return "linux";
  return "windows";
};
