/** Tibetan is the primary language and lives at the root; Simplified Chinese mirrors every page under `/zh/`. */
export const LOCALES = ["bo", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const PRIMARY_LOCALE: Locale = "bo";

/** Every public page, as its Tibetan (unprefixed) path. */
export const PAGE_PATHS = ["/", "/download/", "/guide/", "/faq/"] as const;
export type PagePath = (typeof PAGE_PATHS)[number];

const ZH_PREFIX = "/zh";

export const HTML_LANG: Record<Locale, string> = { bo: "bo", zh: "zh-CN" };
export const OG_LOCALE: Record<Locale, string> = { bo: "bo_CN", zh: "zh_CN" };

export const localeOf = (path: string): Locale => (path === ZH_PREFIX || path.startsWith(`${ZH_PREFIX}/`) ? "zh" : "bo");

/** The page a path shows, without its locale prefix. */
export const basePath = (path: string) => (localeOf(path) === "zh" ? path.slice(ZH_PREFIX.length) || "/" : path);

export const localizedPath = (path: string, locale: Locale) => {
  const base = basePath(path);
  return locale === "zh" ? `${ZH_PREFIX}${base}` : base;
};

/** hreflang alternates for a page: both languages, with x-default pointing at the Tibetan page. */
export const languageAlternates = (path: string) => {
  const base = basePath(path);
  if (!(PAGE_PATHS as readonly string[]).includes(base)) return [];
  return [
    { lang: HTML_LANG.bo, path: localizedPath(base, "bo") },
    { lang: HTML_LANG.zh, path: localizedPath(base, "zh") },
    { lang: "x-default", path: localizedPath(base, "bo") },
  ];
};
