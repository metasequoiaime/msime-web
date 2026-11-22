# Agent Note: 官网 Fedora 下载项使用发布版本和包架构

Status: implemented

## Problem

主仓 [#11786](https://github.com/metasequoiaime/msime/issues/11786) 报告 Fedora x86_64 下载后安装了 aarch64 包。Linux v0.17.0 的发布指引称 Fedora 45，官网两条 RPM 项仍使用同一个「Fedora 44 · rpm」标签。

## Decision

清单生成器只在该次发布的自动下载指引中读取 Fedora 版本。缺少指引或无法读取时，标签只显示 Fedora。RPM 下载项的可见链接同时显示实际包的 `x86_64` 或 `aarch64`，保留原有架构分组和两个发布附件。安装指南用 `uname -m` 指向同样的架构名称。

## Alternatives considered

- 把常量改成 45 能立即修正这次发布的展示，但会标错仍用旧 Fedora 基础镜像的存量发布，也会在下一次基础镜像升级再次漂移。

## Consequences

展示跟随 Linux 发版流水线已经写出的指引，历史发布可显示不带版本的 Fedora 标签。架构依据发布附件名，两份 RPM 仍可独立下载。
