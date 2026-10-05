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
 * The design lists the first two groups; the third adds the Homebrew tap it leaves out. The skin repositories, organisation files and early prototypes are deliberately not listed. Descriptions follow each repository's own GitHub description and README.
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
    title: "词库、模型与数据",
    repositories: [
      { name: "chinese-ime-lm", description: "面向中文输入法的语言模型：语料、n-gram 统计、字级神经模型与评测集" },
      { name: "msime-dictionary", description: "多语言词库源数据：拼音、五笔、英文、粤拼、注音、笔画、日文、韩文，以及自定义词条、候选窗翻译与专业词库，构建结果以 dict-v* Release 发布；官网“词库缺失反馈”的提交会汇总到这里的 Pull Request" },
      { name: "msime-plugins", description: "官方插件：按键音效、旋律、背景音乐、/ 指令表与打字特效，通过 CI 校验后可下载 .zip 导入" },
    ],
  },
  {
    title: "分发",
    repositories: [
      { name: "homebrew-tap", description: "macOS 版的 Homebrew 安装源，每次发布后自动更新" },
    ],
  },
];

export const repositoryUrl = (name: string) => `${ORG_URL}/${name}`;
