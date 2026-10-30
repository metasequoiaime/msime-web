import { traditionalPages, traditionalPath, isTraditional } from "./locales.ts";
export const SITE_ORIGIN = "https://msime.app";
export const SITE_NAME = "水杉输入法";
export const GUIDE_NAMES = { windows: "Windows", macos: "macOS", "macos-voice": "macOS 语音", linux: "Linux", android: "Android", ios: "iOS", "cli-mcp": "CLI / MCP" } as const;
export const seoPages: Record<string, { title: string; description: string; noindex?: boolean; canonicalPath?: string }> = {
  "/": { title: "水杉输入法 MSIME｜开源中文输入法", description: "水杉输入法（MSIME）是开源中文输入法，面向 Windows、macOS、Linux、Android、iOS 与 HarmonyOS 开发，也能嵌入网页使用，支持全拼、双拼、五笔，候选词旁直接显示译文；输入引擎也作为库开放给其他输入法嵌入。查看下载、使用指南与常见问题。" },
  "/features/": { title: "功能与界面｜水杉输入法", description: "以 Windows 版为例，查看水杉输入法的候选窗、皮肤、词库与输入功能，了解设置方法和实际界面。" },
  "/download/": { title: "下载 Windows、macOS、Linux、Android 与 iOS 版｜水杉输入法", description: "下载水杉输入法 Windows、macOS 与 Linux 版本，通过蒲公英安装 Android 测试版，或通过 TestFlight 安装 iOS 版。网站开发者可以通过 npm 包把 Web 版嵌入自己的网页。" },
  "/docs/": { canonicalPath: "/docs/windows/", title: "使用文档与安装指南｜水杉输入法", description: "水杉输入法 Windows、macOS、macOS 语音、Linux、Android 与 iOS 使用指南，选择平台查看安装、配置和日常使用方法。" },
  "/faq/": { title: "常见问题与故障排查 Q&A｜水杉输入法", description: "水杉输入法常见问题与排查方法：字体方框、安装启动、快捷键、候选窗口和翻译，附相关指南及 Issue 来源。" },
  "/code/": { title: "开源仓库与贡献入口｜水杉输入法", description: "浏览水杉输入法各平台、输入引擎、词库、语言模型与文档的开源仓库，了解项目分工和贡献入口。" },
  "/model/": { title: "神经联想与整句重排模型｜水杉输入法", description: "神经联想用 4.5 MB 起的字级语言模型，在输入引擎拼出的几种整句读法里，参照已经上屏的文字挑出更通顺的一句。查看实测效果与代价、在水杉输入法中启用的方法、它和引擎库的关系，以及给其他输入法用的开源库和模型。" },
  "/engine/": { title: "引擎库：可嵌入的拼音与多语言输入引擎｜水杉输入法", description: "水杉输入法的输入引擎单独发布成库，供其他输入法嵌入：Rust 用 crates.io 上的 msime-engine，C、C++、Swift、Kotlin、Go、Python 等用预编译的 C 库。十种输入方案、词格整句、拼写纠错与学习，可选神经联想重排整句；代码 MPL-2.0，数据按各自的许可证。" },
  "/about/": { title: "关于项目与开发者｜水杉输入法", description: "了解水杉输入法的名字由来、项目理念、开源许可、签名与社区联系方式。" },
  "/price/": { title: "价格与付费计划｜水杉输入法", description: "水杉输入法当前可免费使用。查看后续自愿付费支持计划，以及第三方联网服务的费用说明。" },
  "/privacy/": { title: "隐私政策｜水杉输入法", description: "了解水杉输入法哪些功能会联网、默认状态、数据用途，以及如何关闭联网功能。" },
  "/terms/": { title: "用户协议｜水杉输入法", description: "水杉输入法账号、云同步、社区与官网等在线服务的用户协议：账号与注销、行为规范、用户发布的内容、开源许可与第三方服务。" },
  "/feedback/": { title: "问题反馈与功能建议｜水杉输入法", description: "无需 GitHub 账号，选择平台反馈问题或提出建议，支持截图与预览。提交内容将公开发布到 GitHub。" },
  "/words/": { title: "提交词条｜水杉输入法", description: "无需 GitHub 账号，为水杉输入法词库提交新词和拼音、英文单词或候选译文。词条经维护者审核后，随后续词库版本发布到所有平台。" },
  "/skins/": { title: "社区皮肤｜水杉输入法", description: "浏览水杉输入法用户公开发布的键盘皮肤和候选窗皮肤，按名称搜索，查看配色预览、下载量和评分。无需登录即可下载电脑候选窗皮肤包；键盘皮肤在水杉输入法中下载应用。" },
  "/gallery/": { title: "水杉娘画廊 Gallery｜水杉输入法", description: "认识水杉娘，浏览姿势、表情、服装与场景插画，收藏春夏秋冬的不同模样。支持按分类和名称查找、点击查看大图。" },
  "/dictionaries/": { title: "词库与回复模板｜水杉输入法", description: "浏览水杉输入法的专业词库，以及用户分享的词库和回复模板，按名称搜索，查看词条示例、收藏数和评分。专业词库可以直接下载导入；社区内容登录后可以收藏、评分，在水杉输入法的「社区」页使用。" },
  "/plugins/": { title: "插件｜水杉输入法", description: "浏览水杉输入法的官方插件和用户发布的插件：音效包、音乐包、指令表和特效包，查看版本、许可、下载量和评分。官方插件可以直接下载 .zip 导入；社区插件登录后可以收藏、评分，在水杉输入法的「社区」页下载安装。" },
  "/me/": { title: "我的｜水杉输入法", description: "管理水杉输入法账号：我的皮肤、个人词库、快捷短语、云剪贴板和收藏。", noindex: true },
  "/resume/": { title: "陆凡 | 软件工程师 / 独立开发者", description: "陆凡的软件工程师个人简历", noindex: true },
};
// Written out per guide rather than generated from the platform name. The template these replaced titled the voice guide "macOS 语音 安装与使用指南", a page with no installation section in it, and gave four pages one description that differed only by a platform name. The Traditional titles in locales.ts have always been written by hand; these mirror them.
const GUIDE_SEO: Record<keyof typeof GUIDE_NAMES, { title: string; description: string }> = {
  windows: { title: "Windows 安装与使用指南｜水杉输入法", description: "Windows 版水杉输入法完整使用指南：安装、输入方案、设置、词库与故障排查。" },
  macos: { title: "macOS 安装与使用指南｜水杉输入法", description: "macOS 版水杉输入法使用指南：安装与启用、常用操作、设置与候选窗口、备份与更新。" },
  "macos-voice": { title: "macOS 语音输入指南｜水杉输入法", description: "配置水杉输入法的 macOS 语音输入：云端识别、本地模型与系统识别、录音按键、文本整理，以及麦克风权限和数据说明。" },
  linux: { title: "Linux 安装与使用指南｜水杉输入法", description: "Linux 版水杉输入法指南：安装与首次配置、Fcitx5 与 IBus 启用、输入与快捷键、辅助码设置、数据升级与故障排查。" },
  android: { title: "Android 安装与使用指南｜水杉输入法", description: "Android 版水杉输入法指南：下载与各版本、启用键盘、升级、中英文切换、9 键与 26 键、浮动键盘、外接键盘与语音输入。" },
  ios: { title: "iOS 安装与使用指南｜水杉输入法", description: "iOS 版水杉输入法指南：TestFlight 安装与更新、启用键盘、输入方案与辅助码、皮肤与键盘、词库导入、完全访问和反馈。" },
  "cli-mcp": { title: "命令行与 MCP｜水杉输入法", description: "使用水杉输入法桌面版 CLI 查询候选、驱动完整输入会话，并配置 MCP 接入 AI 助手。" },
};
for (const [id, page] of Object.entries(GUIDE_SEO)) seoPages[`/docs/${id}/`] = page;
for (const [path, page] of Object.entries(traditionalPages)) seoPages[traditionalPath(path)] = path === "/docs/" ? { ...page, canonicalPath: "/zh-TW/docs/windows/" } : page;

