import type { PlatformRelease } from "../platforms-data.ts";

/*
 * macOS 的安装包换过两次形状，三代的安装步骤互不适用：
 *
 * - `legacy`：最早的 `MetasequoiaIME-…-macos-universal` pkg / zip，直接装输入法本体。
 * - `dmg`：0.51.1 到 0.56.x 的 `msime-macos-<版本>-<架构>.dmg`，拖进「应用程序」再打开 MSIME，由它把输入法装进 `~/Library/Input Methods`。
 * - `pkg`：0.57.0 起的 `msime-macos-<版本>-universal.pkg`，安装器把 MSIME 装进「应用程序」，图形界面安装完会自动打开它，其余和 DMG 一样由 MSIME 装输入法。
 *
 * 新旧 pkg 只能靠完整的文件名区分，不能按 `.pkg` 后缀认。形状和 scripts/generate-platforms.mjs 的 `MACOS_PKG` 相同，两边要一起改。
 */
const MACOS_PKG = /^msime-macos-\d+\.\d+\.\d+-universal\.pkg$/i;

export type MacosFormat = "legacy" | "dmg" | "pkg";

/** DMG 和 0.57.0 起的 pkg：都以 MSIME 设置应用为入口，最低 macOS 13。 */
export const isCurrentMacosPackage = (name: string) => MACOS_PKG.test(name) || /\.dmg$/i.test(name);

/** 清单里这一项属于哪一代。清单里同时有几代时按最新的算，和 generate-platforms.mjs 挑选发布的规则一致。 */
export const macosFormat = (release: Pick<PlatformRelease, "downloads">): MacosFormat => {
  if (release.downloads.some((entry) => MACOS_PKG.test(entry.name))) return "pkg";
  if (release.downloads.some((entry) => /\.dmg$/i.test(entry.name))) return "dmg";
  return "legacy";
};

const keepBlock = (source: string, name: string, keep: boolean) =>
  source.replace(new RegExp(`\\{\\{#${name}\\}\\}\\n([^]*?)\\{\\{/${name}\\}\\}\\n`, "g"), keep ? "$1" : "");

/*
 * macOS 的安装说明跟着清单里的包走：给 pkg 的下载按钮配 DMG 的步骤，照着做的人会去找一个不存在的 DMG 窗口；给 DMG 配最早那套 pkg 的步骤，会找不到 MSIME。
 *
 * `{{#macosDmg}}`、`{{#macosPkg}}`、`{{#macosLegacy}}` 只保留与主按钮同一代的那段；`{{#macosCurrent}}` 是 DMG 和新 pkg 共用的段落，里面只适用其中一代的条目再用前两个块包起来。块不能同名嵌套，内层的块先处理。清单读不到时按 DMG 写。
 */
export const macosInstallBlocks = (source: string, release: Pick<PlatformRelease, "downloads"> | undefined) => {
  const format = release ? macosFormat(release) : "dmg";
  const inner = keepBlock(keepBlock(source, "macosDmg", format === "dmg"), "macosPkg", format === "pkg");
  return keepBlock(keepBlock(inner, "macosLegacy", format === "legacy"), "macosCurrent", format !== "legacy");
};
