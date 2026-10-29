/** GitHub organisation that hosts every repository on the code page. */
export const ORG_URL = "https://github.com/metasequoiaime";

/** The organisation's archived repositories (the pre-merge MSIME-Engine, MSIME-Linux, MSIME-UI…), which keep their history and releases. */
export const ARCHIVED_REPOS_URL = "https://github.com/orgs/metasequoiaime/repositories?q=archived%3Atrue";

export type Repository = {
  /** Repository name exactly as on GitHub, or the package name when `href` is given. */
  name: string;
  description: string;
  /** Where the row links when it is a package published from a repository rather than a repository of its own (the engine crates on crates.io); otherwise the link is built from `name`. */
  href?: string;
};

export type RepositoryGroup = {
  title: string;
  /** This site's page that explains the group, linked under its title. */
  page?: { to: "/engine/"; label: string };
  repositories: readonly Repository[];
};

/**
 * The organisation's product repositories, grouped as on the design's code page, plus the engine crates that other input methods embed.
 *
 * The skin repositories, organisation files, distribution taps and early prototypes are deliberately not listed. Descriptions follow each repository's own GitHub description and README, and for the crates their READMEs in msime (crates/engine, crates/engine-capi).
 */
export const REPOSITORY_GROUPS: readonly RepositoryGroup[] = [
  {
    title: "主仓库与服务",
    repositories: [
      { name: "msime", description: "主仓库：六个平台的原生宿主（Windows 正式版由 msime-windows 发布）、Rust 输入引擎与网页引擎 @msime/web-engine" },
      { name: "msime-windows", description: "Windows 产品：TSF、Server、GUI、设置页与安装器" },
      { name: "msime-cloud", description: "水杉云：共通 Go 后端，提供云候选、AI 联想、翻译、语音识别与 Swagger 接口文档" },
      { name: "msime-docs", description: "用户指南与架构文档" },
      { name: "msime-web", description: "官网 msime.app 的源代码" },
    ],
  },
  {
    title: "引擎库",
    page: { to: "/engine/", label: "接入说明 →" },
    repositories: [
      { name: "msime-engine", href: "https://crates.io/crates/msime-engine", description: "水杉输入法的输入引擎，作为 Rust 库发布在 crates.io，MPL-2.0：全拼、双拼、五笔、日文、韩文等十种方案，词格整句、拼写纠错与学习，其他输入法可以直接嵌入" },
      { name: "msime-engine-capi", href: "https://crates.io/crates/msime-engine-capi", description: "引擎的 C 接口：头文件、共享库与静态库和 pkg-config 文件，GitHub Releases 上有 Linux、macOS、Windows 的预编译库与最小数据包；C、C++、Swift、Kotlin、Go、Python 等都能调用" },
    ],
  },
  {
    title: "词库、模型与数据",
    repositories: [
      { name: "chinese-ime-lm", description: "面向中文输入法的语言模型：语料、n-gram 统计、字级神经模型与评测集；推理库已在 crates.io 发布，Rust 用 chinese-ime-lm，C、C++、Swift 等宿主用 chinese-ime-lm-ffi" },
      { name: "msime-dictionary", description: "多语言词库源数据：拼音、五笔、英文、粤拼、注音、笔画、日文、韩文，以及自定义词条、候选窗翻译与专业词库，构建结果以 dict-v* Release 发布；官网“词库缺失反馈”的提交会汇总到这里的 Pull Request" },
    ],
  },
];

export const repositoryUrl = (name: string) => `${ORG_URL}/${name}`;
