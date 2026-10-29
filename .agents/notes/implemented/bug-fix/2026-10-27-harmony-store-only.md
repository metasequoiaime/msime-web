# Agent Note: HarmonyOS 下载只走华为应用市场

Status: implemented

## Problem

下载页把 HarmonyOS 当成和桌面一样的安装包平台：选择 HarmonyOS 后给出 GitHub 与国内镜像的 HAP 下载按钮和预览版 HAP，下载说明写着「安装 HAP 后打开水杉输入法」。HarmonyOS NEXT（HarmonyOS 5 及以上）的零售设备不允许普通用户安装 HAP 文件，用户下载后反馈「hap 不识别」。调试签名的 HAP 只能装在 UDID 已登记到调试 Profile、打开了开发者模式的设备上，并且要用 `hdc install`，这只适用于开发者。

## Decision

HarmonyOS 改成和 iOS 相同的处理方式：没有可下载的安装包，下载入口只指向商店。`PLATFORM_CATALOG.harmony` 的分发方式改为新增的 `appgallery`，`sitePlatforms` 不再把清单里的 HarmonyOS 发布接成下载项。应用市场地址集中在 `src/data/platforms.ts` 的 `HARMONY_APPGALLERY_URL`，上架前为 `null`，下载面板、选择卡、首页平台卡、首页「下载」按钮和下载说明里的 `{{harmonyStatus}}` 都从它推出：为 `null` 时显示「正在提交华为应用市场审核，上架后这里提供应用市场链接」，填上地址后改为应用市场按钮。面板和说明各保留一句开发者调试条件，链接到 msime 仓库鸿蒙宿主 README 的「本地构建」一节。不提供邀请测试渠道。

`public/platforms.json` 的生成、镜像和下载统计不改。`RELEASE_PLATFORMS` 仍包含 `harmony`：它同时是清单 schema 的键集合，去掉后自动化写入的 `harmony` 键会让清单整体校验失败。HarmonyOS 的 HAP 下载次数继续计入统计，说明改为「HAP 下载次数，不代表安装」。预渲染页面的种子数据去掉了 `downloadHistory`，这份逐个产物的下载账本页面从不读取，却把所有 nightly HAP 的文件名带进了下载页。

## Alternatives considered

从 `RELEASE_PLATFORMS` 和生成脚本里删掉 HarmonyOS 能让清单里不再出现 HAP，但会同时丢掉 HAP 的下载统计与镜像，还需要同步修改清单 schema 和自动 PR 的校验，超出这次修复的范围，因此不采用。

保留 HAP 下载并加一句「仅限开发者」也不采用：主按钮仍然把普通用户引向装不上的文件。

## Consequences

上架后只需填写 `HARMONY_APPGALLERY_URL`。更新日志仍按平台列出 harmony-v 发布说明，和 iOS 列出 TestFlight 构建的说明一致，发布卡片只链接到 GitHub 发布页。MSIME-Docs 的常见问题仍写着 HarmonyOS「开发中，尚未发布安装包」，需要在那个仓库另行更新。
