## Windows

### 安装说明

下载并运行安装程序，按页面提示完成安装，再用 `Win + Space` 切换到水杉输入法。

升级现有版本前，请先阅读该版本的 GitHub Release 说明，确认是否有额外操作要求。

### 必备运行环境

Server 与设置程序均为 64 位程序，需要安装最新的 **Microsoft Visual C++ 2015–2022 Redistributable（x64）**，可直接从微软官方地址[下载 `vc_redist.x64.exe`](https://aka.ms/vc14/vc_redist.x64.exe)。

注意：`vc_redist.x86.exe` 与 x64 是两套独立的运行库，已经装了 x86 也不能代替。若安装后无法切换、Server 反复退出或设置窗口闪退，请优先安装或修复 x64 运行库并重新启动 Windows。更多症状和排查方法见[安装后无法使用或设置窗口闪退](/docs/windows/#安装后无法使用或设置窗口闪退)。

### 安全提示

{{securityNote}}

#### 核对构建来源

经发布工作流构建的 Windows 安装包还带有 GitHub 的构建来源证明（build provenance attestation），可用于核对文件与本项目构建工作流的关联。安装 [GitHub CLI](https://cli.github.com) 后运行：

```powershell
gh attestation verify .\{{installerName}} --repo metasequoiaime/MSIME-Windows
```

通过时会打印出触发构建的工作流与 commit。提示找不到证明时，说明这个版本不是经发布工作流构建的，请以数字签名和 SHA256 为准。该检查与代码签名验证不同；命令的登录与网络要求请以 GitHub CLI 的提示为准。

## macOS

### 安装说明

{{#macosDmg}}
1. 打开下载的 DMG，把 MSIME 拖到「应用程序」。
2. 打开「应用程序」里的 MSIME。首次安装会出现安装窗口，点「立即安装」，安装完成后点「进入设置」。这一步才会把内嵌的「水杉输入法.app」安装到 `~/Library/Input Methods` 并登记输入源；已经安装过时会直接进入设置。
3. 如果系统提示注销，请从苹果菜单选择「退出登录」并重新登录；全新安装可能需要这样做，更新已有安装通常不需要。
4. 添加输入法（菜单栏里已经有水杉输入法时可跳过）：打开「系统设置」→「键盘」→「文字输入」→「输入法」→「编辑…」，点左下角的「+」，选「简体中文」→「水杉输入法」，再点「添加」。macOS 对所有第三方输入法都会提示「开发者可以访问你通过此输入法键入的任何内容…」，水杉如何处理输入数据见[隐私说明](/privacy/)。
5. 切换：点菜单栏的输入法图标选择水杉输入法，或按 `Control + 空格` 切换输入法。
{{/macosDmg}}
{{#macosLegacy}}
安装包直接双击运行；压缩包解开后把输入法包放进 `~/Library/Input Methods`，再到「系统设置 → 键盘 → 文字输入 → 编辑」中启用「水杉输入法」。

macOS 版内置 Sparkle 自动更新，安装后可从输入法菜单中的「检查更新…」直接升级。
{{/macosLegacy}}

{{#macosDmg}}
### 装好后找不到水杉输入法？

依次检查：

- **只拖进了「应用程序」，没有完成安装**：打开 MSIME 后还要在安装窗口点「立即安装」，再点「进入设置」。输入法是这一步才装进 `~/Library/Input Methods` 的。
- **第一次安装后没有注销**：macOS 对全新的输入法标识可能要到下一次登录才会接纳；按提示注销并重新登录，再看菜单栏。
- **没有添加到输入法列表**：按上面第 4 步添加；在「输入法」列表里删掉过水杉输入法的，也要重新添加。
- **装过旧版 pkg 安装包**：旧版装在 `~/Library/Input Methods/MetasequoiaIME.app`，和新版用的是同一个输入法标识。打开新版 MSIME 时会自动移除它，更早的预览版 `水杉输入法（预览）.app` 也一样；之后注销并重新登录一次（苹果菜单 →「退出登录」），让系统只认新版。如果旧版装在了 `/Library/Input Methods`（所有用户共用），MSIME 没有权限删除，会提示你手动处理：在访达里按 `Command + Shift + G` 前往 `/Library/Input Methods`，把 `MetasequoiaIME.app` 移到废纸篓（需要输入管理员密码），再注销并重新登录。
{{/macosDmg}}

### 签名与校验

{{macosSigning}}

## Linux

### 用包管理器安装

Fedora 43/44、openSUSE Tumbleweed、Ubuntu 24.04/26.04、Debian testing/unstable 有官方软件源，托管在 [openSUSE Build Service](https://build.opensuse.org/project/show/home:msime)。添加一次软件源后用系统的包管理器安装，之后随系统更新一起升级。Fedora 另有 aarch64 包，其余发行版目前只有 x86_64。

**Ubuntu 24.04 / 26.04**

```sh
repo=https://download.opensuse.org/repositories/home:/msime/xUbuntu_$(. /etc/os-release; echo $VERSION_ID)
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL $repo/Release.key | sudo tee /etc/apt/keyrings/msime.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/msime.asc] $repo/ /" | sudo tee /etc/apt/sources.list.d/msime.list
sudo apt update
sudo apt install msime
```

Linux Mint 等 Ubuntu 衍生版的 `VERSION_ID` 是它自己的版本号，把第一行末尾换成所基于的 Ubuntu 版本（例如 `xUbuntu_24.04`）。

**Debian testing / unstable**

```sh
repo=https://download.opensuse.org/repositories/home:/msime/Debian_Testing
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL $repo/Release.key | sudo tee /etc/apt/keyrings/msime.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/msime.asc] $repo/ /" | sudo tee /etc/apt/sources.list.d/msime.list
sudo apt update
sudo apt install msime
```

unstable 把第一行的 `Debian_Testing` 换成 `Debian_Unstable`。Debian 12/13 的 Rust 版本过旧，没有软件源，请用下面列表里的 `.deb`。

**Fedora 43 / 44**

```sh
sudo dnf config-manager addrepo --from-repofile=https://download.opensuse.org/repositories/home:/msime/Fedora_$(rpm -E %fedora)/home:msime.repo
sudo dnf install msime
```

**openSUSE Tumbleweed**

```sh
sudo zypper addrepo --refresh https://download.opensuse.org/repositories/home:/msime/openSUSE_Tumbleweed/home:msime.repo
sudo zypper install msime
```

首次安装时 dnf 和 zypper 会询问是否信任软件源的签名公钥，确认即可。

装好后，每个要使用输入法的用户运行一次 `msime-linux-setup --download`（或打开「水杉输入法」设置）下载词库、完成首次配置。卸载用对应的 `apt remove msime`、`dnf remove msime` 或 `zypper remove msime`。

也可以用一条命令完成上面所有步骤，脚本自动识别发行版并替当前用户完成首次配置，运行前可以先 [读一遍](https://msime.app/install.sh)：

```sh
curl -fsSL https://msime.app/install.sh | sh
```

### 安装说明

其他发行版按下面的列表选择对应的包。同一个包同时提供 Fcitx5 插件与 IBus 引擎，两者功能一致，用桌面环境正在使用的那个即可。安装包不带词库，安装后打开「水杉输入法」设置完成首次配置并下载词库（或在终端运行 `msime-linux-setup --download`），它会把输入法加入当前的输入法列表；没有自动加入时，Fcitx5 用 `fcitx5-configtool` 添加「水杉输入法」，IBus 执行 `ibus restart` 后在输入源设置中添加「Metasequoia 水杉输入法」。

源码在 [msime 仓库](https://github.com/metasequoiaime/msime/tree/develop/platforms/linux)。

### 签名与校验

{{linuxSigning}}

## Android

### 开发状态

Android 版正在 [msime 仓库](https://github.com/metasequoiaime/msime/tree/develop/platforms/android)中开发，目前还没有发布安装包，也没有上架应用商店。

输入法服务运行在独立进程中，手写识别使用 ML Kit Digital Ink。发布安装包后，这里会给出下载入口。

### 从源码构建

源码、APK 构建脚本和验证方法都在 msime 仓库的 `platforms/android` 目录，构建前请先阅读该目录的 README。开发中的构建不保证稳定，遇到问题欢迎到[Bug 与需求反馈](/feedback/)反馈。

## iOS

### 安装与启用

1. 在 iPhone 上安装 [TestFlight](https://apps.apple.com/app/testflight/id899247664)。
2. 打开 [TestFlight 公开测试链接](https://testflight.apple.com/join/bUzPvyqt)，在 TestFlight 中点“接受”，再点“安装”。
3. 安装完成后，到“设置 → 通用 → 键盘 → 键盘 → 添加新键盘”中启用“水杉输入法”。

### 测试版有效期

TestFlight 的每个构建有效期为 90 天，到期前在 TestFlight 中更新即可，无需重新加入。

若链接提示“不接受新测试员”，请稍后再试，或到 [Telegram 群](https://t.me/msimegroup)确认当前开放状态。

### App Store

是否上架 App Store 尚未决定：iOS 词库中包含 GPL-3.0 的第三方数据，与 App Store 条款存在冲突，需要先解决授权问题。原委见 [ios-distribution.md](https://github.com/metasequoiaime/msime/blob/v0.50.0-build.11/docs/ios-distribution.md)。

## HarmonyOS

### 开发状态

HarmonyOS 版正在 [msime 仓库](https://github.com/metasequoiaime/msime/tree/develop/platforms/harmony)中开发，基于 InputMethodExtensionAbility，目前还没有发布安装包，也没有上架应用市场。

发布安装包后，这里会给出下载入口。

### 从源码构建

源码和构建脚本都在 msime 仓库的 `platforms/harmony` 目录。构建需要 DevEco Studio 提供的 OpenHarmony NDK 与 `hvigorw`，步骤见该目录 README 的「本地构建」一节。开发中的构建不保证稳定，遇到问题欢迎到[Bug 与需求反馈](/feedback/)反馈。

## Web

### 嵌进你的网页

Web 版是给网站开发者用的：同一个 Rust 输入引擎编译成 WebAssembly，打包成 npm 包 [`@msime/web-engine`](https://www.npmjs.com/package/@msime/web-engine)。引擎在访客浏览器的 Web Worker 里运行，支持全拼、小鹤双拼、自然码双拼和五笔 86，输入的内容不会发送到任何服务器，也不需要你提供后端。

两行代码就能接到页面的文本框上，`attachInput` 会处理按键并显示候选栏：

```js
import { createMsimeEngine, attachInput } from "@msime/web-engine";

const engine = await createMsimeEngine({ scheme: "quanpin" });
attachInput(document.querySelector("textarea"), engine);
```

完整的 API、自定义候选栏和按键处理见 [packages/web-engine 的说明](https://github.com/metasequoiaime/msime/tree/develop/packages/web-engine#readme)。

### 方式一：部署到自己的静态站点

把运行时和资源复制到站点的发布目录，页面直接引用，不需要打包器，也不需要任何配置：

```sh
npx @msime/web-engine copy public/msime
```

```html
<script type="module">
  import { createMsimeEngine, attachInput } from "/msime/index.js";
  const engine = await createMsimeEngine({ scheme: "quanpin" });
  attachInput(document.querySelector("textarea"), engine);
</script>
```

只需要全拼和双拼时，加上 `--no-wubi` 可以少放五笔词库；`--no-model` 不放整句模型，候选按词频排序，首次加载少约 4 MB。用 Vite、webpack 等打包器的项目照常 `npm install @msime/web-engine`，资源仍用上面的命令复制出来，再把 `assetBase: "/msime/assets/"` 传给 `createMsimeEngine`。

### 方式二：直接从 CDN 引用

包发布在 npm 上，jsDelivr 会自动提供 CDN 地址，什么文件都不用部署：

```html
<script type="module">
  import { createMsimeEngine, attachInput } from "https://cdn.jsdelivr.net/npm/@msime/web-engine/index.js";
  const engine = await createMsimeEngine();
  attachInput(document.querySelector("textarea"), engine);
</script>
```

正式上线请在地址里写上版本号（如 `@msime/web-engine@0.2.0`），避免新版本自动生效。这种方式依赖第三方 CDN，适合原型和流量较大的站点；希望资源都在自己域名下时用方式一。

### 部署平台

[示例站点](https://github.com/metasequoiaime/msime/tree/develop/packages/web-engine/examples/static-site)附带各平台的现成配置：

- **GitHub Pages**：用示例里的 `github-pages.yml` 发布。Pages 不能自定义缓存时间，文件过期后靠 ETag 校验，不会重复下载。
- **Vercel**：`vercel.json` 已写好构建命令、输出目录和缓存头。
- **Cloudflare Pages**：构建命令 `npm run build`，输出目录 `site`，缓存头在 `_headers` 里。
- **Cloudflare Workers**：用 Workers Static Assets 托管同一个目录，`npx wrangler deploy` 即可。引擎依然在访客的浏览器里运行，Workers 只负责提供文件。

不要把 GitHub Release 的下载地址直接当作资源地址：它会跳转到另一个域名，并且不允许跨域读取，浏览器会拒绝。

### 体积与浏览器要求

每个页面只下载用到的方案：全拼或双拼约 16 MB（不要整句模型约 12 MB），五笔约 8 MB。文件按 HTTP 缓存规则缓存，再次打开不会重新下载。

需要支持 WebAssembly、模块 Worker 和 `DecompressionStream` 的浏览器：Chrome / Edge 80 及以上、Firefox 114 及以上、Safari 16.4 及以上。页面设置了内容安全策略（CSP）时，`script-src` 需要允许 `'wasm-unsafe-eval'`；从 CDN 引用时还需要 `worker-src blob:`。

### 许可

`@msime/web-engine` 以 GPL-3.0-only 发布，嵌入你的网页时需要遵守 GPL 的条款。词库、模型和第三方组件的声明在包内的 `assets/NOTICE.md`，部署时请一并发布。

## 隐私

本地输入处理不需要联网。Windows、macOS 和 Linux 的云候选默认开启，首次使用时会先询问，之后也可在设置中关闭；AI 联想、在线翻译、语音输入与更新检查的行为因平台和设置而异。

安装前可查看[隐私说明](/privacy/)，了解发送的数据、默认设置和关闭方式。
