/**
 * 官网为外部网盘和其他镜像记录匿名点击；dl.msime.app 的安装包由服务器保存事件并重试投递。
 * GitHub 使用发行附件计数，不再由官网重复上报。事件不包含安装 ID、Cookie 或访问者资料。
 */

export const TELEMETRY_EVENTS_URL = "https://api.msime.app/v1/telemetry/events";

/** 本站镜像由文件服务器记录，浏览器再报一次会把同一个下载重复累计。 */
export function serverCountsMirror(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.origin === "https://dl.msime.app" && (url.pathname.startsWith("/releases/") || url.pathname.startsWith("/gh/"));
  } catch { return false; }
}

/** Rust 版与纯净版都叫 Windows，按真实包地址标记产品，保留现有事件协议。 */
export const mirrorDownloadPlatform = (platform: string, url: string) =>
  platform === "windows" && /^https:\/\/github\.com\/metasequoiaime\/msime\/releases\/download\//i.test(url) ? "windows-rust" : platform;

export type MirrorDownload = {
  /** 安装包平台；Rust Windows 用 windows-rust，与纯净版区分。 */
  platform: string;
  /** The release version the mirror is offered for, e.g. `0.9.3`. */
  version: string;
  /** The package file name, e.g. `MetasequoiaIME_Setup_v0.9.3.exe`. */
  artifact: string;
};

/** The request body of `POST /v1/telemetry/events` for one mirror click. */
export const mirrorDownloadEvent = ({ platform, version, artifact }: MirrorDownload, id: string = crypto.randomUUID()) => ({
  id,
  kind: "download",
  platform,
  version,
  artifact,
  channel: "cn-mirror",
});

/**
 * Sends the event without delaying the click. `keepalive` lets the request finish even if the tab navigates away; failures are dropped, because a lost count is not worth a retry queue on a website.
 */
export function reportMirrorDownload(download: MirrorDownload, request: typeof fetch = fetch) {
  request(TELEMETRY_EVENTS_URL, {
    method: "POST",
    keepalive: true,
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mirrorDownloadEvent(download)),
  }).catch(() => {});
}
