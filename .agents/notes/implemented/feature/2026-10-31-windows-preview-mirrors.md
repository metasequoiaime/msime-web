# Agent Note: Windows 新版预览优先提供国内下载

Status: implemented

## Problem

Windows 新版预览只显示 GitHub 下载。中国用户访问 GitHub 速度慢，入口没有国内镜像或 QQ 群文件提示；镜像同步脚本也没有覆盖 `platforms.json` 中独立的 `experimental` 发布槽。

## Decision

国内镜像按钮在主下载按钮之前显示。正式版和新版预览都使用 `dl.msime.app` 镜像；新版预览在旧清单尚未写入 `mirrorUrl` 时，按受限的 `msime` GitHub 下载地址计算同一镜像路径，避免等待下一轮清单同步。Windows 正式版继续显示 QQ 群文件、夸克和蓝奏云入口；新版预览显示 QQ 群文件入口，不复用只提供正式版文件的网盘链接。镜像同步的生成、预热和失败清理同时覆盖 `experimental` 包。

## Alternatives considered

只显示 GitHub，等下一次自动同步后再提供镜像，改动最小，但当前用户仍然无法使用国内下载入口，因此不采用。把正式版的夸克或蓝奏云链接复用给新版预览会让用户下载错产品版本，因此只给新版预览 QQ 群文件入口。

## Consequences

中国用户默认先看到国内镜像，GitHub 仍保留为备用入口。新版预览的旧清单可以立即使用镜像，后续同步会把同一地址正式写入并预热；如果镜像不可用，镜像按钮仍可由清单校验流程移除。新版预览的 QQ 群入口不承诺存在固定网盘文件，提示用户入群后从群文件获取。

## Verification

镜像脚本测试覆盖正式版、预览版和实验版；官网构建与下载页静态测试确认镜像顺序、预览版 QQ 群入口和 GitHub 备用入口。运行 `git diff --check`、相关 Node 测试及 CI 构建。
