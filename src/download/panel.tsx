import { useEffect, useState } from "react";
import { HARMONY_APPTEST_CODE, HARMONY_BUILD_GUIDE_URL, type SitePlatformEntry } from "../data/platforms.ts";
import type { PlatformRelease, PreviewRelease } from "../platforms-data.ts";
import type { Platform, ReleasePlatform } from "../platform.ts";
import { useDownloadMirrorsQuery } from "../data/queries";
import { AnchorButton, ChevronDownIcon, CloudDownloadIcon, copyText, cx, ExternalIcon, GitHubIcon, Pill, PlatformIcon, QQIcon, useToast } from "../ui";
import { useLocale } from "../use-locale";
import { mirrorDownloadPlatform, reportMirrorDownload, serverCountsMirror } from "../../shared/download-events";
import { reportDownloadClick } from "../../shared/site-analytics";
import { describeLinuxPackage, detectArm64, pickPrimary } from "./linux-primary";
import { groupByArch, readableSize } from "./template";
import { downloadChoices, type DownloadEntry, type WindowsVariant } from "./windows";

/** The Windows installer is also uploaded to this QQ group's files, for visitors who cannot reach GitHub quickly; joining the group also puts them where feedback is answered. */
const QQ_GROUP = "829919142";
const QUARK_CODE = "gdaa";

// 系统要求是产品决策，不在产物里，只能写下来。Windows 的要求选择卡上已经写成「Windows 10/11」，按钮旁不再重复。Linux 的系统要求随包而变，写在按钮上，按钮下面另有一行指向其他安装包（`LinuxOthers`）。
const PLATFORM_HINTS: Partial<Record<Platform, string>> = {
  macos: "适用于 macOS 12 及以上",
  android: "适用于 Android 9 及以上；测试版，需允许安装未知来源应用",
  ios: "适用于 iOS 17 及以上",
  harmony: "适用于 HarmonyOS 5 及以上",
};

/** macOS 的最低版本跟着安装包格式走，理由见下面 `platformHint`。 */
const macosMinimum = (entry: SitePlatformEntry) => (entry.release?.downloads.some((download) => /\.dmg$/i.test(download.name)) ? 13 : 12);

/** 选择卡上的平台名带上系统要求，免得在下面的提示里再找一遍 */
const tileName = (entry: SitePlatformEntry) => {
  if (entry.id === "macos") return `macOS ${macosMinimum(entry)}+`;
  if (entry.id === "ios") return "iOS 17+";
  if (entry.id === "android") return "Android 9+";
  return entry.name;
};

/*
 * DMG 的系统要求与此前的 universal pkg 不同：package-release.sh 以 macOS 13 为最低版本，可能按构建机架构分别出包，也可能提供一个 universal 包。按清单里实际有的 DMG 说，不写死「Apple 芯片」——哪天多发一个 Intel 包，这句话就不该再把 Intel 用户挡在外面。
 */
const platformHint = (entry: SitePlatformEntry) => {
  const dmgs = entry.id === "macos" ? (entry.release?.downloads.filter((download) => /\.dmg$/i.test(download.name)) ?? []) : [];
  if (!dmgs.length) return PLATFORM_HINTS[entry.id];
  const arm = dmgs.some((download) => download.arch === "arm64");
  const intel = dmgs.some((download) => download.arch === "x86_64");
  const machines = arm && intel ? "Apple 芯片与 Intel 芯片的 Mac" : arm ? "Apple 芯片的 Mac" : intel ? "Intel 芯片的 Mac" : "Mac";
  return `适用于 macOS 13 及以上、${machines}`;
};

/**
 * The page's main action. Not `buttonClass`: that one never wraps, and a label like "通过 TestFlight 安装 iOS 版" is wider than half the panel on a 360px phone, so this one may wrap to two lines and fills the row on narrow screens.
 */
const PRIMARY_ACTION =
  "inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-btn bg-btn px-6 py-3 text-center text-base leading-snug font-semibold text-btn-fg no-underline shadow-btn transition-[transform,filter] duration-150 hover:-translate-y-px hover:text-btn-fg hover:brightness-[1.06] md:w-auto";

