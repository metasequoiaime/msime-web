/**
 * Simplified Chinese messages: the only locale of wubi.msime.app.
 *
 * Strings may use two inline marks, rendered by src/rich.tsx: `code` in backticks, and [text](url) links. Everything else is plain text.
 *
 * Facts come from the pinned MSIME-Docs guides (vendor/MSIME-Docs/guides) and the msime repository; the comment above each block names the source.
 */

export const zh = {
  shell: {
    siteName: "水杉五笔",
    homeLabel: "水杉五笔首页",
    skipToContent: "跳到正文",
    navLabel: "站点导航",
    nav: { home: "首页", download: "下载", guide: "使用指南", faq: "常见问题" },
    download: "下载",
    menu: "菜单",
    menuOpen: "打开导航菜单",
    menuClose: "关闭导航菜单",
    appearance: "外观",
    theme: "主题",
    themes: { light: "亮色", dark: "暗色", system: "跟随系统" },
    season: "季节皮肤",
    seasonNow: "当前",
    seasons: {
      auto: { name: "自动", sub: "按月份切换" },
      spring: { name: "春", sub: "新芽 · 嫩绿" },
      summer: { name: "夏", sub: "盛夏 · 翠绿" },
      autumn: { name: "秋", sub: "霜叶 · 赭红" },
      winter: { name: "冬", sub: "落叶 · 霜蓝" },
    },
    backToTop: "回到顶部",
    footer: {
      about: "水杉五笔是开源多平台输入法水杉输入法（MSIME）只带五笔的独立版本。",
      edition: "本站",
      project: "水杉输入法",
      fullSite: "完整版水杉输入法",
      fullDownload: "完整版下载",
      feedback: "问题反馈",
      issues: "GitHub Issues",
      source: "源代码",
      privacy: "隐私政策",
      terms: "用户协议",
      others: "其他单独版本",
    },
    notFound: {
      title: "页面不存在",
      body: "这个地址下没有内容，可能是链接过期或输错了。可以回到首页，或者直接去下载页。",
      home: "回到首页",
      download: "下载水杉五笔",
    },
    loadError: { eyebrow: "加载失败", title: "页面暂时无法加载", body: "网站可能刚刚更新，或网络连接暂时中断。请重新加载页面。", reload: "重新加载", home: "返回首页" },
  },

  platforms: { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iOS" },

  home: {
    badge: "开源五笔输入法 · 86 / 98",
    title: "水杉五笔",
    // android.md:10, editions.json (input_schemes, preference_defaults.wubi_mixed_pinyin), macos.md:7, linux.md:34
    lead: "水杉输入法（MSIME）只带五笔的独立版本：86 与 98 两套码表，四码唯一自动上屏，五笔拼音混输默认打开。macOS、Linux 和 Android 上单独安装，和完整版各用各的设置与词库，可以同时装。",
    download: "下载水杉五笔",
    guide: "使用指南",
    fullNote: "需要全拼、双拼或其他语言？请用[完整版水杉输入法](https://msime.app/)。",
    sample: {
      title: "编码示例",
      // crates/engine/src/wubi/lookup.rs note (你 → wq, wqiy), windows.md:404 (你好 wbgq), z reverse lookup note
      rows: [
        { keys: "wq", result: "你", note: "简码" },
        { keys: "wqiy", result: "你", note: "全码" },
        { keys: "wbgq", result: "你好", note: "词组" },
        { keys: "zni", result: "你 wqiy", note: "z 拼音反查" },
      ],
    },
    featuresTitle: "为五笔打字准备的功能",
    featuresLead: "五笔的规则和开关，在 macOS、Linux、Android、iOS 上由同一个开源引擎实现。",
    features: [
      // ios.md:23, macos.md:63, android.md:51, migration.md:34, windows.md:117
      { title: "86 与 98 码表", body: "macOS、Linux、Android 和 iOS 可以在 86 和 98 之间切换，两版各用各的词库，个人词条和调频记录分开保存。Windows 正式版目前提供 86。" },
      // windows.md:151, packages/ui/src/settings/wubi-section.tsx
      { title: "四码上屏与顶字", body: "四码只有唯一候选时自动上屏；打满四码后接着敲字母，首选被顶上屏，这个字母留作下一个字的开头。" },
      // windows.md:153, editions.json, wubi reverse lookup note (完整版默认关掉混输)
      { title: "五笔拼音混输", body: "同一串字母同时查五笔码表和全拼，五笔候选在前、拼音候选在后，编码打不出时直接出拼音候选。水杉五笔默认打开。" },
      // wubi reverse lookup and input switches notes, windows.md:154
      { title: "z 键反查与通配", body: "以 `z` 开头临时用拼音找字，候选后面标出它的五笔编码；也可以改用 z 键通配，让 `z` 代替拿不准的那一码。" },
      // ios.md:23, wubi-section.tsx
      { title: "剩余编码提示", body: "打开「候选显示剩余编码」，候选后面会标出还要再打哪几个字母才能单独打出它。" },
      // wubi reverse lookup note, crates/engine/src/wubi/lookup.rs
      { title: "五笔查码", body: "在设置里输入或粘贴汉字，列出每个字和整段词的 86、98 编码，自己加的五笔词也查得到。" },
      // windows.md:376-430, migration.md:34, ios.md:41
      { title: "词库导入与导出", body: "86、98 用户词库分开保存；可以导入 Rime 的 `.dict.yaml` 五笔词库和「词语、编码、权重」文本，也可以导出备份。" },
      // msime-engine-dictionary-NOTICE.md, docs/third-party.md
      { title: "开源码表数据", body: "86 码表取自极点码表（Apache-2.0），98 取自 98 五笔小组码表（Unlicense）与 Fcitx 码表（GPL-3.0-or-later），生成的补充词组按 GPL-3.0 发布。" },
    ],
    platformsTitle: "在哪些平台上用",
    platformsLead: "三个平台有独立安装包，另外两个平台用完整版，在设置里选五笔。",
    standalone: "独立安装包",
    viaFull: "完整版内选五笔",
    platformCards: {
      // macos.md:3,7,23; platforms/macos/README.md (pkg)
      macos: "macOS 13 及以上，Apple 芯片与 Intel 通用的 pkg 安装包；也可以用 Homebrew 安装 `msime-wubi`。",
      // linux.md:3,34
      linux: "x86_64 与 aarch64 的 deb、rpm 和 tar.gz，同时提供 Fcitx5 与 IBus 入口，装在 `/opt/msime-linux-wubi` 下。",
      // android.md:3,10,12
      android: "Android 9 及以上的测试版 APK，只带五笔和手写，是和完整版不同的应用，可以同时安装。",
      // windows.md:3,117; faq.md:124-133
      windows: "Windows 正式版是完整版，包含 86 五笔；msime 仓库的新版预览按版本提供单独的五笔安装包，尚未签名。",
      // ios.md:5,21,23
      ios: "通过 TestFlight 安装完整版水杉输入法，在 App 的「设置 → 输入」打开五笔，「码表」选 86 或 98。",
    },
    ctaTitle: "开始用水杉五笔",
    ctaBody: "下载页列出每个平台的安装包、大小和 SHA-256；装好后按使用指南启用。",
    ctaDownload: "前往下载",
    ctaGuide: "阅读使用指南",
  },

  download: {
    title: "下载水杉五笔",
    lead: "macOS、Linux 和 Android 有水杉五笔的独立安装包。下载后请核对 SHA-256；访问 GitHub 慢时可以用国内镜像，文件与 GitHub Release 相同。",
    version: "版本",
    size: "大小",
    published: "发布于",
    github: "GitHub 下载",
    mirror: "国内镜像",
    sha256: "SHA-256",
    copy: "复制 SHA-256",
    copied: "已复制 SHA-256",
    releasePage: "发布页",
    loading: "正在读取发布清单…",
    failed: "发布清单暂时读不到。可以直接打开 [msime Releases](https://github.com/metasequoiaime/msime/releases)，找名字含 `wubi` 的安装包。",
    manifestTime: "清单生成于",
    formats: {
      pkg: "pkg 安装包",
      deb: "Debian / Ubuntu（.deb）",
      rpm: "Fedora 等 DNF 系统（.rpm）",
      "tar.gz": "不经 apt 安装的 Debian 系（.tar.gz）",
      apk: "APK",
      exe: "安装程序（.exe）",
    },
    arch: { universal: "Apple 芯片与 Intel", x86_64: "x86_64", aarch64: "aarch64（ARM64）", arm64: "arm64" },
    macos: {
      // macos.md:3; platforms/macos/README.md (pkg, admin password)
      requirement: "macOS 13 及以上 · Apple 芯片与 Intel 通用",
      missing: "这一版的清单里还没有水杉五笔的 pkg，请在发布页上下载文件名含 `wubi` 的 pkg。",
      // macos.md:19,23
      brew: "也可以用 Homebrew 安装：`brew install --cask metasequoiaime/tap/msime-wubi`",
      next: "安装需要管理员密码。装好后按使用指南在系统设置里添加输入法。",
    },
    linux: {
      // linux.md:20,34,42
      requirement: "x86_64 与 aarch64 · Fcitx5 与 IBus",
      missing: "这一版的清单里没有水杉五笔的 Linux 安装包，请在发布页上查找文件名含 `wubi` 的包。",
      note: "`.deb` 和 `.tar.gz` 要求 glibc 2.35、WebKitGTK 4.1 与 libsoup 3 及以上，`.rpm` 面向 Fedora 44。安装后运行 `msime-linux-wubi-setup --download` 完成首次配置。",
    },
    android: {
      // android.md:3,10,17
      requirement: "Android 9 及以上 · 测试版",
      missing: "这一版的清单里没有 `msime-android-wubi.apk`，请在发布页上查找。",
      note: "安装商店外的 APK 时，系统可能提示风险，需要允许浏览器或文件管理器「安装未知应用」。",
    },
    windows: {
      requirement: "Windows 10 / 11",
      // faq.md:124-133, windows.md:117
      stableTitle: "正式版（完整版，含 86 五笔）",
      stableBody: "Windows 日常使用请装正式版「Metasequoia IME 水杉输入法」，它是完整版，在设置的「输入方案」里选五笔即可。",
      stableAction: "前往 msime.app 下载",
      previewTitle: "新版预览（水杉五笔独立安装包）",
      previewPill: "未签名预览",
      previewBody: "msime 仓库的新版 Windows 以预发布提供，安装包尚未启用代码签名，安装时 Windows 可能提示发布者未知。它和正式版使用各自的注册信息和数据目录，可以同时安装。",
      previewMissing: "当前预览版 windows-v{version} 没有单独的水杉五笔安装包。",
    },
    ios: {
      requirement: "iOS 17 及以上 · iPhone 与 iPad",
      // ios.md:3,7,21,23
      body: "iOS 没有单独的五笔版本。通过 TestFlight 安装完整版水杉输入法，在 App 的「设置 → 输入」里打开五笔，「五笔」一组的「码表」可选 86 或 98。",
      action: "前往 msime.app 下载",
    },
  },

  guide: {
    title: "水杉五笔使用指南",
    lead: "各平台的安装与启用步骤，以及五笔的打字规则。内容依据水杉输入法的官方使用指南和源码；界面上的设置名称照原文引用。",
    toc: "本页目录",
    sections: {
      install: "安装与启用",
      typing: "打字规则",
      mixed: "五笔拼音混输",
      zkey: "z 键：拼音反查与通配",
      hints: "剩余编码提示",
      lookup: "五笔查码",
      dictionary: "用户词库与导入",
    },
    install: {
      macos: {
        // platforms/macos/README.md (pkg), macos.md:7-23,51
        steps: [
          "从[下载页](/download/)下载 `msime-macos-wubi-<版本>-universal.pkg`，打开后按安装器的步骤安装，需要输入管理员密码。也可以运行 `brew install --cask metasequoiaime/tap/msime-wubi`。",
          "安装结束时设置应用会自动打开。这台 Mac 第一次装水杉时，按提示注销并重新登录。",
          "在「系统设置 → 键盘 → 文字输入 → 输入法 → 编辑…」中添加水杉五笔，再在菜单栏的输入法菜单里选中它。",
          "五笔码表不在安装包里，设置应用在用到五笔时自动下载，需要能访问 GitHub。",
        ],
        note: "水杉五笔与完整版的输入源、设置和数据彼此独立，可以同时安装。",
      },
      linux: {
        // linux.md:10-48
        steps: [
          "从[下载页](/download/)下载对应架构的包和 `SHA256SUMS`，运行 `sha256sum -c SHA256SUMS --ignore-missing` 核对。",
          "Debian / Ubuntu：`sudo apt install ./msime-linux-wubi_<版本>_amd64.deb`；Fedora：`sudo dnf install ./msime-linux-wubi-<版本>-1.x86_64.rpm`。ARM64 设备换成 aarch64 的文件。",
          "运行 `msime-linux-wubi-setup --download` 完成首次配置并下载词库；加 `--no-cloud-candidates` 可以在配置时关闭云候选。",
          "配置完成后水杉五笔会加入正在运行的 Fcitx5 或 IBus。没有自动加入时，Fcitx5 用 `fcitx5-configtool` 添加，IBus 先执行 `ibus restart` 再在桌面输入源里添加。",
        ],
        note: "水杉五笔装在 `/opt/msime-linux-wubi` 下，可与完整版同时安装和启用。",
      },
      android: {
        // android.md:9-31,51
        steps: [
          "从[下载页](/download/)下载 `msime-android-wubi.apk` 安装，按提示允许「安装未知应用」。",
          "打开系统的「设置 → 系统 → 语言和输入法 → 屏幕键盘」（各品牌名称略有不同），打开水杉五笔的开关。",
          "点任意输入框，再点右下角的键盘图标，选择水杉五笔。",
          "在 App 的「设置 → 输入 → 语言与方案」里点「普通话」，可以在五笔 86 和 98 之间选择。",
        ],
        note: "水杉五笔只带五笔和手写，默认打开五笔拼音混输；它和完整版是不同的应用，设置和词库互不影响。",
      },
      windows: {
        // windows.md:111-117,149-154; faq.md:124-133
        steps: [
          "正式版：从 [msime.app 下载页](https://msime.app/download/) 安装「Metasequoia IME 水杉输入法」，在设置窗口的「输入 → 输入方案」里选「五笔」。设置窗口目前提供 86 五笔。",
          "新版预览：从[下载页](/download/)下载 `MetasequoiaIME-Wubi_Setup_v<版本>.exe`（当前预览版有提供时）。安装包尚未签名，Windows 可能提示发布者未知。",
        ],
        note: "Windows 正式版里，候选混输（中英、emoji 等）和快捷短语混入候选只在全拼和双拼下生效，五笔不混输。",
      },
      ios: {
        // ios.md:7-23
        steps: [
          "先安装 Apple 的 TestFlight，再打开[水杉的 TestFlight 公开测试链接](https://testflight.apple.com/join/bUzPvyqt)安装水杉输入法。",
          "在系统的「设置 → 通用 → 键盘 → 键盘」里点「添加新键盘」，选择水杉输入法。",
          "在 App 的「设置 → 输入」里打开五笔，同一页会出现「五笔」一组，在「码表」里选 86 或 98。",
        ],
        note: "同一组还有「编码打不出时用拼音候选」和「候选显示剩余编码」两个开关。",
      },
    },
    typing: {
      // macos.md:57-59, windows.md:151, wubi-section.tsx
      intro: "空格上屏首选，数字键选对应的候选，`Enter` 提交原始字母，`Esc` 取消。",
      rules: [
        "四码只有唯一候选时自动上屏（设置项「五笔四码唯一候选自动上屏」，默认开启）。关闭后这个词留在候选里，用空格或数字键选它。",
        "打满四码后接着敲字母，首选被顶上屏，这个字母留作下一个字的开头（设置项「第五码将首选上屏」）。关闭它只在拼音混输开启时生效，这个字母会并入混输串；混输关闭时仍按顶字上屏，不会丢字。",
        "带 `z` 的猜码不会触发四码自动上屏，也不会被第五码顶上屏。",
      ],
      examplesTitle: "编码示例",
      examples: [
        { keys: "wq", result: "你", note: "简码" },
        { keys: "wqiy", result: "你", note: "全码" },
        { keys: "wbgq", result: "你好", note: "词组" },
      ],
      columns: { keys: "按键", result: "候选", note: "说明" },
    },
    mixed: {
      // windows.md:153, wubi-section.tsx, editions.json, ios.md:23
      body: "同一串字母同时查五笔码表和全拼，五笔候选在前，拼音候选在后；五笔编码打不出时直接出拼音候选。",
      defaults: "水杉五笔默认打开混输。macOS、Linux 设置「输入」页的开关叫「五笔拼音混输」，iOS 叫「编码打不出时用拼音候选」，Windows 正式版叫「拼音混输」。",
    },
    zkey: {
      // wubi reverse lookup note, input switches note, windows.md:154
      lookupTitle: "拼音反查",
      lookup: "混输和 z 键通配都关闭时，在组字开头按 `z`，后面的字母按全拼查字，例如 `zni`。候选后面标出它在当前码表里的五笔全码（你 → `wqiy`）。反查只用来查编码，不调词频，也不造词。macOS、Linux、Android、iOS 和 Windows 新版预览都可以用。",
      wildcardTitle: "z 键通配",
      wildcard: "打开「z 键通配」后，`z` 可以匹配码表中该位置的任意字母（含首位），常用于拿不准首码时起头。它默认关闭；打开后 `z` 不再引导拼音反查。Windows 正式版的设置里也有这个选项。",
    },
    hints: {
      // ios.md:23, wubi-section.tsx
      body: "打开「候选显示剩余编码」后，候选后面标出还要再打哪几个字母才能单独打出它，已经打完整码的候选不标。iOS 在 App 的「设置 → 输入」五笔一组里，macOS 与 Linux 在设置的「输入」页。",
    },
    lookup: {
      // wubi reverse lookup note
      body: "输入或粘贴汉字后点「查码」，结果先列整段词（2 到 16 个汉字时），再逐字列出 86 和 98 的编码，简码在前，当前所用的码表标「（当前）」，码表里没有的写「—」。查码读的是输入法正在用的码表，自己加的五笔词也查得到。",
      where: [
        "macOS、Linux、Windows 新版预览：设置的「输入」页选用五笔时，方案组下面的「五笔查码」。",
        "Android：App 设置的「输入」页「五笔」一组里的「五笔查码」。",
        "iOS：App 的输入设置里，五笔开关后面的「五笔查码」。",
      ],
    },
    dictionary: {
      // ios.md:23, migration.md:34-35, windows.md:376-430, ios.md:41
      intro: "86 和 98 的用户词库分开保存，个人词条和调频记录互不影响。导入文件每行写「词语、五笔编码、权重」，列之间用真正的 Tab 分隔，权重可以省略：",
      sample: "你好\twbgq\t10",
      platforms: [
        "macOS 与 Linux：设置的「词库」页，在「本地词库管理」里选「86 五笔」或「98 五笔」，再在「导入与导出」里选格式：「词在前（标准 TSV）」「编码在前（Windows TSV）」或「Rime userdb / dict.yaml」。文件不超过 32 MB；「导出当前类型」导出用户词库。",
        "Windows 正式版：「词库」页切到五笔词库，用「批量导入」导入上面的格式或 Rime 的 `.dict.yaml`（省略权重时为 `30`）。「批量导入纯汉字词组」按 86 五笔词组取码规则自动生成编码，适合只有汉字的词表。「导出词库」可以分别导出拼音、五笔和英文用户词库。",
        "iOS：「设置 → 词库 → 个人词库 → 从文件导入词条」，选「词库文件」后再选词库类型和文件格式，每次最多 128 条，文件不超过 1 MB。",
        "Android：目前的词库导入只导入拼音词条。",
      ],
      rime: "Rime 五笔方案的 `.dict.yaml` 编码列是五笔编码，要导入五笔词库，不要导入全拼词库。Rime 的输入方案、Lua 脚本和配置不能直接加载。",
    },
    more: "更完整的平台说明见 [msime.app 的使用文档](https://msime.app/docs/windows/)。",
  },

  faq: {
    title: "水杉五笔常见问题",
    lead: "答案依据水杉输入法的官方指南和源码。没找到答案时，可以到 [msime Issues](https://github.com/metasequoiaime/msime/issues) 搜索或提问。",
    items: [
      {
        q: "水杉五笔和完整版水杉输入法有什么区别？",
        // editions.json, android.md:10,61
        a: [
          "水杉五笔只带五笔一种输入方案（Android 版另带手写），默认打开五笔拼音混输。完整版还有全拼、双拼、日语等其他方案。",
          "水杉五笔不带整句重排模型，所以「整句联想」没有「增强」这一档。需要其他方案时请用[完整版](https://msime.app/)。",
        ],
      },
      {
        q: "能和完整版同时安装吗？",
        // macos.md:7, linux.md:34, android.md:12, faq.md:133
        a: [
          "可以。macOS 上几个版本的输入源、设置和数据彼此独立；Linux 的水杉五笔装在 `/opt/msime-linux-wubi` 下，可与完整版同时安装和启用；Android 上它们是不同的应用，设置和词库互不影响。",
          "Windows 新版预览与正式版使用各自的注册信息和数据目录，也可以同时安装。",
        ],
      },
      {
        q: "第一次使用要下载什么？",
        // platforms/macos/README.md (wubi resource pack), linux.md:40-42
        a: [
          "macOS：五笔码表不在 pkg 里，设置应用在用到五笔时自动下载，需要能访问 GitHub。",
          "Linux：安装后运行 `msime-linux-wubi-setup --download` 完成首次配置，词库在这一步下载。",
        ],
      },
      {
        q: "86 和 98 怎么切换？",
        // macos.md:63, android.md:51, ios.md:23, windows.md:117
        a: [
          "macOS 与 Linux 在设置的「输入」页切换；Android 在「设置 → 输入 → 语言与方案 → 普通话」里选；iOS 在「设置 → 输入」的「五笔」一组选「码表」。两版各用各的词库，个人词条和调频记录分开保存。",
          "Windows 正式版的设置窗口目前只提供 86 五笔。",
        ],
      },
      {
        q: "z 键是拼音反查还是通配？",
        // wubi reverse lookup and input switches notes
        a: [
          "默认是拼音反查：混输关闭时，组字开头的 `z` 让后面的字母按全拼查字，候选后面标出五笔编码。打开「z 键通配」后，`z` 改为匹配该位置的任意字母，不再引导反查。混输打开时 `z` 按拼音字母处理。",
        ],
      },
      {
        q: "怎么导入 Rime 的五笔词库？",
        // windows.md:382, migration.md:34,80, faq.md:283-287
        a: [
          "Rime 的 `*.dict.yaml` 可以直接导入五笔词库：macOS 与 Linux 在「词库」页选 86 或 98 五笔后，格式选「Rime userdb / dict.yaml」；Windows 正式版在五笔词库页用「批量导入」。Rime 的用户词典（`*.userdb`）要先用 `rime_dict_manager` 导出成文本。",
          "水杉用自己的引擎，不能加载 Rime 的 `schema.yaml` 输入方案和 Lua 脚本。",
        ],
      },
      {
        q: "码表数据用的是什么许可证？",
        // resources/licenses/msime-engine-dictionary-NOTICE.md, docs/third-party.md, crates/engine/README.md
        a: [
          "86 码表取自 [KyleBing/rime-wubi86-jidian](https://github.com/KyleBing/rime-wubi86-jidian)（取用时为 Apache-2.0），并补入 [rime/rime-wubi](https://github.com/rime/rime-wubi) 中极点表没有的行（LGPL-3.0）。",
          "98 码表取自 98 五笔小组的 [yanhuacuo/98wubi-tables](https://github.com/yanhuacuo/98wubi-tables)（Unlicense）与 [fcitx5-table-extra](https://github.com/fcitx/fcitx5-table-extra) 的 98 表（GPL-3.0-or-later）。由这些表生成的 86、98 补充词组按 GPL-3.0 发布。",
          "拼音混输用的拼音词库含 rime-ice 的 GPL-3.0 数据。各数据的来源与许可说明随安装包附带。",
        ],
      },
      {
        q: "怎么卸载？",
        // macos.md:107-109, linux.md:136
        a: [
          "macOS：在设置的「维护与诊断」页点「卸载…」，默认保留词库、学习记录和偏好。用 Homebrew 安装的运行 `brew uninstall --cask msime-wubi`。",
          "Linux：`sudo apt remove msime-linux-wubi` 或 `sudo dnf remove msime-linux-wubi`，之后执行 `fcitx5 -r`、`ibus restart` 或注销。卸载不删除用户数据，不再需要时手动删除 `~/.config/msime-client-wubi` 和 `~/.local/share/msime-client-wubi`。",
        ],
      },
      {
        q: "遇到问题去哪里反馈？",
        // macos.md:116, faq.md:359-363
        a: [
          "到 [msime Issues](https://github.com/metasequoiaime/msime/issues) 先搜索相同问题，再新建，写明平台与系统版本、用的是水杉五笔还是完整版、版本号和复现步骤。没有 GitHub 账号时可以用 [msime.app 的反馈页](https://msime.app/feedback/)。Windows 正式版的问题请到 [msime-windows Issues](https://github.com/metasequoiaime/msime-windows/issues)。",
        ],
      },
    ],
  },
} as const;

