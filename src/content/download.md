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

除了 SHA256，Windows 安装包还带有 GitHub 的构建来源证明（build provenance attestation），可用于核对文件与本项目构建工作流的关联。安装 [GitHub CLI](https://cli.github.com) 后运行：

```powershell
gh attestation verify .\{{installerName}} --repo metasequoiaime/MSIME-Windows
```

通过时会打印出触发构建的工作流与 commit。该检查与代码签名验证不同；命令的登录与网络要求请以 GitHub CLI 的提示为准。

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

### 安装说明

按发行版选择对应的包。安装后重启 IBus，再在桌面环境的输入源设置中添加「Metasequoia IME」。

这里提供的是开发构建，功能与稳定性仍在完善中。新的 Linux 宿主正在 [msime 仓库](https://github.com/metasequoiaime/msime/tree/develop/platforms/linux)中开发，同时提供 IBus 与 Fcitx5 两个入口。

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

## 隐私

本地输入处理不需要联网。Windows 和 Linux 的云候选默认开启，可在安装或设置中关闭；AI 联想、在线翻译、语音输入与更新检查的行为因平台和设置而异。

安装前可查看[隐私说明](/privacy/)，了解发送的数据、默认设置和关闭方式。