/** A cloud-drive or QQ mirror next to the GitHub button: same height, quieter surface. */
const MIRROR_ACTION =
  "inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-btn bg-panel px-3 py-2 text-left text-[15px] leading-snug font-semibold whitespace-nowrap text-ink no-underline sm:gap-2.5 sm:px-5 shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink md:flex-none";

/** 选择卡显示该入口自己的版本，专用 Windows 包尚未公开发布时明确标记。 */
const tileStatus = (entry: DownloadEntry) => {
  if (entry.publishedVersion) return `v${entry.publishedVersion}`;
  if (entry.windowsVariant === "win7") return "暂未发布";
  if (entry.distribution === "testflight") return "TestFlight";
  if (entry.distribution === "pgyer") return "测试版";
  if (entry.distribution === "appgallery") return "AppTest";
  if (entry.distribution === "source") return "开发中";
  if (entry.distribution === "sdk") return "npm";
  return "查看发布页";
};

/**
 * 九个下载入口每行三张，前三张分别对应 Windows 纯净版、联网版和 Windows 7。手机上图标、名称和版本纵向排列；较宽屏幕上横向排列，宽度不足时允许名称和版本换行。
 *
 * The status uses the body font, not `font-mono`: JetBrains Mono is not bundled, and where it is missing the monospace fallback on Windows is a serif face.
 */
const TILE =
  "flex min-w-0 flex-col items-center gap-1.5 rounded-menu px-1.5 py-3 text-center text-ink transition-[background-color,box-shadow] duration-150 sm:flex-row sm:gap-3 sm:px-4 sm:py-3.5 sm:text-left";
const TILE_NAME = "text-sm leading-snug font-semibold [overflow-wrap:break-word] sm:text-lg lg:text-[20px]";
const TILE_STATUS = "text-[12.5px] leading-snug font-medium text-accent-ink tabular-nums [overflow-wrap:anywhere] sm:text-sm";

/** 本站镜像由服务器记录；其他镜像保留点击统计，Rust Windows 按真实包地址识别。 */
const reportMirror = (platform: ReleasePlatform, version: string, entry: PlatformRelease["downloads"][number]) => () => {
  reportDownloadClick({ platform: mirrorDownloadPlatform(platform, entry.url), version, artifact: entry.name, channel: "cn-mirror" });
  if (!serverCountsMirror(entry.mirrorUrl)) reportMirrorDownload({ platform: mirrorDownloadPlatform(platform, entry.url), version, artifact: entry.name });
};

const reportPackage = (platform: ReleasePlatform, version: string, entry: PlatformRelease["downloads"][number]) => () => {
  reportDownloadClick({ platform: mirrorDownloadPlatform(platform, entry.url), version, artifact: entry.name, channel: "github" });
};

/** The mirror copy of the selected package, beside the GitHub button. Left out when the manifest carries no mirror. */
function MirrorAction({ platform, version, entry, className }: { platform: ReleasePlatform; version: string; entry: PlatformRelease["downloads"][number]; className: string }) {
  const { t } = useLocale();
  if (!entry.mirrorUrl) return null;
  return (
    <a className={className} href={entry.mirrorUrl} rel="noreferrer" aria-label={t(`从国内镜像下载 ${entry.name}`)} onClick={reportMirror(platform, version, entry)}>
      <CloudDownloadIcon size={20} className="flex-none" />
      {t("国内镜像下载")}
    </a>
  );
}

