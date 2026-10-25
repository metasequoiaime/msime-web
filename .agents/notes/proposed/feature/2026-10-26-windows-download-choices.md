# Agent Note: Windows 下载按纯净版、联网版和 Windows 7 分开选择

Status: proposed

## Problem

下载页把两条 Windows 产品线压在同一张选择卡上，显示两套版本号，访客需要展开内容才能判断下载的是哪一版。Windows 7 没有独立入口，容易误用现代 Windows 包。

## Proposal

顶部展示九张选择卡，前三张为 Windows 10/11（纯净版）、Windows 10/11（联网版）、Windows 7，其后沿用六个平台。平台身份仍是 `windows`，通过 `windows=pure|online|win7` 保存具体选择，不扩展更新日志的平台枚举；缺省仍选纯净版。

纯净版读取原 Windows 清单，联网版读取主仓库的 `experimental`，两者不比较版本、不互相回退。Windows 7 增加可选 `windows7` 发布槽，只收主仓库 `windows7-v` 正式发布及版本一致的专用安装包；没有公开发布时显示「暂未发布」。纯净版外部网盘与其签名、校验、运行库说明只归纯净版，其他版本使用各自发布说明。

## 既有笔记审计

[Windows Rust 测试版入口](../../implemented/feature/2026-10-20-windows-rust-experimental-download.md)部分重叠：保留它的数据来源和签名规则，以本篇替代同一卡片内并列两条产品线的展示决定。[Web 版本展示](../../implemented/bug-fix/2026-10-26-web-download-version.md)继续适用。下载统计笔记与本次选择器无关。

## Alternatives considered

新增三个平台身份可直接复用平台切换，但会把同一系统的产品版本扩散到发布 API、统计、指南和其他页面，因此用页面专属的 Windows 选择参数。

## Acceptance criteria

九张卡片均可选择并通过链接恢复；三个 Windows 版本的版本号、主下载地址和镜像不会串线。Windows 7 无发布时不提供现代安装包；未来专用正式包可由既有同步流程接入。简繁页面及窄屏无溢出，Web 版本展示继续生效。

## Risks

Win7 的公开发布与版本依赖上游专用 tag 和资产命名；本次不触发产品发布。旧链接继续默认纯净版，新参数缺失或非法时也回到纯净版。
