import { HTML_LANG, LOCALES, basePath, localeOf, localePath, type Locale } from "./locales.ts";

export const SITE_ORIGIN = "https://japanese.msime.app";
export const FULL_PRODUCT_ORIGIN = "https://msime.app";
export const SITE_NAME: Record<Locale, string> = { ja: "水杉日语", zh: "水杉日语" };
export const OG_IMAGE = `${SITE_ORIGIN}/msime-logo.png`;

type PageMeta = { title: string; description: string };

/** Every routed page, by base path and locale. scripts/site-metadata.test.mjs checks that the router and this registry list the same pages. */
const PAGES: Record<string, Record<Locale, PageMeta>> = {
  "/": {
    ja: {
      title: "水杉日语（MSIME Japanese）｜オープンソースの日本語入力",
      description: "水杉日语は、水杉输入法（MSIME）の日本語入力だけを収めたオープンソースの単体版です。ローマ字でかなを入力し、ひらがな・カタカナ・Mozc 由来の辞書の候補から選びます。macOS・Linux・Android 向けに無料で配布しています。",
    },
    zh: {
      title: "水杉日语（MSIME Japanese）｜开源日语输入法",
      description: "水杉日语是水杉输入法（MSIME）只带日语方案的开源独立版本：用罗马字输入假名，在平假名、片假名和 Mozc 词典的候选中选择。免费提供 macOS、Linux 与 Android 版本。",
    },
  },
  "/download/": {
    ja: {
      title: "ダウンロード｜水杉日语",
      description: "macOS（.pkg）、Linux（.deb・.rpm・tar.gz）、Android（APK）向けの水杉日语をダウンロード。バージョン、サイズ、SHA-256 と GitHub・ミラーのリンクを掲載。Windows と iPhone・iPad ではフル版の日本語モードを使います。",
    },
    zh: {
      title: "下载｜水杉日语",
      description: "下载 macOS（.pkg）、Linux（.deb、.rpm、tar.gz）与 Android（APK）版水杉日语，附版本、大小、SHA-256 以及 GitHub 和镜像链接。Windows 与 iPhone、iPad 使用完整版的日语方案。",
    },
  },
  "/guide/": {
    ja: {
      title: "使い方｜水杉日语",
      description: "水杉日语を macOS・Linux・Android にインストールして有効にする手順、Windows と iPhone・iPad のフル版で日本語入力を使う方法、ローマ字入力のきまりをまとめています。",
    },
    zh: {
      title: "使用指南｜水杉日语",
      description: "在 macOS、Linux、Android 上安装并启用水杉日语的步骤，在 Windows 与 iPhone、iPad 的完整版中使用日语方案的方法，以及罗马字输入规则。",
    },
  },
  "/faq/": {
    ja: {
      title: "よくある質問｜水杉日语",
      description: "水杉日语のよくある質問：フル版との併用、初回のデータダウンロード、中国語入力、Windows・iOS での使い方、辞書のライセンス、アンインストール、不具合の報告先。",
    },
    zh: {
      title: "常见问题｜水杉日语",
      description: "水杉日语常见问题：与完整版并存、首次使用的数据下载、中文输入、Windows 与 iOS 上的用法、词典许可证、卸载方法和问题反馈。",
    },
  },
};

const NOT_FOUND: Record<Locale, PageMeta> = {
  ja: { title: "ページが見つかりません｜水杉日语", description: "このアドレスにはページがありません。ホームか使い方のページから探してください。" },
  zh: { title: "页面不存在｜水杉日语", description: "这个地址没有内容，请返回首页或查看使用指南。" },
};

/** Base paths of the routed pages (without the locale prefix). */
export const PAGE_PATHS = Object.keys(PAGES);

/** Every public page address in every locale: all Japanese pages, then all Chinese ones. */
export const seoPages: string[] = LOCALES.flatMap((locale) => PAGE_PATHS.map((path) => localePath(path, locale)));

export const normalizePath = (path: string) => (path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`);
export const markdownPath = (path: string) => (path === "/" ? "/index.md" : `${normalizePath(path).slice(0, -1)}.md`);

export function pageSeo(path: string) {
  const normalized = normalizePath(path);
  const locale = localeOf(normalized);
  const page = PAGES[basePath(normalized)]?.[locale];
  return {
    ...(page ?? NOT_FOUND[locale]),
    noindex: !page,
    locale,
    language: HTML_LANG[locale],
    path: normalized,
    canonical: page ? `${SITE_ORIGIN}${normalized}` : undefined,
  };
}

/** Structured data for a page: the site, the page, the edition as a SoftwareApplication that is part of MSIME (home only), and a breadcrumb on inner pages. */
export function structuredData(path: string) {
  const page = pageSeo(path);
  if (page.noindex || !page.canonical) return undefined;
  const home = `${SITE_ORIGIN}${localePath("/", page.locale)}`;
  const fullProduct = { "@type": "SoftwareApplication", "@id": `${FULL_PRODUCT_ORIGIN}/#software`, name: "水杉输入法", alternateName: "MSIME", url: `${FULL_PRODUCT_ORIGIN}/` };
  const graph: object[] = [
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: SITE_NAME[page.locale], alternateName: "MSIME Japanese", inLanguage: page.language },
    { "@type": "WebPage", "@id": `${page.canonical}#webpage`, url: page.canonical, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } },
  ];
  if (basePath(page.path) === "/")
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#software`,
      name: SITE_NAME[page.locale],
      alternateName: "MSIME Japanese",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: ["macOS", "Linux", "Android"],
      url: home,
      downloadUrl: `${SITE_ORIGIN}${localePath("/download/", page.locale)}`,
      isAccessibleForFree: true,
      isPartOf: fullProduct,
      sameAs: [`${FULL_PRODUCT_ORIGIN}/`, "https://github.com/metasequoiaime/msime"],
    });
  else
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME[page.locale], item: home },
        { "@type": "ListItem", position: 2, name: page.title.split("｜")[0], item: page.canonical },
      ],
    });
  return { "@context": "https://schema.org", "@graph": graph };
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