/* 主推那个之外的包，按架构分组收进折叠区。正式版和预览版各用一份。有国内镜像的包在大小前面多一个「国内镜像」链接。`id` 给 Linux 按钮下那一行用，点它会展开这里。 */
function MorePackages({ platform, version, downloads, id }: { platform: ReleasePlatform; version: string; downloads: PlatformRelease["downloads"]; id?: string }) {
  const { t } = useLocale();
  return (
    <details id={id} className="group mt-4 scroll-mt-[84px] rounded-group bg-panel-2 px-4 [&[open]]:pb-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {t("其他安装包")}
        <ChevronDownIcon className="flex-none text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3">
        {groupByArch(downloads).map(([arch, entries]) => (
          <section key={arch}>
            <h3 className="m-0 mb-1.5 font-mono text-xs font-medium tracking-wide text-muted">{t(arch)}</h3>
            <ul className="m-0 grid list-none gap-1 p-0">
              {entries.map((entry) => (
                <li key={entry.url} className="flex items-baseline justify-between gap-3 rounded-row px-2 py-1.5 hover:bg-panel">
                  <a className="min-w-0 text-sm font-medium text-accent-ink [overflow-wrap:anywhere] hover:text-ink" href={entry.url} rel="noreferrer" onClick={reportPackage(platform, version, entry)}>
                    {t(entry.label)}
                  </a>
                  <span className="flex flex-none items-baseline gap-3 text-[13px] text-muted tabular-nums">
                    {entry.mirrorUrl && (
                      <a className="font-medium text-accent-ink hover:text-ink" href={entry.mirrorUrl} rel="noreferrer" aria-label={t(`从国内镜像下载 ${entry.name}`)} onClick={reportMirror(platform, version, entry)}>
                        {t("国内镜像")}
                      </a>
                    )}
                    {t(readableSize(entry.size))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

/**
 * 比正式版更新的预览版，和正式版并列展示。
 *
 * 上游每次合并都会自动发一个 Pre-release，却只把人工挑过的那个标成正式版。只展示正式版，想试最新改动的人得自己去 GitHub 翻；只展示预览版，又等于把没挑过的构建推给所有人。所以两个都给，正式版占主按钮，预览版在下面明确标出来。
 *
 * Windows 联网版有独立选择卡，不再使用此预览版区域。
 */
function PreviewPanel({
  platform,
  preview,
  arm64,
  kind = "预览版",
  note = "包含尚未进入正式版的改动，可能不稳定。",
}: {
  platform: ReleasePlatform;
  preview: PreviewRelease;
  arm64: boolean;
  kind?: string;
  note?: string;
}) {
  const { t } = useLocale();
  // Linux 预览版的按钮和正式版一样按架构挑包，并说出是哪个包。
  const { primary: first, others } = pickPrimary(platform, preview.downloads, arm64);
  if (!first) return null;

  return (
    <section className="mt-6 rounded-tile p-[clamp(18px,2.4vw,24px)] shadow-ring-2" aria-label={t(kind)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Pill tone="warn">{t(kind)}</Pill>
        <a
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-btn bg-panel px-5 py-2 text-center text-[15px] leading-snug font-semibold text-ink no-underline shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink"
          href={first.url}
          rel="noreferrer"
          onClick={reportPackage(platform, preview.version, first)}
        >
          {t(platform === "linux" ? `下载${kind} v${preview.version} ${describeLinuxPackage(first)}` : `下载${kind} v${preview.version}`)}
        </a>
        <MirrorAction
          platform={platform}
          version={preview.version}
          entry={first}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-btn bg-panel px-5 py-2 text-center text-[15px] leading-snug font-semibold text-ink no-underline shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink"
        />
      </div>
      <p className="m-0 mt-3 text-sm leading-[1.8] text-muted">{t(note)}</p>
      {others.length > 0 && <MorePackages platform={platform} version={preview.version} downloads={others} />}
    </section>
  );
}

/**
 * Windows-only mirrors after the GitHub and mirror buttons. The QQ group number is copied rather than linked: QQ has no web link that opens a group's files. The Lanzou link is set by admins in msime-backend and left out until one is configured or while the backend cannot be reached.
 *
 * A click on the Lanzou link is reported as an anonymous download count (shared/download-events.ts) with the release's installer name and version; without a release manifest there is nothing accurate to report, so the click goes uncounted.
 */
function WindowsMirrors({ release }: { release: PlatformRelease | null }) {
  const { t } = useLocale();
  const { show } = useToast();
  const lanzouUrl = useDownloadMirrorsQuery().data?.lanzouUrl;
  const reportWindowsMirror = () => {
    const installer = release?.downloads[0];
    if (release && installer) reportDownloadClick({ platform: "windows", version: release.version, artifact: installer.name, channel: "cn-mirror" });
    if (release && installer) reportMirrorDownload({ platform: "windows", version: release.version, artifact: installer.name });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className={MIRROR_ACTION}
        title={t("点击复制群号")}
        onClick={async () => {
          show(t((await copyText(QQ_GROUP)) ? `已复制 QQ 群号 ${QQ_GROUP}，入群后在群文件中下载` : `QQ 群号：${QQ_GROUP}，入群后在群文件中下载`));
        }}
      >
        <QQIcon size={20} className="flex-none" />
        <span>
          <span className="block">{t("QQ 群文件")}</span>
          <span className="block text-[13px] font-medium text-muted tabular-nums">{QQ_GROUP}</span>
        </span>
      </button>
      <div className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-btn bg-panel px-3 py-2 text-[15px] leading-snug font-semibold whitespace-nowrap text-ink shadow-ring-2 sm:gap-2.5 sm:px-5 md:flex-none">
        <CloudDownloadIcon size={20} className="flex-none" />
        <div>
          <a className="flex items-center gap-2 text-ink no-underline hover:text-accent-ink" href={`https://pan.quark.cn/s/50f95054d569?pwd=${QUARK_CODE}`} target="_blank" rel="noreferrer" onClick={reportWindowsMirror}>
            {t("夸克网盘下载")}
            <ExternalIcon className="flex-none text-accent-ink" />
          </a>
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted tabular-nums">
            <span>{t("提取码：")}{QUARK_CODE}</span>
            <button
              type="button"
              className="rounded px-1 py-0.5 text-accent-ink hover:bg-panel-2 hover:text-ink"
              aria-label={t("复制夸克网盘提取码")}
              onClick={async () => {
                show(t((await copyText(QUARK_CODE)) ? `已复制提取码 ${QUARK_CODE}` : `复制失败，请手动复制提取码：${QUARK_CODE}`));
              }}
            >
              {t("复制")}
            </button>
          </div>
        </div>
      </div>
      {lanzouUrl && (
        <a
          className={MIRROR_ACTION}
          href={lanzouUrl}
          target="_blank"
          rel="noreferrer"
          onClick={reportWindowsMirror}
        >
          <CloudDownloadIcon size={20} className="flex-none" />
          {t("蓝奏云盘")}
          <ExternalIcon className="flex-none text-accent-ink" />
        </a>
      )}
    </div>
  );
}

/** Whether to offer Linux's arm64 package (`detectArm64`). Asked only while Linux is selected, and false until the browser answers, so the button starts on x86_64 and its label always names the package it links to. */
function useArm64(enabled: boolean) {
  const [arm64, setArm64] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void detectArm64().then((value) => {
      if (live) setArm64(value);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return arm64;
}

/**
 * The line under the Linux button, for everyone its package is not for. The button can only offer one package and the page cannot tell the distribution, so this names who should look elsewhere and takes them there: 「其他安装包」 opens the list right below, 「安装方式」 jumps to the guide, whose software repositories are the only way onto Arch and openSUSE.
 */
function LinuxOthers({ primary, moreId }: { primary: PlatformRelease["downloads"][number]; moreId: string }) {
  const { t } = useLocale();
  const otherArch = primary.arch === "aarch64" ? "x86_64" : "aarch64";
  // The corner brackets go inside the link and stay on its line, so a narrow screen never leaves one dangling at a line end.
  const link = "cursor-pointer font-medium whitespace-nowrap text-accent-ink hover:text-ink";
  const openMore = () => {
    const details = document.getElementById(moreId);
    if (!(details instanceof HTMLDetailsElement)) return;
    details.open = true;
    details.scrollIntoView({ block: "nearest", behavior: "smooth" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  };
  return (
    <p className="m-0 text-sm leading-[1.8] text-muted md:basis-full">
      {t(`不是这个系统或架构？Fedora 44、Debian 10/11、Ubuntu 20.04 和 ${otherArch} 的安装包在下方`)}
      <button type="button" className={link} aria-controls={moreId} onClick={openMore}>
        {t("「其他安装包」")}
      </button>
      {t("里；Arch、openSUSE 等请用下面")}
      <a className={link} href="#download-linux">
        {t("「安装方式」")}
      </a>
      {t("中的软件源。")}
    </p>
  );
}

/**
 * The action strip under the tiles for the selected platform: the download button (plus the Windows mirrors) with one compatibility line, or an honest status for platforms that do not ship packages yet.
 *
 * File name, architecture, size, signature and checksums are deliberately not repeated here: they live in the release notes and the install guide below, and listing them next to the button only pushed it out of view.
 */
function PlatformAction({ entry }: { entry: DownloadEntry }) {
  const { t } = useLocale();
  const arm64 = useArm64(entry.id === "linux");
  const hintText = entry.windowsVariant === "online" ? "联网版当前为新版测试版本，可能不稳定；可与纯净版同时安装。" : entry.windowsVariant === "win7" ? (entry.release ? "适用于 Windows 7 SP1；请按系统架构选择 x64 或 x86 安装包。" : "Windows 7 专用安装包尚未公开发布，发布后会在此提供下载。") : platformHint(entry);
  const hint = hintText ? <p className="m-0 text-sm leading-[1.8] text-muted">{t(hintText)}</p> : null;

  if (entry.distribution === "testflight") {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <a className={PRIMARY_ACTION} href={entry.href} target="_blank" rel="noreferrer" onClick={() => reportDownloadClick({ platform: "ios", version: entry.publishedVersion ?? undefined, channel: "testflight" })}>
          {t("通过 TestFlight 安装 iOS 版")}
          <ExternalIcon />
        </a>
        <div>
          {hint}
          {entry.publishedVersion && <p className="m-0 text-sm leading-[1.8] text-muted">{t("显示最新公开发布版本；可安装版本以 TestFlight 为准。")}</p>}
        </div>
      </div>
    );
  }

  if (entry.distribution === "appgallery") {
    return (
      <div>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
          <a className="flex-none rounded-tile bg-white p-3" href={entry.href} target="_blank" rel="noreferrer" aria-label={t("打开华为 AppTest 测试邀请")}>
            <img src="/img/harmony-apptest-qr.png" width={180} height={180} alt={t("华为 AppTest 测试邀请二维码")} className="block h-[180px] w-[180px]" />
          </a>
          <div className="grid w-full min-w-0 justify-items-start gap-3 sm:w-auto">
            <p className="m-0 text-[15px] font-semibold text-ink">{t("用华为手机扫码加入测试，或点击下方链接。")}</p>
            <a className={PRIMARY_ACTION} href={entry.href} target="_blank" rel="noreferrer">
              {t("通过 AppTest 安装 HarmonyOS 版")}
              <ExternalIcon />
            </a>
            {hint}
          </div>
        </div>
        <p className="m-0 mt-4 text-sm leading-[1.8] text-body">
          {t("手动加入：在华为应用市场下载 AppTest，打开后输入邀请码 ")}
          <code className="select-all break-all font-semibold text-ink">{HARMONY_APPTEST_CODE}</code>
          {t("，加入水杉输入法测试并安装。")}
        </p>
        {/* HarmonyOS NEXT 不允许普通用户安装 HAP 文件，这里只给开发者一句调试安装的条件，不提供 HAP 下载。 */}
        <p className="m-0 mt-4 text-[13.5px] leading-[1.75] text-muted">
          {t("开发者：调试签名的 HAP 只能安装在已登记到调试 Profile 的设备上，需打开开发者模式并用 ")}
          <code className="text-[12.5px]">hdc install</code>
          {t(" 安装，见")}
          <a className="font-medium text-accent-ink hover:text-ink" href={HARMONY_BUILD_GUIDE_URL} target="_blank" rel="noreferrer">
            {t("构建说明")}
          </a>
          {t("。")}
        </p>
      </div>
    );
  }

  if (entry.distribution === "pgyer") {
    const apk = entry.release?.downloads[0];
    return (
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-3">
          <a className={PRIMARY_ACTION} href={entry.href} target="_blank" rel="noreferrer" onClick={() => reportDownloadClick({ platform: "android", version: entry.publishedVersion ?? undefined, channel: "pgyer" })}>
            {t("通过蒲公英安装 Android 版")}
            <ExternalIcon />
          </a>
          {/* android-v 发布里的 APK：和蒲公英是同一个应用，给装不了蒲公英、或者要特定版本（五笔、日语……）的人直接下载。 */}
          {entry.release && apk && (
            <>
              <a className={MIRROR_ACTION} href={apk.url} rel="noreferrer" aria-label={t(`从 GitHub 下载 Android 版 v${entry.release.version}`)} onClick={reportPackage("android", entry.release.version, apk)}>
                <GitHubIcon size={18} />
                {t("GitHub 下载")}
              </a>
              <MirrorAction platform="android" version={entry.release.version} entry={apk} className={MIRROR_ACTION} />
            </>
          )}
          {hint}
        </div>
        {entry.release && entry.release.downloads.length > 1 && <MorePackages platform="android" version={entry.release.version} downloads={entry.release.downloads.slice(1)} />}
      </div>
    );
  }

  if (entry.distribution === "sdk") {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0">
          <Pill>{t("开发者接入")}</Pill>
          <p className="m-0 mt-2.5 text-[15px] leading-[1.85] text-body">
            {t("Web 版不用下载安装：它是一个 npm 包，网站开发者把它嵌进自己的网页，访客在浏览器里就能用全拼、双拼和五笔。接入方式见下方说明。")}
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-3">
          <AnchorButton variant="secondary" href={entry.href}>
            {t("npm 包")}{entry.publishedVersion && ` v${entry.publishedVersion}`}
            <ExternalIcon />
          </AnchorButton>
          <AnchorButton variant="secondary" href={entry.sourceUrl}>
            {t("源码与示例")}
            <ExternalIcon />
          </AnchorButton>
        </div>
      </div>
    );
  }

  if (entry.distribution === "source") {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0">
          <Pill tone="warn">{t("开发中")}</Pill>
          <p className="m-0 mt-2.5 text-[15px] leading-[1.85] text-body">
            {t(`${entry.name} 版还没有发布安装包。源码和构建脚本在 msime 仓库中，可以按目录说明自行构建。`)}
          </p>
        </div>
        <AnchorButton variant="secondary" href={entry.sourceUrl} className="flex-none">
          {t("查看源码与构建说明")}
          <ExternalIcon />
        </AnchorButton>
      </div>
    );
  }

  const release = entry.release;
  // Linux 的主按钮只给一个包：完整版 deb，arm64 机器上换成 aarch64 的那个，按钮上写明是哪个包；国内镜像按钮跟着给同一个包。
  const { primary, others } = pickPrimary(entry.id, release?.downloads ?? [], arm64);
  const linuxPackage = entry.id === "linux" && primary ? describeLinuxPackage(primary) : null;
  const moreId = `more-packages-${entry.id}`;

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-3">
        <a
          className={PRIMARY_ACTION}
          href={primary?.url ?? entry.href}
          rel="noreferrer"
          target={primary ? undefined : "_blank"}
          onClick={primary && release ? reportPackage(entry.id as ReleasePlatform, release.version, primary) : undefined}
          aria-label={t(primary && release ? `从 GitHub 下载 ${entry.name}${entry.windowsVariant === "pure" ? " 正式版" : " 版"} v${release.version}${linuxPackage ? ` ${linuxPackage}` : ""}${entry.windowsVariant === "win7" ? ` ${primary.arch}` : ""}` : `前往 GitHub 上的 ${entry.name} 发布页`)}
        >
          <GitHubIcon size={18} />
          {t(entry.windowsVariant && primary && release ? `下载${entry.windowsVariant === "pure" ? "纯净版" : entry.windowsVariant === "online" ? "联网版" : "Windows 7 版"} v${release.version}${entry.windowsVariant === "win7" ? `（${primary.arch}）` : ""}` : linuxPackage ? `下载 ${linuxPackage}` : primary ? "GitHub 下载" : "GitHub 发布页")}
          {!primary && <ExternalIcon />}
        </a>
        {primary && release && <MirrorAction platform={entry.id as ReleasePlatform} version={release.version} entry={primary} className={MIRROR_ACTION} />}
        {entry.windowsVariant === "pure" && <WindowsMirrors release={release} />}
        {!release && entry.windowsVariant !== "win7" ? (
          <p className="m-0 text-sm leading-[1.8] text-muted">{t("暂时无法读取发布清单，请在发布页选择安装包并核对校验值。")}</p>
        ) : linuxPackage && primary ? (
          <LinuxOthers primary={primary} moreId={moreId} />
        ) : (
          hint
        )}
      </div>

      {release && others.length > 0 && <MorePackages id={moreId} platform={entry.id as ReleasePlatform} version={release.version} downloads={others} />}

      {release?.preview && <PreviewPanel platform={entry.id as ReleasePlatform} preview={release.preview} arm64={arm64} />}

    </div>
  );
}

/**
 * 页面顶部的下载入口（design-home §6「选择卡」），也是整页的标题区：页面不再有单独的页头，h1 就在这里，平台卡片和下载按钮在首屏内。
 *
 * 七个平台展示为九个入口，Windows 的三个版本各自选择。按 UA 选择平台，Windows 缺省选择纯净版。QQ、夸克与蓝奏云盘仅属于纯净版，不能跟着其他 Windows 入口展示。
 *
 * `.download-panel` is a test hook: the static HTML must show the Windows version inside it.
 */
export function DownloadPanel({ entries, platform, windowsVariant, onSelect }: { entries: SitePlatformEntry[]; platform: Platform; windowsVariant: WindowsVariant; onSelect: (platform: Platform, windowsVariant?: WindowsVariant) => void }) {
  const { t } = useLocale();
  const choices = downloadChoices(entries);
  const selected = choices.find((entry) => entry.id === platform && (entry.id !== "windows" || entry.windowsVariant === windowsVariant)) ?? choices[0];

  return (
    <section className="download-panel m-0 rounded-panel bg-panel p-[clamp(16px,3.4vw,40px)] shadow-feature" aria-labelledby="download-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 id="download-title" className="m-0 font-heading text-[clamp(22px,2.6vw,28px)] leading-[1.35] font-bold text-ink">
          {t("下载水杉输入法")}
        </h1>
        <a href="#releases" className="text-sm text-accent-ink hover:text-ink">
          {t("更新日志")}
        </a>
      </div>
      <div className="mt-4 grid auto-rows-fr grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
        {choices.map((entry) => {
          const active = entry === selected;
          return (
            <button
              key={entry.windowsVariant ?? entry.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(entry.id, entry.windowsVariant);
              }}
              className={cx(TILE, "cursor-pointer", active ? "bg-accent-soft shadow-ring-accent" : "bg-panel-2 hover:bg-accent-soft")}
            >
              <PlatformIcon platform={entry.id} className="flex-none" />
              <span className="flex min-w-0 flex-col items-center gap-x-2.5 sm:flex-row sm:flex-wrap sm:items-baseline">
                <span className={TILE_NAME}>
                  {entry.windowsVariant === "pure" || entry.windowsVariant === "online" ? (
                    <>Windows 10/11<span className="block text-xs whitespace-nowrap sm:inline sm:[font-size:inherit]">{t(entry.windowsVariant === "pure" ? "（纯净版）" : "（联网版）")}</span></>
                  ) : t(tileName(entry))}
                </span>
                <span className={TILE_STATUS}>{t(tileStatus(entry))}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-5 shadow-divider-t sm:mt-7 sm:pt-7" aria-live="polite">
        <PlatformAction entry={selected} />
      </div>
    </section>
  );
}
