import { basePath, LOCALE_LANG, LOCALES, localeOf, localePath, OG_LOCALE, PAGE_PATHS, PRIMARY_LOCALE, type Locale, type PagePath } from "./locales.ts";

export const SITE_ORIGIN = "https://vietnamese.msime.app";
/** The full product this edition belongs to. */
export const MSIME_ORIGIN = "https://msime.app";

export const SITE_NAME: Record<Locale, string> = { vi: "水杉越南语 MSIME Vietnamese", zh: "水杉越南语" };

type PageMeta = { title: string; description: string };

/** Title and description of every page in every locale. Written per language rather than translated word for word. */
const PAGES: Record<Locale, Record<PagePath, PageMeta>> = {
  vi: {
    "/": {
      title: "水杉越南语 – Bộ gõ tiếng Việt Telex, VNI mã nguồn mở | MSIME",
      description: "水杉越南语 là phiên bản chỉ có kiểu gõ tiếng Việt của bộ gõ mã nguồn mở MSIME (水杉输入法): gõ Telex hoặc VNI trên macOS, Linux và Android, cài song song với bản đầy đủ.",
    },
    "/download/": {
      title: "Tải 水杉越南语 cho macOS, Linux và Android | 水杉越南语",
      description: "Bộ cài 水杉越南语 mới nhất cho macOS, Linux (deb, rpm, tar.gz cho x86_64 và aarch64) và Android, kèm kích thước, mã SHA-256 và liên kết dự phòng; cách gõ tiếng Việt trên iOS và Windows.",
    },
    "/guide/": {
      title: "Hướng dẫn cài đặt và gõ Telex, VNI | 水杉越南语",
      description: "Cài 水杉越南语 trên macOS, Linux và Android, bật tiếng Việt trên iOS, rồi gõ Telex hoặc VNI: bảng phím dấu, vị trí dấu kiểu mới và kiểu cũ, phím Esc và Backspace, kèm ví dụ.",
    },
    "/faq/": {
      title: "Câu hỏi thường gặp | 水杉越南语",
      description: "Giải đáp về 水杉越南语: dữ liệu khi dùng lần đầu, cài cùng bản MSIME đầy đủ, đổi Telex và VNI, gõ từ tiếng Anh, iPhone và Windows, gỡ cài đặt và mã nguồn.",
    },
  },
  zh: {
    "/": {
      title: "水杉越南语｜开源越南语输入法，支持 Telex 与 VNI",
      description: "水杉越南语是开源输入法水杉输入法（MSIME）只带越南语方案的独立版本：在 macOS、Linux 和 Android 上用 Telex 或 VNI 输入越南语，可与完整版同时安装。",
    },
    "/download/": {
      title: "下载水杉越南语：macOS、Linux 与 Android｜水杉越南语",
      description: "下载水杉越南语最新的 macOS、Linux（x86_64 与 aarch64 的 deb、rpm、tar.gz）和 Android 安装包，查看大小、SHA-256 与镜像地址，以及在 iOS 和 Windows 上输入越南语的方法。",
    },
    "/guide/": {
      title: "安装与 Telex、VNI 输入指南｜水杉越南语",
      description: "在 macOS、Linux、Android 上安装水杉越南语，在 iOS 上启用越南语方案，再用 Telex 或 VNI 输入：声调与变音按键、新式与旧式声调位置、Esc 与退格键，附示例。",
    },
    "/faq/": {
      title: "常见问题｜水杉越南语",
      description: "水杉越南语常见问题：首次使用要不要下载数据、能否与完整版同时安装、切换 Telex 与 VNI、输入英文单词、iPhone 与 Windows、卸载和源代码。",
    },
  },
};

const NOT_FOUND: Record<Locale, PageMeta> = {
  vi: { title: "Không tìm thấy trang | 水杉越南语", description: "Địa chỉ này không có nội dung. Hãy quay về trang chủ hoặc xem hướng dẫn." },
  zh: { title: "页面不存在｜水杉越南语", description: "这个地址没有内容，请返回首页或查看使用指南。" },
};

export type SeoPage = PageMeta & { noindex?: boolean };

/** Every registered page by its full path (with locale prefix). */
export const seoPages: Record<string, SeoPage> = Object.fromEntries(LOCALES.flatMap((locale) => PAGE_PATHS.map((path) => [localePath(locale, path), PAGES[locale][path]])));

export const normalizePath = (path: string) => (path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`);
export const markdownPath = (path: string) => (path === "/" ? "/index.md" : `${normalizePath(path).slice(0, -1)}.md`);

export function pageSeo(path: string) {
  const normalized = normalizePath(path);
  const locale = localeOf(normalized);
  const page = seoPages[normalized];
  return {
    ...(page ?? { ...NOT_FOUND[locale], noindex: true }),
    locale,
    language: LOCALE_LANG[locale],
    ogLocale: OG_LOCALE[locale],
    path: normalized,
    canonicalPath: normalized,
    canonical: page ? `${SITE_ORIGIN}${normalized}` : undefined,
  };
}

const BREADCRUMB_HOME: Record<Locale, string> = { vi: "Trang chủ", zh: "首页" };

export function structuredData(path: string) {
  const page = pageSeo(path);
  if (page.noindex || !page.canonical) return undefined;
  const home = `${SITE_ORIGIN}${localePath(page.locale, "/")}`;
  const organization = { "@type": "Organization", "@id": `${MSIME_ORIGIN}/#organization`, name: "水杉输入法 MSIME", url: `${MSIME_ORIGIN}/`, logo: `${MSIME_ORIGIN}/msime-logo.png`, sameAs: ["https://github.com/metasequoiaime"] };
  const graph: object[] = [
    organization,
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: SITE_NAME[PRIMARY_LOCALE], alternateName: ["水杉越南语", "MSIME Vietnamese"], inLanguage: LOCALES.map((locale) => LOCALE_LANG[locale]), publisher: { "@id": organization["@id"] } },
    { "@type": "WebPage", "@id": `${page.canonical}#webpage`, url: page.canonical, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } },
  ];
  if (basePath(page.path) === "/") {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#software`,
      name: "水杉越南语",
      alternateName: "MSIME Vietnamese",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: ["macOS", "Linux", "Android"],
      inLanguage: "vi",
      url: home,
      downloadUrl: `${SITE_ORIGIN}${localePath(page.locale, "/download/")}`,
      isPartOf: { "@type": "SoftwareApplication", name: "水杉输入法 MSIME", url: `${MSIME_ORIGIN}/` },
      sameAs: [`${MSIME_ORIGIN}/`, "https://github.com/metasequoiaime/msime"],
      publisher: { "@id": organization["@id"] },
    });
  } else {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: BREADCRUMB_HOME[page.locale], item: home },
        { "@type": "ListItem", position: 2, name: page.title.split(/ \| |｜/)[0], item: page.canonical },
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
