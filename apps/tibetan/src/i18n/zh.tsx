import type { Messages } from "./types";

export const zh: Messages = {
  languageName: "中文",
  switchLabel: "查看中文版",
  skipToContent: "跳到正文",
  nav: { label: "页面", home: "首页", download: "下载", guide: "指南", faq: "常见问题" },
  theme: { label: "配色", light: "亮色", dark: "暗色", system: "跟随系统" },
  footer: { fullProduct: "水杉输入法 · msime.app", source: "GitHub", feedback: "反馈", privacy: "隐私政策", terms: "用户协议" },
  home: {
    eyebrow: "水杉藏文 · MSIME Tibetan",
    title: "在拉丁键盘上输入藏文",
    lead: "水杉藏文是只带藏文方案的水杉输入法独立版本。按 EWTS（扩展威利转写）敲拉丁字母，输入时直接显示藏文。支持 macOS、Linux、Android 和 Windows 预览版。",
    download: "下载",
    guide: "查看指南",
    demoTitle: "示例",
    demoKeys: "按键",
    demoResult: "结果",
    featuresTitle: "特点",
    features: [
      { title: "按 EWTS 拼写", body: "边敲拉丁字母边看到藏文，区分大小写。" },
      {
        title: "音节点与垂符",
        body: (
          <>
            空格结束音节并补上音节点 <code>་</code>，<code>/</code> 补上垂符 <code>།</code>；<kbd>Enter</kbd> 只上屏藏文，不加音节点。
          </>
        ),
      },
      {
        title: "叠写与消歧",
        body: (
          <>
            <code>+</code> 叠写字母，<code>.</code> 把容易连读的字母分开，<code>'</code> 写小 a（འ་ཆུང་）。
          </>
        ),
      },
      {
        title: "随时看回原文",
        body: (
          <>
            第一次按 <kbd>Esc</kbd> 把显示换回你敲的拉丁字母，第二次取消输入。
          </>
        ),
      },
      { title: "没有候选，不学习", body: "拼写直接对应藏文，没有候选可选；不从你的输入中学习，也不需要下载词库。" },
      { title: "与水杉输入法共存", body: "水杉藏文是独立的应用，可以和完整版水杉输入法同时安装，输入法、设置和数据互不影响。" },
    ],
    platformsTitle: "支持的平台",
    platforms: [
      { name: "macOS", note: "macOS 13 及以上 · Apple 芯片与 Intel", available: true },
      { name: "Linux", note: "x86_64 · aarch64 · Fcitx5 · IBus", available: true },
      { name: "Android", note: "Android 9 及以上", available: true },
      { name: "Windows", note: "未签名预览版", available: true },
      { name: "iOS · HarmonyOS", note: "暂无", available: false },
    ],
    fullTitle: "完整版水杉输入法",
    fullBody: "水杉藏文是从水杉输入法（MSIME）里分出来的单方案版本。需要全拼、双拼、五笔、日语、韩语等全部方案时，请使用 msime.app 上的完整版。",
    fullLink: "前往 msime.app",
  },
  download: {
    title: "下载水杉藏文",
    lead: "所有安装包都来自 GitHub Release。下载后请核对 SHA-256。",
    version: "版本",
    size: "大小",
    published: "发布日期",
    github: "从 GitHub 下载",
    mirror: "国内镜像",
    releasePage: "发布页",
    macos: {
      note: "macOS 13 及以上，Apple 芯片与 Intel 通用。也可以用 Homebrew 安装。",
      missing: "最新的 macOS 发布里还没有水杉藏文安装包，请到发布页查看。",
    },
    linux: {
      note: "Debian 12+ / Ubuntu 22.04+ 与 Fedora 44，同一个包同时提供 Fcitx5 和 IBus 入口。",
      missing: "最新的 Linux 发布里没有水杉藏文安装包，请到发布页查看。",
      formats: { deb: "Debian / Ubuntu", rpm: "Fedora", "tar.gz": "不经 apt 安装的 Debian 系" },
    },
    android: {
      note: "Android 9 及以上。商店外安装需要允许浏览器或文件管理器“安装未知应用”。",
      missing: "最新的 Android 发布里没有水杉藏文 APK，请到发布页查看。",
    },
    windows: {
      badge: "未签名预览版",
      note: "来自 msime 仓库的预览版，安装包没有代码签名，Windows 可能提示发布者未知。Windows 正式版（Metasequoia IME 水杉输入法）不含藏文。",
      missing: (
        <>
          最新的预览版里没有水杉藏文安装包。请在 msime 的发布列表里找以 <code>windows-v</code> 开头的版本。
        </>
      ),
    },
    other: {
      title: "iOS · HarmonyOS",
      body: (
        <>
          iPhone、iPad 和 HarmonyOS 目前没有水杉藏文。完整版水杉输入法的下载见 <a href="https://msime.app/download/">msime.app/download</a>。
        </>
      ),
    },
    verify: {
      title: "核对 SHA-256",
      body: "把下载文件的 SHA-256 与上面列出的值对比：macOS 用 shasum -a 256，Linux 用 sha256sum，Windows 用 Get-FileHash。",
    },
  },
  guide: files => ({
    title: "安装与输入指南",
    lead: "各平台的安装和启用步骤，以及用 EWTS 输入藏文的规则。",
    toc: "目录",
    platforms: [
      {
        id: "macos",
        title: "macOS",
        body: "macOS 13 及以上。",
        steps: [
          <>
            在下载页下载 macOS 安装包并安装，或者用 Homebrew：
            <pre>brew install --cask metasequoiaime/tap/msime-tibetan</pre>
          </>,
          "在“应用程序”里打开水杉藏文，按提示完成安装。",
          "这台 Mac 从没装过水杉输入法时，需要注销并重新登录一次。",
          <>
            输入法菜单里没有它时，在<b>“系统设置 → 键盘 → 文字输入 → 输入法 → 编辑…”</b>里，从“藏语”下添加水杉藏文。
          </>,
          <>
            用 <kbd>Control + Space</kbd> 切换到水杉藏文。
          </>,
        ],
      },
      {
        id: "linux",
        title: "Linux",
        body: "Debian / Ubuntu 与 Fedora，x86_64 和 aarch64。",
        steps: [
          <>
            在下载页下载安装包并安装：Debian / Ubuntu 用 apt，Fedora 用 dnf；ARM64 设备换成 aarch64 的文件。
            <pre>{`sudo apt install ./${files.deb}\nsudo dnf install ./${files.rpm}`}</pre>
          </>,
          <>
            做一次首次配置：在应用列表里打开水杉藏文，或者运行
            <pre>msime-linux-tibetan-setup --download</pre>
          </>,
          <>
            配置完成后，Fcitx5 和 IBus 会在“藏语”下列出水杉藏文，IBus 中显示为“Metasequoia 水杉藏文”。没有自动加入时，用 <code>fcitx5-configtool</code> 添加，或执行 <code>ibus restart</code> 后在桌面输入源里添加。
          </>,
        ],
      },
      {
        id: "android",
        title: "Android",
        body: "Android 9 及以上。",
        steps: [
          "在下载页下载 APK 并安装。商店外安装需要允许“安装未知应用”。",
          <>
            打开系统的<b>“设置 → 系统 → 语言和输入法 → 屏幕键盘”</b>，打开水杉藏文的开关。各品牌手机的菜单名称略有不同。
          </>,
          "点任意输入框，再点右下角的键盘图标，选择水杉藏文。",
          <>
            使用完整版水杉输入法时，在<b>“设置 → 输入 → 语言与方案”</b>的<b>“添加语言”</b>里添加<b>“藏语”</b>。
          </>,
        ],
      },
      {
        id: "windows",
        title: "Windows",
        body: "未签名预览版。",
        steps: [
          <>
            在下载页下载 <code>MetasequoiaIME-Tibetan_Setup</code> 并运行。
          </>,
          "安装包没有代码签名，Windows 可能提示发布者未知。确认文件来自 GitHub 且 SHA-256 一致后再继续。",
          "它可以和 Windows 正式版（Metasequoia IME 水杉输入法）同时安装。",
          <>
            用 <kbd>Win + Space</kbd> 切换到水杉藏文。
          </>,
        ],
      },
    ],
    typingTitle: "输入规则",
    typingLead: "水杉藏文使用 EWTS（扩展威利转写）。输入时组字区显示转换后的藏文，区分大小写。",
    keyColumn: "按键",
    effectColumn: "作用",
    keys: [
      { key: <code>a–z</code>, effect: <>EWTS 字母，<code>q</code> <code>x</code> 除外。</> },
      { key: <code>A D H I M N R S T U W X Y</code>, effect: <>大写字母：<code>Ta</code> → ཊ，<code>kA</code> → ཀཱ，<code>oM</code> → ཨོཾ。</> },
      { key: <kbd>Space</kbd>, effect: <>结束音节并补上音节点 <code>་</code>。</> },
      { key: <code>/</code>, effect: <>结束音节并补上垂符 <code>།</code>；以 ང 结尾时自动写成 <code>ང་།</code>；没有输入时单独输出垂符。</> },
      { key: <kbd>Enter</kbd>, effect: "只上屏藏文，不加音节点。" },
      { key: <code>+</code>, effect: <>叠写：<code>pad+ma</code> → པདྨ</> },
      { key: <code>.</code>, effect: <>分开字母：<code>g.yag</code> → གཡག，<code>gyag</code> → གྱག</> },
      { key: <code>'</code>, effect: <>小 a：<code>'od</code> → འོད</> },
      { key: <code>-</code>, effect: <>反写元音：<code>k-i</code> → ཀྀ</> },
      { key: <kbd>Backspace</kbd>, effect: "删掉一个拉丁字母按键。" },
      { key: <kbd>Esc</kbd>, effect: "第一次显示拉丁原文，第二次取消。" },
      { key: <>B O q x …</>, effect: "EWTS 用不到的字母：先上屏已输入的藏文，再原样输出这个字母。" },
    ],
    examplesTitle: "示例",
    examplesLead: "按键中的空格指空格键。",
    typedColumn: "按键",
    resultColumn: "结果",
  }),
  faq: {
    title: "常见问题",
    lead: "关于水杉藏文的常见问题。",
    items: [
      {
        id: "coexist",
        q: "水杉藏文能和水杉输入法同时安装吗？",
        a: "可以。在 macOS、Linux 和 Android 上，水杉藏文是独立的应用，可以和完整版同时安装和启用，输入法、设置和数据各自独立。",
      },
      {
        id: "first-use",
        q: "第一次使用要下载数据吗？",
        a: "藏文输入不需要词库，没有要为它下载的数据。Linux 上安装后要做一次首次配置；macOS 上如果这台 Mac 从没装过水杉输入法，需要注销并重新登录一次。",
      },
      {
        id: "ios",
        q: "iPhone 和 HarmonyOS 能用吗？",
        a: "目前不能。iOS 和 HarmonyOS 没有水杉藏文。",
      },
      {
        id: "windows",
        q: "Windows 上能用吗？",
        a: "Windows 正式版（Metasequoia IME 水杉输入法）不含藏文。水杉藏文只在 msime 仓库的预览版里提供，安装包没有代码签名，安装时 Windows 可能提示发布者未知。",
      },
      {
        id: "case",
        q: "区分大小写吗？开着 Caps Lock 会怎样？",
        a: (
          <>
            区分。<code>T</code> <code>D</code> <code>N</code> 是 ཊ ཌ ཎ，<code>A</code> <code>I</code> <code>U</code> 是长元音，<code>M</code> 是 ཾ，<code>H</code> 是 ཿ。敲到 EWTS 用不到的字母（<code>B</code> <code>O</code> <code>q</code> <code>x</code> 等）时，先上屏已输入的藏文，再原样输出这个字母。
          </>
        ),
      },
      {
        id: "latin",
        q: "怎样输入拉丁字母？",
        a: (
          <>
            输入后按一次 <kbd>Esc</kbd>，显示换回拉丁原文，再按 <kbd>Enter</kbd> 原样上屏；第二次按 <kbd>Esc</kbd> 取消。
          </>
        ),
      },
      {
        id: "candidates",
        q: "为什么没有候选窗？",
        a: "EWTS 的拼写和藏文一一对应，没有需要挑选的候选。水杉藏文也不从你的输入中学习。",
      },
      {
        id: "uninstall",
        q: "怎样卸载？",
        a: (
          <>
            macOS：在水杉藏文的设置里打开<b>“维护与诊断 → 卸载”</b>；用 Homebrew 安装的运行 <code>brew uninstall --cask msime-tibetan</code>。Linux：<code>sudo apt remove msime-linux-tibetan</code> 或 <code>sudo dnf remove msime-linux-tibetan</code>，卸载不删除用户数据。
          </>
        ),
      },
      {
        id: "licence",
        q: "用了哪些开源组件？",
        a: (
          <>
            EWTS 到藏文的转换由开源的 <a href="https://crates.io/crates/ewts">ewts</a>（MIT / Apache-2.0）完成。水杉输入法的源码在 <a href="https://github.com/metasequoiaime/msime">GitHub</a> 上。
          </>
        ),
      },
      {
        id: "feedback",
        q: "遇到问题去哪里反馈？",
        a: (
          <>
            到 GitHub 的 <a href="https://github.com/metasequoiaime/msime/issues">msime Issues</a> 提交；没有 GitHub 账号时可以用 <a href="https://msime.app/feedback/">msime.app/feedback</a>。请写明版本、系统和复现步骤。
          </>
        ),
      },
    ],
  },
  notFound: {
    title: "页面不存在",
    body: "这个地址下没有内容，可能是链接过期或输错了。",
    home: "回到首页",
    guide: "查看指南",
  },
};
