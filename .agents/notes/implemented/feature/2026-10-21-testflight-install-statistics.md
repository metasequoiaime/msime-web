# Agent Note: 独立接收并展示 TestFlight 安装统计

Status: implemented

## Problem

iOS 的 TestFlight 安装次数需要 Apple 授权，官网现有 GitHub 下载统计没有该来源，直接把未知数显示成零或与 GitHub 文件下载合并会误导访客。

## Decision

官网接收主仓库 `testflight-stats-v1` 事件中的公开汇总，严格校验后仅更新 `public/testflight-stats.json`。独立自动 PR、必需 CI 和 Pages 发布沿用现有保护。分支白名单新增 `automation/testflight-stats`，仅允许改动该文件，避免与下载清单自动化相互覆盖。

下载页独立加载与预渲染 Apple 快照，iOS 标注 TestFlight 安装次数，不计入 GitHub 累计下载。显示 Apple 快照时间与指标覆盖日期，首次未同步时显示暂无公开数据。损坏或迟到事件不替换旧快照，浏览器与 Pages 均不持有 Apple 密钥。

## Alternatives considered

把 iOS 计数放进 `platforms.json` 能少一个请求，但会与每半小时重建下载清单的自动 PR 争用文件，还会把两个不同口径的合计绑在一起；采用独立快照与查询。

官网直接调用 Apple 能省去事件链，但需要在另一部署环境配置私钥，且静态预渲染无法自然使用同一数据；主仓库复用已有凭据，只交付汇总快照。

## Verification

`pnpm test` 的 271 项用例、`pnpm lint`、`pnpm exec tsc --noEmit`、Python 自动合并限制的 8 项测试、新 workflow 的 actionlint 及笔记三条校验通过。新增测试覆盖合法零值、非法计数、日期与协议版本、过滤额外字段、旧事件拒绝回退、独立数据源与 GitHub 总数隔离。

静态简繁 HTML 的数字、零值和未同步降级增加生产渲染断言，由 PR 的完整构建执行。本机磁盘低于 50 GB，不创建新构建树。首次真实同步仍须在两仓合并后核对 Apple 指标权限、公开快照及页面数字。

## Consequences

Apple 指标可能受可用历史区间限制，不标成全部历史安装量或独立用户。GitHub cron、自动 PR 和 Pages 会延迟发布；失败保留上次成功数据并显示其时间。生产者先合并，两仓间凭据只授权既有事件传输。

## Related notes audit

现有[安装包下载统计笔记](2026-10-21-installer-download-statistics.md)保留 GitHub 口径；本项只替代其中 iOS 永远无数据的展示状态，双方互链。Windows 测试版与皮肤下载记录无关，原地保留。
