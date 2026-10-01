import type { UpdateManifest } from "../data/schemas.ts";
import { PLATFORM_LABELS, PLATFORMS, type Platform } from "../platform.ts";
import type { PlatformRelease, Platforms } from "../platforms-data.ts";
import downloadSourceRaw from "../content/download.md?raw";

// `?raw` 原样带进磁盘上的字节：Windows 上 git 可能把这份 md 签出成 CRLF。下面按 `## ` / `### ` 分段全按 LF 写死，CRLF 会让分段落空，所以在入口处统一归一成 LF。
const downloadSource = downloadSourceRaw.replace(/\r\n/g, "\n");

export const WINDOWS_RELEASES_URL = "https://github.com/metasequoiaime/MSIME-Windows/releases";

export const FALLBACK_INSTALLER_NAME = "MetasequoiaIME_Setup_v<版本>.exe";

// The page must never claim the installer is signed when it is not. The manifest reports what the published asset actually is, so the security note is derived from that rather than written by hand -- an earlier hard-coded note told users to refuse anything without a signature while the only downloadable build was unsigned, which trains people to ignore signature warnings.
const securityNote = (manifest: Partial<UpdateManifest>): string => {
  const lines: string[] = [];

  if (manifest.signed === true) {
    lines.push("Windows 安装包带有数字签名。安装前请在文件属性的「数字签名」标签页确认签名；签名缺失，请勿安装。");
  } else if (manifest.signed === false) {
    lines.push(
      "**当前 Windows 构建未经代码签名**（文件名带 `unsigned`）。Windows 可能显示安全警告；请先核对发布来源和校验值。此类构建无法使用 uiAccess，可能影响管理员权限程序中的候选窗显示。"
    );
    lines.push("");
    lines.push("可用以下 SHA256 校验下载文件是否与发布文件一致；校验值不能替代代码签名：");
  } else {
    // The manifest could not be read, or predates the field. Saying "unsigned" here would be a claim about a release the page failed to look up -- and the sentence about checking SHA256 instead has nothing to follow it, because the digest comes from the same manifest.
    lines.push("无法读取发布信息，请到 Releases 页面确认该版本是否带有数字签名，并核对页面上给出的 SHA256。");
  }

  if (manifest.installerSha256) {
    const name = manifest.installerName ?? FALLBACK_INSTALLER_NAME;
    lines.push("");
    lines.push("```powershell");
    lines.push(`Get-FileHash .\\${name} -Algorithm SHA256`);
    lines.push("```");
    lines.push("");
    lines.push(`应得到：\`${manifest.installerSha256}\``);
    lines.push("");
    lines.push("请将计算结果与这里的官方校验值逐字核对。从蓝奏云盘或 QQ 群文件下载时也应核对。");
  }

  return lines.join("\n");
};

/*
 * macOS 与 Linux 的签名说明。
 *
 * 这两段原本是手写在 markdown 里的定论（「未经 Apple 公证」「Linux 包同样未经签名」）。手写的问题在于：签名状态会变，正文不会跟着变，将来签上了这页就在说假话。改成按产物推 —— 和 Windows 那段用的是同一条原则：页面绝不能声称一个没签名的包签过名，也不该在判不出来时替它下结论。
 */
const PLATFORM_SIGNING: Record<"macos" | "linux", Record<"signed" | "unsigned" | "unknown", string>> = {
  macos: {
    // 文件名去掉 `unsigned` 只说明它没被标成未签名，不代表过了 Apple 公证 —— 公证与否决定首次打开会不会被 Gatekeeper 拦，这是文件名承载不了的信息。写「不会被拦截」是拿一个约定去担保另一件事，用户真被拦了就是页面在撒谎。
    signed:
      "发布清单将当前构建标记为已签名；Apple 公证状态请以发布说明为准。首次打开如遇系统提示，请先核对来源、校验值和该版本的安装说明。每个版本仍附带校验文件（`.sha256` 或 `SHA256SUMS`），可用 `shasum -a 256` 核对下载完整性。",
    unsigned:
      "当前构建标记为**未签名**。签名与 Apple 公证是不同的验证步骤，公证状态请以发布说明为准。首次打开可能出现系统警告，请先核对来源与安装说明。每个版本都附带校验文件（`.sha256` 或 `SHA256SUMS`），可用 `shasum -a 256` 核对下载完整性。",
    unknown: "公证状态请以发布页说明为准。每个版本都附带校验文件（`.sha256` 或 `SHA256SUMS`），可用 `shasum -a 256` 核对下载完整性。",
  },
  linux: {
    signed: "当前包带有签名。Release 页面每个资产旁都显示 GitHub 计算的 SHA256，下载后可用 `sha256sum <文件名>` 核对。",
    unsigned: "当前包未经签名。Release 页面每个资产旁都显示 GitHub 计算的 SHA256，下载后可用 `sha256sum <文件名>` 核对。",
    unknown:
      "Linux 包的文件名不体现签名状态，请以发布页说明为准。Release 页面每个资产旁都显示 GitHub 计算的 SHA256，下载后可用 `sha256sum <文件名>` 核对。",
  },
};

const signingKey = (signed: boolean | null | undefined) => (signed === true ? "signed" : signed === false ? "unsigned" : "unknown");

/*
 * macOS 的安装说明跟着清单里的包走。
 *
 * 现行的 DMG 要拖进「应用程序」再打开 MSIME，由它把输入法装进 `~/Library/Input Methods`；此前的 pkg / zip 直接装输入法本体。两套步骤互不适用，给 pkg 的下载按钮配 DMG 的步骤，照着做的人会找不到 MSIME。`{{#macosDmg}}…{{/macosDmg}}` 与 `{{#macosLegacy}}…{{/macosLegacy}}` 只保留与主按钮一致的那段。清单读不到时按现行的 DMG 写。
 */
