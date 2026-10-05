import type { SitePlatformEntry } from "../data/platforms.ts";
import type { PlatformRelease, PreviewRelease } from "../platforms-data.ts";
import type { Platform } from "../platform.ts";
import { useDownloadMirrorsQuery } from "../data/queries";
import { AnchorButton, ChevronDownIcon, CloudDownloadIcon, copyText, cx, ExternalIcon, GitHubIcon, Pill, PlatformIcon, QQIcon, useToast } from "../ui";
import { useLocale } from "../use-locale";
import { reportMirrorDownload } from "../../shared/download-events";
import { groupByArch, readableSize } from "./template";

/** The Windows installer is also uploaded to this QQ group's files, for visitors who cannot reach GitHub quickly; joining the group also puts them where feedback is answered. */
const QQ_GROUP = "829919142";

// 系统要求是产品决策，不在产物里，只能写下来。Windows 的要求选择卡上已经写成「Windows 10/11」，按钮旁不再重复。
const PLATFORM_HINTS: Partial<Record<Platform, string>> = {
  macos: "适用于 macOS 12 及以上",
  linux: "开发构建，适用于使用 Fcitx5 或 IBus 的桌面环境",
  android: "开发中，尚未发布安装包",
  ios: "适用于 iOS 17 及以上",
  harmony: "开发中，尚未发布安装包",
};

/** macOS 的最低版本跟着安装包格式走，理由见下面 `platformHint`。 */
const macosMinimum = (entry: SitePlatformEntry) => (entry.release?.downloads.some((download) => /\.dmg$/i.test(download.name)) ? 13 : 12);