export const normalizePath = (path: string) => path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`;
export const markdownPath = (path: string) => path === "/" ? "/index.md" : `${normalizePath(path).slice(0, -1)}.md`;
export function pageSeo(path: string) {
  const normalized = normalizePath(path);
  const page = seoPages[normalized];
  return { ...(page ?? { title: "页面不存在｜水杉输入法", description: "这个地址没有内容，请返回首页或查看使用文档。", noindex: true }), language: isTraditional(normalized) ? "zh-Hant-TW" : "zh-CN", path: normalized, canonicalPath: page?.canonicalPath ?? normalized, canonical: page ? `${SITE_ORIGIN}${page.canonicalPath ?? normalized}` : undefined };
}
/** 接入栏目里两页介绍的开源库，给结构化数据用。 */
const OPEN_SOURCE_LIBRARIES: Record<string, object> = {
  "/engine/": { name: "msime-engine", codeRepository: "https://github.com/metasequoiaime/msime", programmingLanguage: ["Rust", "C"], license: "https://www.mozilla.org/MPL/2.0/", sameAs: ["https://crates.io/crates/msime-engine", "https://crates.io/crates/msime-engine-capi", "https://docs.rs/msime-engine"] },
  "/model/": { name: "chinese-ime-lm", codeRepository: "https://github.com/metasequoiaime/chinese-ime-lm", programmingLanguage: "Rust", license: "https://www.apache.org/licenses/LICENSE-2.0", sameAs: ["https://crates.io/crates/chinese-ime-lm", "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-4M"] },
};
export function structuredData(path: string) {
  const requested = pageSeo(path);
  const page = pageSeo(requested.canonicalPath);
  if (page.noindex || !page.canonical) return undefined;
  const organization = { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: isTraditional(path) ? "水杉輸入法" : SITE_NAME, url: `${SITE_ORIGIN}/`, logo: `${SITE_ORIGIN}/msime-logo.png`, sameAs: ["https://github.com/metasequoiaime"] };
  const graph: object[] = [organization, { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: SITE_NAME, alternateName: "MSIME", inLanguage: page.language, publisher: { "@id": organization["@id"] } }, {
    "@type": "WebPage", "@id": `${page.canonical}#webpage`, url: page.canonical, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
  }];
  if (page.path === "/") graph.push({ "@type": "SoftwareApplication", "@id": `${SITE_ORIGIN}/#software`, name: SITE_NAME, alternateName: ["MSIME", "MetasequoiaIME"], applicationCategory: "UtilitiesApplication", operatingSystem: ["Windows", "macOS", "Linux"], url: `${SITE_ORIGIN}/`, downloadUrl: `${SITE_ORIGIN}/download/`, isAccessibleForFree: true, offers: { "@type": "Offer", price: 0, priceCurrency: "CNY", url: `${SITE_ORIGIN}/price/` }, license: "https://github.com/metasequoiaime/MSIME-Web/blob/main/LICENSE", publisher: { "@id": organization["@id"] } });
  // 接入栏目的两页各讲一个可以拿去用的开源库，标成 SoftwareSourceCode，搜索引擎才知道这是代码库而不只是一篇介绍。简繁两页说的是同一个库。
  const library = OPEN_SOURCE_LIBRARIES[page.path.replace(/^\/zh-TW\//, "/")];
  if (library) graph.push({ "@type": "SoftwareSourceCode", "@id": `${page.canonical}#code`, ...library, description: page.description, url: page.canonical, publisher: { "@id": organization["@id"] } });
  if (page.path !== "/" && page.path !== "/zh-TW/") {
    const crumbs = [{ "@type": "ListItem", position: 1, name: isTraditional(path) ? "首頁" : "首页", item: `${SITE_ORIGIN}${isTraditional(path) ? "/zh-TW/" : "/"}` }];
    crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: page.title.split("｜")[0], item: page.canonical });
    graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
