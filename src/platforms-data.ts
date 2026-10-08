import { z } from "zod";
import { staticSnapshot } from "./data/source.ts";
import { DESKTOP_PLATFORMS, type DesktopPlatform } from "./platform.ts";

const PROJECT_RELEASES = "https://github.com/metasequoiaime/";

/**
 * 地址必须落在本项目的 GitHub 组织下。
 *
 * `z.string().url()` 只判断 `new URL()` 解不解析得了，`javascript:` 和 `data:` 都算合法。这些地址会直接变成下载按钮和列表项的 href —— 用户点下去时不会看地址栏。update.json 那边早就把安装包地址钉死了前缀，platforms.json 喂的是同一个按钮外加另外六个链接，没有理由宽松。
 *
 * 有一个地址不合规就整份作废：这份文件由自动化任务生成、机器人合并，出现组织外的地址意味着链路本身出了问题，此时整块回落到发布页，比展示一份被悄悄过滤过、看起来仍然权威的清单安全。
 */
const projectUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith(PROJECT_RELEASES), { message: "地址必须指向本项目的 GitHub 仓库" });

const downloadSchema = z.object({
  label: z.string(),
  // version 和 arch 会被塞进 markdown 源文再渲染（`当前最新版本：**v{{macosVersion}}**，{{macosPackages}}`）。
  // markdown-it 拦得住 `javascript:`，但外链和图片照渲染 —— 不加约束的话，一个被污染的字段能往正文里塞跟踪像素或误导链接。
  // 收成生成器实际产出的形状：架构是 x86_64 / aarch64 / x64 / Universal 这类裸标识符。
  arch: z.string().regex(/^[A-Za-z0-9_+-]{1,24}$/),
  name: z.string(),
  url: projectUrl,
  // 国内镜像（阿里云 OSS）上的同一个文件，由 scripts/mirror-downloads.mjs 上传并回读核对后才写进清单。镜像只是 GitHub 之外的备选，地址不合规时单独丢掉这一项，不连累整份清单。
  mirrorUrl: z.url({ protocol: /^https$/, hostname: z.regexes.domain }).optional().catch(undefined),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().catch(null),
});

const releaseSchema = z.object({
  // 允许 `-build.11`、`-beta.1` 这样的后缀，但只收字母、数字和点：版本号会被拼进按钮文字和 markdown。
  version: z.string().regex(/^\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?$/),
  releaseUrl: projectUrl,
  publishedAt: z.string(),
  // 三态：true 已签名、false 未签名、null 判不出来。判不出来时页面什么都不说。
  signed: z.boolean().nullable().catch(null),
  downloads: z.array(downloadSchema).min(1),
});

/** 由 scripts/generate-platforms.mjs 生成：三个平台各自的正式版，另附比它更新的预览版（没有就是 null）。 */
export const platformsSchema = z.object({
  generatedAt: z.string(),
  platforms: z.record(
    z.enum(DESKTOP_PLATFORMS),
    releaseSchema.extend({
      prerelease: z.boolean().catch(false),
      // 预览版坏了只是预览版缺席，不拖垮正式版。
      preview: releaseSchema.nullable().catch(null),
    })
  ),
  /* 三个平台共用同一份词库，单独发布，所以放在 platforms 之外。 */
  dictionary: z
    .object({
      tag: z.string(),
      releaseUrl: projectUrl,
      publishedAt: z.string(),
      files: z
        .array(
          z.object({
            name: z.string(),
            label: z.string(),
            size: z.number().int().nonnegative(),
            sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().catch(null),
          })
        )
        .min(1),
    })
    .nullable()
    .catch(null),
});

/** The bundled manifest is the only source: the automation PR that refreshes it is the release pipeline's record, and there is no live endpoint to prefer over it. */
const manifestSource = staticSnapshot("/platforms.json", value => platformsSchema.parse(value));

// Takes no arguments on purpose: existing callers pass it straight to `useQuery({ queryFn })`, which calls it with a query context object, not a signal. New code uses `platformsQuery()` from `./data/queries.ts`.
export const fetchPlatforms = () => manifestSource.load();

export type PlatformsManifest = z.infer<typeof platformsSchema>;
export type Platforms = PlatformsManifest["platforms"];
export type PlatformRelease = NonNullable<Platforms[DesktopPlatform]>;
export type PreviewRelease = NonNullable<PlatformRelease["preview"]>;
export type Dictionary = NonNullable<z.infer<typeof platformsSchema>["dictionary"]>;
