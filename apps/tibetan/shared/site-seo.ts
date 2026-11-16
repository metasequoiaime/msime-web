import { basePath, HTML_LANG, localeOf, localizedPath, PAGE_PATHS, type Locale, type PagePath } from "./locales.ts";

export const SITE_ORIGIN = "https://tibetan.msime.app";
export const FULL_PRODUCT_ORIGIN = "https://msime.app";
export const SITE_NAME: Record<Locale, string> = { bo: "水杉藏文", zh: "水杉藏文" };

type PageMeta = { title: string; description: string };

const PAGES: Record<Locale, Record<PagePath, PageMeta>> = {
  bo: {
    "/": {
      title: "水杉藏文 MSIME Tibetan · ལ་ཏིན་མཐེབ་གཞོང་ནས་བོད་ཡིག་འབྲི།",
      description: "水杉藏文 ནི་ EWTS (Wylie) ལྟར་ལ་ཏིན་ཡི་གེ་རྡེབ་ནས་བོད་ཡིག་འབྲི་བའི་ཡིག་འཇུག་ཡིན། macOS དང་ Linux། Android། Windows ཚོད་ལྟའི་པར་གཞི་བཅས་ལ་སྤྱོད་ཆོག",
    },
    "/download/": {
      title: "ཕབ་ལེན། | 水杉藏文",
      description: "macOS དང་ Linux། Android། Windows ཚོད་ལྟའི་པར་གཞི་བཅས་ཀྱི་ 水杉藏文 སྒྲིག་འཇུག་ཡིག་ཆ། པར་གཞི་དང་ཆེ་ཆུང་། SHA-256 བཅས་དང་མཉམ་དུ།",
    },
    "/guide/": {
      title: "སྒྲིག་འཇུག་དང་འབྲི་སྟངས། | 水杉藏文",
      description: "水杉藏文 སྒྲིག་འཇུག་བྱེད་ཐབས་དང་ EWTS ཡིས་བོད་ཡིག་འབྲི་སྟངས། མཐེབ་སོ་སོའི་ནུས་པ་དང་དཔེ་མཚོན།",
    },
    "/faq/": {
      title: "དྲི་བ་རྒྱུན་མ། | 水杉藏文",
      description: "水杉藏文 སྐོར་གྱི་དྲི་བ་རྒྱུན་མ་དང་དེའི་ལན། སྒྲིག་འཇུག་དང་སུབ་ཐབས། iPhone། Windows། བསམ་འཆར་འབུལ་ས་སོགས།",
    },
  },
  zh: {
    "/": {
      title: "水杉藏文｜用 EWTS 在拉丁键盘上输入藏文",
      description: "水杉藏文（MSIME Tibetan）是只带藏文方案的水杉输入法独立版本：按 EWTS（扩展威利转写）在拉丁键盘上拼写，直接得到藏文。支持 macOS、Linux、Android 和 Windows 预览版。",
    },
    "/download/": {
      title: "下载｜水杉藏文",
      description: "下载水杉藏文的 macOS、Linux、Android 安装包和 Windows 未签名预览版，附版本、大小、SHA-256 与镜像下载。",
    },
    "/guide/": {
      title: "安装与输入指南｜水杉藏文",
      description: "在 macOS、Linux、Android 和 Windows 预览版上安装并启用水杉藏文，了解 EWTS 的拼写规则、按键和示例。",
    },
    "/faq/": {
      title: "常见问题｜水杉藏文",
      description: "水杉藏文的常见问题：与水杉输入法共存、首次使用、iOS 与鸿蒙、Windows 预览版、大小写、卸载、许可与反馈。",
    },
  },
};

const NOT_FOUND: Record<Locale, PageMeta> = {
  bo: { title: "ཤོག་ངོས་འདི་མི་འདུག | 水杉藏文", description: "ས་གནས་འདི་ན་ནང་དོན་མེད། མ་ངོས་སམ་ལམ་སྟོན་ལ་ལོག་རོགས།" },
  zh: { title: "页面不存在｜水杉藏文", description: "这个地址没有内容，请返回首页或查看指南。" },
};

/** Every public page in every locale, keyed by its full path. */
export const seoPages: Record<string, PageMeta> = Object.fromEntries(
  (Object.keys(PAGES) as Locale[]).flatMap(locale => PAGE_PATHS.map(path => [localizedPath(path, locale), PAGES[locale][path]]))
);

export const normalizePath = (path: string) => (path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`);
export const markdownPath = (path: string) => (path === "/" ? "/index.md" : `${normalizePath(path).slice(0, -1)}.md`);

export function pageSeo(path: string) {
  const normalized = normalizePath(path);
  const locale = localeOf(normalized);
  const page = seoPages[normalized];
  return {
    ...(page ?? NOT_FOUND[locale]),
    noindex: !page,
    locale,
    language: HTML_LANG[locale],
    path: normalized,
    canonicalPath: normalized,
    canonical: page ? `${SITE_ORIGIN}${normalized}` : undefined,
  };
}

export function structuredData(path: string) {
  const page = pageSeo(path);
  if (page.noindex || !page.canonical) return undefined;
  const home = `${SITE_ORIGIN}${localizedPath("/", page.locale)}`;
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "水杉输入法",
    alternateName: "MSIME",
    url: `${FULL_PRODUCT_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/msime-logo.png`,
    sameAs: [`${FULL_PRODUCT_ORIGIN}/`, "https://github.com/metasequoiaime"],
  };
  const graph: object[] = [
    organization,
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: SITE_NAME[page.locale], alternateName: "MSIME Tibetan", inLanguage: [HTML_LANG.bo, HTML_LANG.zh], publisher: { "@id": organization["@id"] } },
    { "@type": "WebPage", "@id": `${page.canonical}#webpage`, url: page.canonical, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } },
  ];
  if (basePath(page.path) === "/") {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#software`,
      name: "水杉藏文",
      alternateName: ["MSIME Tibetan"],
      applicationCategory: "UtilitiesApplication",
      operatingSystem: ["macOS", "Linux", "Android", "Windows"],
      inLanguage: HTML_LANG.bo,
      url: home,
      downloadUrl: `${SITE_ORIGIN}${localizedPath("/download/", page.locale)}`,
      isPartOf: { "@type": "SoftwareApplication", name: "水杉输入法", alternateName: "MSIME", url: `${FULL_PRODUCT_ORIGIN}/` },
      sameAs: [`${FULL_PRODUCT_ORIGIN}/`],
      publisher: { "@id": organization["@id"] },
    });
  } else {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME[page.locale], item: home },
        { "@type": "ListItem", position: 2, name: page.title.split(/ \| |｜/)[0], item: page.canonical },
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
