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
 * Every active (non-archived) repository of the organisation, grouped as on the design's code page.
 *
 * The design lists the first two groups; the last two hold the active repositories it leaves out (skins, the Homebrew tap, organisation files and early prototypes), so the page stays a complete index of what is live. Descriptions follow each repository's own GitHub description and README.
 */
export const REPOSITORY_GROUPS: readonly RepositoryGroup[] = [
  {
    title: "主仓库与服务",
    repositories: [
      { name: "msime", description: "主仓库：macOS、Linux、Android、iOS、HarmonyOS 原生宿主与 Rust 输入引擎" },
      { name: "msime-windows", description: "Windows 产品：TSF、Server、GUI、设置页与安装器" },
      { name: "msime-backend", description: "共通 Go 后端：云候选、AI 联想、翻译、语音识别与 Swagger 接口文档" },
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
  {
    title: "组织文件与早期项目",
    repositories: [
      { name: ".github", description: "组织级公共文件：组织主页、贡献指南、行为准则、安全策略与招募说明" },
      { name: "Google-PinyinIME-Rev", description: "为水杉输入法整理和修改的原 Android 谷歌拼音输入法引擎" },
      { name: "pinyin_python", description: "拼音切分与候选查询的 Python 早期原型" },
      { name: "pinyin_cpp", description: "全拼、双拼候选查询的 C++ 早期原型，基于 SQLite 词库" },
      { name: "msime-backup", description: "共享客户端早期工程的备份：Rust 客户端运行时与 Tauri React 设置界面" },
    ],
  },
];

export const repositoryUrl = (name: string) => `${ORG_URL}/${name}`;
