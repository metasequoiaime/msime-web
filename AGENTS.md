# MSIME-Web

组织边界见 [组织规范](https://github.com/metasequoiaime/.github/blob/main/AGENTS.md)。本站负责展示和渲染；用户指南内容来自固定 MSIME-Docs gitlink，更新元数据从实际发布的 Windows 安装包生成。保留现有 Cloudflare Pages 发布集成。

仓库是 pnpm workspace：官网在 `apps/web`（Pages 的 Root directory），下载镜像 Worker 在 `apps/dl-worker`，两者共用的代码放 `packages/`。只有官网用的代码留在 `apps/web/shared`，不要为了「看起来像 monorepo」把它拆成包。`apps/` 之间不互相 import，要共用就提到 `packages/`。

`/beta/` 只是一个指向 TestFlight 公开链接的静态页。不要为了收邮箱把它改回表单：那需要在本站部署 App Store Connect 私钥，而公开链接已经把人放进同一个外部测试组。

iOS 在下载页是第四个平台，但它没有可下载的产物，所以不进 `platforms.json`，也不该为它放松那份 schema 里 `downloads` 的下限——面板对没有发布数据的平台本来就有分支。

更新清单通过 `automation/update-manifest` 的自动 PR 合入，只允许改动 `apps/web/public/update.json`。保留 main 的 PR 和 Build、Workflow validation、Dependency review 必需检查；不要恢复 main 直推。自动化使用组织已有凭据触发正常 PR CI，自动合并脚本必须先校验真实规则、同仓来源、改动范围和精确提交。
