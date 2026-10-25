# Agent Note: 首页展示下载与安装统计

Status: implemented

## Problem

「下载与安装统计」只放在下载页，首页访客在看到各平台入口和原生体验介绍后，仍看不到项目的实际使用规模。直接把下载页完整清单搬到首页会把所有发行包元数据一起塞进首页静态 HTML，也会让首页开始承担下载页的镜像实时轮询。

## Decision

统计卡放在首页的「六个平台原生体验，网页也能用」区块之后。首页的平台区和统计区共用一个白色的 `home-platforms-shell` 外层卡片，平台项不再使用独立卡片表面，统计区用顶部内分隔线融入同一表面，整个区域只保留一个卡片。下载页保留下载入口和安装说明，不再重复展示统计卡。首页使用 `download-stats` 查询，只从同一份 `public/platforms.json` 提取生成时间、GitHub、镜像和蒲公英统计字段，并沿用 TestFlight 快照。

`scripts/build-seo.mjs` 为首页注入精简统计快照和 TestFlight 快照，因此无 JavaScript 的首页静态 HTML 也显示完整数字，不复制发行包列表。精简查询与完整 `platforms` 查询使用不同的 TanStack Query key，避免首页误把不完整对象当成下载清单。

## Alternatives considered

只把统计卡移动到首页会缩短下载页并去掉重复信息；下载页仍保留下载入口和安装说明。首页直接复用完整 `platforms` 快照实现最少代码，但会把大量发行附件元数据写入首页 HTML；因此单独抽取统计字段。首页轮询实时镜像接口能让数字更快变化，但会让每次首页访问产生额外请求；首页采用发布时的镜像快照。

## Consequences

首页访客在平台介绍之后即可在同一张外层卡片里看到跨平台下载与安装规模，下载页只呈现下载入口和安装说明。首页 HTML 只增加统计字段和 TestFlight 数据，运行时仍会从 `platforms.json` 校验并读取同一份来源。首页镜像数字的刷新跟随清单发布，最多落后于实时接口的一次同步周期。

## Verification

新增适配器测试确认 `download-stats` 查询只返回统计字段；静态页面测试确认简体和繁体首页各有一个统计卡，且与平台卡片位于同一个 `home-platforms-shell` 内。清单、适配器和生成器相关测试 57 项通过，Biome lint 通过，`git diff --check` 通过。完整 TypeScript 检查仍受仓库现有 `vendor/MSIME-Docs` 未检出和 `src/markdown.ts` 的既有错误阻塞，未将其混入本次改动；完整构建交由 PR CI 验证。
