/**
 * The site's two languages. Vietnamese is the primary language and lives at the root; Simplified Chinese mirrors every page under `/zh/`.
 *
 * Shared by the browser bundle and by scripts/build-seo.mjs (run with --experimental-strip-types), so it imports nothing.
 */
export const LOCALES = ["vi", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const PRIMARY_LOCALE: Locale = "vi";

/** Path prefix of each locale; the primary language has none. */
export const LOCALE_PREFIX: Record<Locale, string> = { vi: "", zh: "/zh" };

/** `<html lang>` and hreflang value. */
export const LOCALE_LANG: Record<Locale, string> = { vi: "vi", zh: "zh-CN" };

/** `og:locale`. */
export const OG_LOCALE: Record<Locale, string> = { vi: "vi_VN", zh: "zh_CN" };

/** The language's own name, for the switcher. */
export const LOCALE_NAME: Record<Locale, string> = { vi: "Tiếng Việt", zh: "简体中文" };

/** Every public page, as a path without the locale prefix. */
export const PAGE_PATHS = ["/", "/download/", "/guide/", "/faq/"] as const;
export type PagePath = (typeof PAGE_PATHS)[number];

export const isPagePath = (path: string): path is PagePath => (PAGE_PATHS as readonly string[]).includes(path);

export const localeOf = (path: string): Locale => (path === "/zh" || path.startsWith("/zh/") ? "zh" : "vi");

/** The path without its locale prefix: `/zh/guide/` → `/guide/`. */
export const basePath = (path: string) => {
  const locale = localeOf(path);
  return locale === "vi" ? path : path.slice(LOCALE_PREFIX[locale].length) || "/";
};

/** `/guide/` in `zh` → `/zh/guide/`. */
export const localePath = (locale: Locale, base: string) => `${LOCALE_PREFIX[locale]}${base}`;

/** hreflang alternates for a page path in either locale, with x-default on the primary language. Empty for unknown paths (the 404 page). */
export const languageAlternates = (path: string) => {
  const base = basePath(path);
  if (!isPagePath(base)) return [];
  return [...LOCALES.map((locale) => ({ lang: LOCALE_LANG[locale], path: localePath(locale, base) })), { lang: "x-default", path: localePath(PRIMARY_LOCALE, base) }];
};

/** Prefixes an internal page link with the locale, keeping its query and fragment. External URLs and files are returned unchanged. */
export function localeHref(url: string, locale: Locale): string {
  if (locale === PRIMARY_LOCALE || !url.startsWith("/") || url.startsWith("//")) return url;
  const match = /^([^?#]*)(.*)$/.exec(url);
  if (!match) return url;
  const path = match[1].endsWith("/") ? match[1] : `${match[1]}/`;
  return isPagePath(path) ? `${localePath(locale, path)}${match[2]}` : url;
}
