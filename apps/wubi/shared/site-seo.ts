/**
 * SEO registry for wubi.msime.app. The static build (scripts/build-seo.mjs) prerenders exactly the pages registered here, and the client (src/page-meta.ts) reads the same entries on every navigation.
 *
 * The site has one locale, Simplified Chinese at the root with no prefix. Pages are still registered per locale so the four edition sites keep the same shape; a second locale would add its own entries under its prefix.
 */
import { zh } from "../src/i18n/zh.ts";

export const SITE_ORIGIN = "https://wubi.msime.app";
export const FULL_SITE = "https://msime.app";

export const LOCALES = ["zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];
export const PRIMARY_LOCALE: Locale = "zh-CN";

type LocaleInfo = {
  /** Path prefix without a trailing slash; the primary locale has none. */
  prefix: string;
  /** `<html lang>` and hreflang value. */
  lang: string;
  ogLocale: string;
  siteName: string;
};

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  "zh-CN": { prefix: "", lang: "zh-CN", ogLocale: "zh_CN", siteName: "水杉五笔" },
};

/** Base paths of every public page, without a locale prefix. */
export const PAGE_PATHS = ["/", "/download/", "/guide/", "/faq/"] as const;
export type PagePath = (typeof PAGE_PATHS)[number];

type PageText = { title: string; description: string };

const PAGE_TEXT: Record<Locale, Record<PagePath, PageText>> = {
  "zh-CN": {
    "/": {
      title: "水杉五笔｜开源五笔输入法，86 与 98 码表",
      description: "水杉五笔是开源水杉输入法（MSIME）只带五笔的独立版本：86、98 码表，四码唯一自动上屏，五笔拼音混输，z 键拼音反查与通配，五笔查码和 Rime 词库导入。macOS、Linux、Android 有独立安装包，可与完整版同时安装。",
    },
    "/download/": {
      title: "下载水杉五笔｜macOS、Linux、Android 安装包",
      description: "下载水杉五笔的 macOS pkg、Linux deb / rpm / tar.gz（x86_64 与 aarch64）和 Android APK，附版本、大小、SHA-256 与国内镜像。Windows、iOS 使用完整版水杉输入法，在设置里选五笔。",
    },
    "/guide/": {
      title: "水杉五笔使用指南｜安装、启用与五笔打字规则",
      description: "水杉五笔在 macOS、Linux、Android、Windows 与 iOS 上的安装和启用步骤，以及 86 / 98 码表、四码自动上屏、第五码顶字、拼音混输、z 键、编码提示、五笔查码和词库导入的用法。",
    },
    "/faq/": {
      title: "水杉五笔常见问题",
      description: "水杉五笔与完整版能否同时安装、第一次使用要下载什么、86 和 98 怎么切换、怎么导入 Rime 五笔词库、码表数据的许可证，以及如何卸载。",
    },
  },
};

const NOT_FOUND_TEXT: Record<Locale, PageText> = {
  "zh-CN": { title: "页面不存在｜水杉五笔", description: "这个地址没有内容，请返回水杉五笔首页或下载页。" },
};

/** Localized path of a base page path. */
export const localePath = (locale: Locale, path: string) => `${LOCALE_INFO[locale].prefix}${path}`;

/** The locale a path belongs to, from its prefix. */
export function localeOf(path: string): Locale {
  for (const locale of LOCALES) {
    const prefix = LOCALE_INFO[locale].prefix;
    if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) return locale;
  }
  return PRIMARY_LOCALE;
}

/** The path with its locale prefix removed. */
export function basePath(path: string) {
  const prefix = LOCALE_INFO[localeOf(path)].prefix;
  return prefix ? path.slice(prefix.length) || "/" : path;
}

export const seoPages: Record<string, PageText & { noindex?: boolean; canonicalPath?: string }> = {};
for (const locale of LOCALES) for (const path of PAGE_PATHS) seoPages[localePath(locale, path)] = PAGE_TEXT[locale][path];

export const normalizePath = (path: string) => (path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`);
export const markdownPath = (path: string) => (path === "/" ? "/index.md" : `${normalizePath(path).slice(0, -1)}.md`);

/** hreflang alternates of a page: every locale that has it, plus `x-default` pointing at the primary locale. */
export function languageAlternates(path: string) {
  const base = basePath(normalizePath(path));
  if (!(PAGE_PATHS as readonly string[]).includes(base)) return [];
  return [
    ...LOCALES.map((locale) => ({ lang: LOCALE_INFO[locale].lang, path: localePath(locale, base) })),
    { lang: "x-default", path: localePath(PRIMARY_LOCALE, base) },
  ];
}

export function pageSeo(path: string) {
  const normalized = normalizePath(path);
  const locale = localeOf(normalized);
  const page = seoPages[normalized];
  return {
    ...(page ?? { ...NOT_FOUND_TEXT[locale], noindex: true }),
    locale,
    language: LOCALE_INFO[locale].lang,
    ogLocale: LOCALE_INFO[locale].ogLocale,
    path: normalized,
    canonicalPath: page?.canonicalPath ?? normalized,
    canonical: page ? `${SITE_ORIGIN}${page.canonicalPath ?? normalized}` : undefined,
  };
}

const BREADCRUMB_HOME: Record<Locale, string> = { "zh-CN": "首页" };
const FAQ_ITEMS: Record<Locale, readonly { q: string; a: readonly string[] }[]> = { "zh-CN": zh.faq.items };

/** Plain text of a message for structured data: inline-code marks dropped, link text kept. */
export const plainText = (text: string) => text.replaceAll("`", "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

export function structuredData(path: string) {
  const page = pageSeo(pageSeo(path).canonicalPath);
  if (page.noindex || !page.canonical) return undefined;
  const siteName = LOCALE_INFO[page.locale].siteName;
  const home = `${SITE_ORIGIN}${localePath(page.locale, "/")}`;
  const organization = { "@type": "Organization", "@id": `${FULL_SITE}/#organization`, name: "水杉输入法", alternateName: "MSIME", url: `${FULL_SITE}/`, logo: `${FULL_SITE}/msime-logo.png`, sameAs: ["https://github.com/metasequoiaime"] };
  const graph: object[] = [
    organization,
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: siteName, inLanguage: page.language, publisher: { "@id": organization["@id"] } },
    { "@type": "WebPage", "@id": `${page.canonical}#webpage`, url: page.canonical, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } },
  ];
  if (basePath(page.path) === "/") {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#software`,
      name: siteName,
      alternateName: "MSIME Wubi",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: ["macOS", "Linux", "Android"],
      url: home,
      downloadUrl: `${SITE_ORIGIN}${localePath(page.locale, "/download/")}`,
      isAccessibleForFree: true,
      isPartOf: { "@type": "SoftwareApplication", "@id": `${FULL_SITE}/#software`, name: "水杉输入法", url: `${FULL_SITE}/` },
      sameAs: [`${FULL_SITE}/`, "https://github.com/metasequoiaime/msime"],
      publisher: { "@id": organization["@id"] },
    });
  } else {
    if (basePath(page.path) === "/faq/") graph.push({ "@type": "FAQPage", "@id": `${page.canonical}#faq`, mainEntity: FAQ_ITEMS[page.locale].map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a.map(plainText).join("\n\n") } })) });
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: BREADCRUMB_HOME[page.locale], item: home },
        { "@type": "ListItem", position: 2, name: page.title.split("｜")[0], item: page.canonical },
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