const keepBlock = (source: string, name: string, keep: boolean) =>
  source.replace(new RegExp(`\\{\\{#${name}\\}\\}\\n([^]*?)\\{\\{/${name}\\}\\}\\n`, "g"), keep ? "$1" : "");

const macosInstallBlocks = (source: string, macos: PlatformRelease | undefined) => {
  const dmg = !macos || macos.downloads.some((entry) => /\.dmg$/i.test(entry.name));
  return keepBlock(keepBlock(source, "macosDmg", dmg), "macosLegacy", !dmg);
};

/** Fills the placeholders in `content/download.md`. A manifest that failed to load is passed as `{}`, which makes every derived statement fall back to "check the release page" rather than guess. */
export const fillTemplate = (manifest: Partial<UpdateManifest>, platforms: Partial<Platforms> | undefined) =>
  macosInstallBlocks(downloadSource, platforms?.macos)
    .replaceAll("{{securityNote}}", securityNote(manifest))
    .replaceAll("{{installerName}}", manifest.installerName ?? FALLBACK_INSTALLER_NAME)
    .replaceAll("{{macosSigning}}", PLATFORM_SIGNING.macos[signingKey(platforms?.macos?.signed)])
    .replaceAll("{{linuxSigning}}", PLATFORM_SIGNING.linux[signingKey(platforms?.linux?.signed)]);

export const readableSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/*
 * 「有哪些包、支持哪些架构」这类事实，从产物里数出来，不写在文案里。
 *
 * 之前正文和面板都是手写清单（「提供 .deb、.rpm 和 .tar.gz 三种包」「支持 x86_64 与 aarch64」）。发布流水线哪天多出一种包或砍掉一种架构，这些句子不会跟着变，页面就开始说谎 —— 和手写签名结论是同一类毛病。
 */
const FORMAT_OF = (name: string) => {
  const match = /\.(deb|rpm|pkg|zip|exe|tar\.gz)$/i.exec(name);
  return match ? match[1].toLowerCase() : null;
};

/* 中英混排里，连接词两侧要留空格，否则「pkg与zip」会连成一团 */
const joinCn = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join("、")} 与 ${items[items.length - 1]}`);

const COUNT_CN = ["", "一", "两", "三", "四", "五", "六", "七", "八"];

export const describePackages = (downloads: PlatformRelease["downloads"] | undefined) => {
  if (!downloads?.length) return "安装包清单暂时无法获取";

  const formats = [...new Set(downloads.map((entry) => FORMAT_OF(entry.name)).filter((f): f is string => f !== null))];
  const arches = [...new Set(downloads.map((entry) => entry.arch))];

  // 清单是穷举的，不写「等」
  const formatPart = formats.length
    ? formats.length === 1
      ? `提供 ${formats[0]} 包`
      : `提供 ${joinCn(formats)} ${COUNT_CN[formats.length] ?? formats.length}种包`
    : "";

  // macOS 只有一个 Universal 标注，说「覆盖 Universal」不像话
  const archPart = arches.length === 1 && arches[0] === "Universal" ? "为 Universal 构建" : arches.length ? `覆盖 ${joinCn(arches)}` : "";

  return [formatPart, archPart].filter(Boolean).join("，");
};

/**
 * 按架构把下载分组。
 *
 * 这批文件是「架构 × 格式」的矩阵：Linux 三种格式各出 x86_64 和 aarch64 两份。平铺成一列的话每行都要贴一个架构标签，同一个词重复五遍；按架构分组之后那个词只出现一次，而且对得上人挑包的顺序 —— 先确定自己是什么机器，再选发行版对应的格式。顺序沿用清单里的先后，不另外排。
 */
export const groupByArch = (downloads: PlatformRelease["downloads"]) => {
  const groups = new Map<string, PlatformRelease["downloads"]>();

  for (const entry of downloads) {
    const existing = groups.get(entry.arch);
    if (existing) existing.push(entry);
    else groups.set(entry.arch, [entry]);
  }

  return [...groups];
};

/** One `### ` block of the guide: its heading and the markdown under it. */
export type GuideBlock = { title: string; body: string };

/**
 * One `## ` section of the guide. Platform sections (`## Windows` …) have `platform` set; the closing `## 隐私` section has `platform: null` and applies to every platform.
 *
 * The first `### ` block of a platform section is its main text (rendered next to the heading); the remaining blocks become the call-out cards below it.
 */
export type GuideSection = { heading: string; platform: Platform | null; intro: string; blocks: GuideBlock[] };

const platformOf = (heading: string) => PLATFORMS.find((platform) => PLATFORM_LABELS[platform] === heading) ?? null;

/** Splits the filled template into `## ` sections and `### ` blocks. Headings are read before any Traditional Chinese conversion, so the platform lookup never depends on the locale. */
export const parseGuide = (source: string): GuideSection[] =>
  source
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const newline = chunk.indexOf("\n");
      const heading = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
      const [intro, ...rest] = (newline === -1 ? "" : chunk.slice(newline + 1)).split(/^### /m);
      const blocks = rest.map((block) => {
        const end = block.indexOf("\n");
        return { title: (end === -1 ? block : block.slice(0, end)).trim(), body: end === -1 ? "" : block.slice(end + 1).trim() };
      });
      return { heading, platform: platformOf(heading), intro: intro.trim(), blocks };
    });
