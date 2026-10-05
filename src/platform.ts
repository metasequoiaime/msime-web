import { PLATFORM_NAMES, SITE_PLATFORMS, type SitePlatform } from "./data/platforms.ts";

export const DESKTOP_PLATFORMS = ["windows", "macos", "linux"] as const;
export type DesktopPlatform = (typeof DESKTOP_PLATFORMS)[number];

/** Every platform the download page offers, in the site's display order (Windows, macOS, Linux, Android, iOS, HarmonyOS, Web). These are also the accepted values of the download page's `?platform=` parameter. */
export const PLATFORMS = SITE_PLATFORMS;

export type Platform = SitePlatform;

export const PLATFORM_LABELS: Record<Platform, string> = PLATFORM_NAMES;

/**
 * 按 UA 猜访客的系统，猜不出当作 Windows。
 *
 * 只用来决定默认给谁看哪一份内容，七个平台的入口始终都在页面上 —— 猜错了也只是多点一下，不会挡住任何人。不会猜成 Web：每个访客都在浏览器里，Web 版是给网站开发者接入的，不是给访客安装的。
 *
 * 顺序有讲究：iPhone 和 iPad 必须排在 macOS 前面，iPhone 的 UA 里含 `like Mac OS X`，而 iPadOS 13 起干脆自称 Macintosh，只能靠多点触控把它和真 Mac 分开。OpenHarmony（HarmonyOS NEXT 的 ArkWeb）要排在 Android 前面；更早的 HarmonyOS 2–4 跑的是 Android 应用，UA 里同时带着 Android，按 Android 处理。Android 的 UA 也带 Linux 字样，所以 Linux 必须排在最后并排掉 Android。
 */
export const detectPlatform = (): Platform => recognizePlatform() ?? "windows";

/**
 * 同一套 UA 判断，但认不出来时返回 null 而不是默认 Windows。
 *
 * 首页的「下载」按钮会按这个结果直接给出安装包链接，猜错的代价是下错文件，所以只有 UA 明确写着 Windows 才算 Windows；ChromeOS、爬虫之类认不出的访客交给下载页自己挑。
 */
export const recognizePlatform = (): Platform | null => {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Mac OS X|Macintosh/.test(ua)) return "macos";
  if (/OpenHarmony/.test(ua)) return "harmony";
  if (/Android/.test(ua)) return "android";
  if (/Linux/.test(ua)) return "linux";
  if (/Windows/.test(ua)) return "windows";
  return null;
};
