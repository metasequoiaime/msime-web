# Agent Note: Web 下载入口展示正式发布版本

Status: implemented

## Problem

下载页的 Web 选择按钮只显示「npm」，实际的 npm 包链接也没有版本，访客无法在入口处判断当前发布版本。

## Decision

`sitePlatforms` 复用下载页已有的发布历史，为 Web 选择发布日期最新的正式发布，填入 `publishedVersion`。平台选择按钮沿用已有版本展示，npm 包按钮使用同一字段显示版本。预发布不能作为 npm 正式版展示；历史顺序不影响选择。历史缺失或只有预发布时保留「npm」和「npm 包」。

Web 保持 SDK 分发方式及原 npm 链接，不加入安装包清单。iOS 的 TestFlight 版本选择规则保持原状。检索现有笔记后，安装包入口和下载统计笔记不涉及 Web 版本来源，均无关，原地保留。

## Alternatives considered

使用本站依赖的 `@msime/web-engine` 版本无需读取发布历史，但它只代表网站在线演示所用版本，不能代表对外发布的最新版本，因此不采用。

## Consequences

按钮随现有发布历史查询更新，无需新增接口或维护静态版本号；同时依赖该查询的可用性与缓存时效。适配测试覆盖乱序历史、正式版与预发布隔离、其他平台隔离、缺少安装包清单和缺少正式版。
