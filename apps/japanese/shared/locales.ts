/**
 * The site's two locales: Japanese at the root, Simplified Chinese under /zh/. Shared by the router, the static build and the SEO registry, so it imports nothing from src/.
 */
export const LOCALES = ["ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";
const PREFIX: Record<Locale, string> = { ja: "", zh: "/zh" };
export const HTML_LANG: Record<Locale, string> = { ja: "ja", zh: "zh-CN" };

export const localeOf = (path: string): Locale => (path === "/zh" || path.startsWith("/zh/") ? "zh" : "ja");

/** The path without its locale prefix, always with a leading slash: `/zh/download/` becomes `/download/`. */
export const basePath = (path: string) => (localeOf(path) === "zh" ? path.slice(PREFIX.zh.length) || "/" : path);

/** A base path in the given locale: `/download/` becomes `/zh/download/` for Chinese. Query strings and fragments are kept. */
export const localePath = (path: string, locale: Locale) => `${PREFIX[locale]}${path}`;

/** Every locale's version of the same page, plus `x-default` pointing at the primary language. */
export const languageAlternates = (path: string) => {
  const base = basePath(path);
  return [
    ...LOCALES.map((locale) => ({ lang: HTML_LANG[locale], path: localePath(base, locale) })),
    { lang: "x-default", path: localePath(base, DEFAULT_LOCALE) },
  ];
};
