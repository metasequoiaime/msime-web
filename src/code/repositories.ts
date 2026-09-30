/** GitHub organisation that hosts every repository on the code page. */
export const ORG_URL = "https://github.com/metasequoiaime";

/** The organisation's archived repositories (the pre-merge MSIME-Engine, MSIME-Linux, MSIME-UI…), which keep their history and releases. */
export const ARCHIVED_REPOS_URL = "https://github.com/orgs/metasequoiaime/repositories?q=archived%3Atrue";

export type Repository = {
  /** Repository name exactly as on GitHub; the link is built from it. */
  name: string;
  description: string;
};

export type RepositoryGroup = {
  title: string;
  repositories: readonly Repository[];
};

/**
 * The organisation's product repositories, grouped as on the design's code page.
 *
 * The design lists the first two groups; the third adds the skin and distribution repositories it leaves out. Organisation files and early prototypes are deliberately not listed. Descriptions follow each repository's own GitHub description and README.
 */
export const REPOSITORY_GROUPS: readonly RepositoryGroup[] = [
  {
    title: "主仓库与服务",
    repositories: [
      { name: "msime", description: "主仓库：macOS、Linux、Android、iOS、HarmonyOS 原生宿主与 Rust 输入引擎" },
      { name: "msime-windows", description: "Windows 产品：TSF、Server、GUI、设置页与安装器" },
      { name: "msime-cloud", description: "水杉云：共通 Go 后端，提供云候选、AI 联想、翻译、语音识别与 Swagger 接口文档" },
      { name: "MSIME-Docs", description: "用户指南与架构文档" },
      { name: "msime-web", description: "官网 msime.app 的源代码" },
    ],
  },
  {
    title: "词库、模型与数据",
    repositories: [
      { name: "chinese-ime-lm", description: "面向中文输入法的语言模型：语料、n-gram 统计、字级神经模型与评测集" },
      { name: "msime-customdict", description: "自造词、人名、英文词条与候选窗翻译补丁；官网“词库共建”的提交会汇总到这里的 Pull Request" },
      { name: "ime-dictionary", description: "早期词库源数据与构建脚本，现行词库已并入主仓库，这里保留历史与已有 Release" },
    ],
  },
  {
    title: "皮肤与分发",
    repositories: [
      { name: "msime-skins", description: "Windows 版外部皮肤合集，支持横排、竖排布局与深浅色主题" },
      { name: "msime-skin-example", description: "候选窗皮肤的最小示例：skin.toml 声明配色与装饰几何，附预览页和安装脚本" },
      { name: "homebrew-tap", description: "macOS 版的 Homebrew 安装源，每次发布后自动更新" },
    ],
  },
];

export const repositoryUrl = (name: string) => `${ORG_URL}/${name}`;