/** 选择卡上的平台名带上系统要求，免得在下面的提示里再找一遍 */
const tileName = (entry: SitePlatformEntry) => {
  if (entry.id === "windows") return "Windows 10/11";
  if (entry.id === "macos") return `macOS ${macosMinimum(entry)}+`;
  if (entry.id === "ios") return "iOS 17+";
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

/** What the tile's status says: the current version, or, kept to a word, how the platform is distributed. The details sit in the action strip and the guide below. */
const tileStatus = (entry: SitePlatformEntry) => {
  if (entry.distribution === "testflight") return "TestFlight";
  if (entry.distribution === "source") return "开发中";
  if (entry.distribution === "sdk") return "npm";
  return entry.release ? `v${entry.release.version}` : "查看发布页";
};

/**
 * The seven platform tiles, three to a row: desktop on the first row, mobile on the second, and Web alone on a third row across the full width, since it is embedded in pages rather than installed. On a phone a third of the panel is too narrow for mark, name and status side by side, so the tile stacks them centred; from `sm` up the mark sits on the left and the status follows the name on the same line, wrapping under it only when the column is too narrow.
 *
 * The status uses the body font, not `font-mono`: JetBrains Mono is not bundled, and where it is missing the monospace fallback on Windows is a serif face.
 */
const TILE =
  "flex min-w-0 flex-col items-center gap-1.5 rounded-menu px-1.5 py-3 text-center text-ink transition-[background-color,box-shadow] duration-150 sm:flex-row sm:gap-3 sm:px-4 sm:py-3.5 sm:text-left";
const TILE_NAME = "text-sm leading-snug font-semibold [overflow-wrap:break-word] sm:text-lg lg:text-[20px]";
const TILE_STATUS = "text-[12.5px] leading-snug font-medium text-accent-ink tabular-nums [overflow-wrap:anywhere] sm:text-sm";

/* 主推那个之外的包，按架构分组收进折叠区。正式版和预览版各用一份。 */
function MorePackages({ downloads }: { downloads: PlatformRelease["downloads"] }) {
  const { t } = useLocale();
  return (
    <details className="group mt-4 rounded-group bg-panel-2 px-4 [&[open]]:pb-3">
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
                  <a className="min-w-0 text-sm font-medium text-accent-ink [overflow-wrap:anywhere] hover:text-ink" href={entry.url} rel="noreferrer">
                    {t(entry.label)}
                  </a>
                  <span className="flex-none text-[13px] text-muted tabular-nums">{t(readableSize(entry.size))}</span>
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
 */
function PreviewPanel({ preview }: { preview: PreviewRelease }) {
  const { t } = useLocale();
  const [first] = preview.downloads;

  return (
    <section className="mt-6 rounded-tile p-[clamp(18px,2.4vw,24px)] shadow-ring-2" aria-label={t("预览版")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Pill tone="warn">{t("预览版")}</Pill>
        <a
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-btn bg-panel px-5 py-2 text-center text-[15px] leading-snug font-semibold text-ink no-underline shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink"
          href={first.url}
          rel="noreferrer"
        >
          {t(`下载预览版 v${preview.version}`)}
        </a>
      </div>
      <p className="m-0 mt-3 text-sm leading-[1.8] text-muted">{t("包含尚未进入正式版的改动，可能不稳定。")}</p>
      {preview.downloads.length > 1 && <MorePackages downloads={preview.downloads.slice(1)} />}
    </section>
  );
}

/**
 * Windows-only mirrors beside the GitHub button. The QQ group number is copied rather than linked: QQ has no web link that opens a group's files. The Lanzou link is set by admins in msime-backend and left out until one is configured or while the backend cannot be reached.
 *
 * A click on the Lanzou link is reported as an anonymous download count (shared/download-events.ts) with the release's installer name and version; without a release manifest there is nothing accurate to report, so the click goes uncounted.
 */
function WindowsMirrors({ release }: { release: PlatformRelease | null }) {
  const { t } = useLocale();
  const { show } = useToast();
  const lanzouUrl = useDownloadMirrorsQuery().data?.lanzouUrl;

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
      {lanzouUrl && (
        <a
          className={MIRROR_ACTION}
          href={lanzouUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            const installer = release?.downloads[0];
            if (release && installer) reportMirrorDownload({ version: release.version, artifact: installer.name });
          }}
        >
          <CloudDownloadIcon size={20} className="flex-none" />
          {t("蓝奏云盘")}
          <ExternalIcon className="flex-none text-accent-ink" />
        </a>
      )}
    </div>
  );
}

/**
 * The action strip under the tiles for the selected platform: the download button (plus the Windows mirrors) with one compatibility line, or an honest status for platforms that do not ship packages yet.
 *
 * File name, architecture, size, signature and checksums are deliberately not repeated here: they live in the release notes and the install guide below, and listing them next to the button only pushed it out of view.
 */
function PlatformAction({ entry }: { entry: SitePlatformEntry }) {
  const { t } = useLocale();
  const hintText = platformHint(entry);
  const hint = hintText ? <p className="m-0 text-sm leading-[1.8] text-muted">{t(hintText)}</p> : null;

  if (entry.distribution === "testflight") {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <a className={PRIMARY_ACTION} href={entry.href} target="_blank" rel="noreferrer">
          {t("通过 TestFlight 安装 iOS 版")}
          <ExternalIcon />
        </a>
        {hint}
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
            {t("npm 包")}
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
  const primary = release?.downloads[0];

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-3">
        <a
          className={PRIMARY_ACTION}
          href={primary?.url ?? entry.href}
          rel="noreferrer"
          target={primary ? undefined : "_blank"}
          aria-label={t(primary && release ? `从 GitHub 下载 ${entry.name} 版 v${release.version}` : `前往 GitHub 上的 ${entry.name} 发布页`)}
        >
          <GitHubIcon size={18} />
          {t(primary ? "GitHub 下载" : "GitHub 发布页")}
          {!primary && <ExternalIcon />}
        </a>
        {entry.id === "windows" && <WindowsMirrors release={release} />}
        {release ? hint : <p className="m-0 text-sm leading-[1.8] text-muted">{t("暂时无法读取发布清单，请在发布页选择安装包并核对校验值。")}</p>}
      </div>

      {release && release.downloads.length > 1 && <MorePackages downloads={release.downloads.slice(1)} />}

      {release?.preview && <PreviewPanel preview={release.preview} />}
    </div>
  );
}

/**
 * 页面顶部的下载入口（design-home §6「选择卡」），也是整页的标题区：页面不再有单独的页头，h1 就在这里，平台卡片和下载按钮在首屏内。
 *
 * 七个平台都是可选的卡片，按 UA 猜到的那个只是默认选中（不会猜成 Web）；选中后下面给出这个平台真实可用的入口：桌面平台是安装包，iOS 是 TestFlight，Android 与 HarmonyOS 如实说明还在开发、只能从源码构建，Web 是给网站开发者接入的 npm 包。QQ 群文件和蓝奏云盘只有 Windows 安装包，放在 Windows 的下载按钮旁边。
 *
 * `.download-panel` is a test hook: the static HTML must show the Windows version inside it.
 */
export function DownloadPanel({ entries, platform, onSelect }: { entries: SitePlatformEntry[]; platform: Platform; onSelect: (platform: Platform) => void }) {
  const { t } = useLocale();
  const selected = entries.find((entry) => entry.id === platform) ?? entries[0];

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
      <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
        {entries.map((entry) => {
          const active = entry.id === platform;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(entry.id);
              }}
              className={cx(TILE, "cursor-pointer", entry.distribution === "sdk" && "col-span-full sm:justify-center", active ? "bg-accent-soft shadow-ring-accent" : "bg-panel-2 hover:bg-accent-soft")}
            >
              <PlatformIcon platform={entry.id} className="flex-none" />
              <span className="flex min-w-0 flex-col items-center gap-x-2.5 sm:flex-row sm:flex-wrap sm:items-baseline">
                <span className={TILE_NAME}>{t(tileName(entry))}</span>
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
