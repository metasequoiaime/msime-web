export const UMAMI_ORIGIN = "https://umami.yldm.tech";
export const UMAMI_WEBSITE_ID = "be5550dc-13d6-43a0-8e9c-b7ca9fe2a72b";
const SITE_ORIGIN = "https://msime.app";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

type Payload = Record<string, unknown>;
export type DownloadClick = { platform: string; channel: string; version?: string; artifact?: string };

declare global {
  interface Window {
    umami?: { track: (name: string, data: DownloadClick) => Promise<void> };
    msimeUmamiBeforeSend?: (type: string, payload: Payload) => Payload | false;
  }
}

/** 只保留发布链接的活动参数，不上传搜索词、账号回调参数或页面锚点。 */
function campaignUrl(value: unknown): URL {
  const url = new URL(typeof value === "string" ? value : "/", SITE_ORIGIN);
  const search = new URLSearchParams();
  for (const key of CAMPAIGN_KEYS) {
    const value = url.searchParams.get(key);
    if (value && /^[a-zA-Z0-9._~-]{1,128}$/.test(value)) search.set(key, value);
  }
  url.username = "";
  url.password = "";
  url.search = search.toString();
  url.hash = "";
  return url;
}

/** 站内换页后继续使用入口活动；不写 Cookie、本地存储或账号标识。 */
export function analyticsBeforeSend(entryUrl: string) {
  let campaign = campaignUrl(entryUrl).searchParams;
  return (type: string, payload: Payload): Payload | false => {
    if (type !== "event") return false;
    try {
      const url = campaignUrl(payload.url);
      if (url.searchParams.size) campaign = new URLSearchParams(url.searchParams);
      else for (const [key, value] of campaign) url.searchParams.set(key, value);
      const referrer = typeof payload.referrer === "string" && payload.referrer ? new URL(payload.referrer, SITE_ORIGIN) : null;
      const safe: Payload = {
        website: UMAMI_WEBSITE_ID,
        hostname: "msime.app",
        url: url.pathname + url.search,
        referrer: referrer ? (referrer.origin === SITE_ORIGIN ? referrer.pathname : referrer.origin) : "",
        title: payload.title,
        screen: payload.screen,
        language: payload.language,
      };
      if (payload.name === "Download") {
        const data = payload.data as Partial<DownloadClick> | undefined;
        safe.name = "Download";
        safe.data = Object.fromEntries(["platform", "channel", "version", "artifact"].flatMap(key => {
          const value = data?.[key as keyof DownloadClick];
          return typeof value === "string" && value.length <= 128 ? [[key, value]] : [];
        }));
      } else if (payload.name) return false;
      return safe;
    } catch { return false; }
  };
}

/** 只在正式域名加载统计；预览、开发与 DNT 访问均不请求统计服务。 */
export function startSiteAnalytics() {
  if (window.location.hostname !== "msime.app" || window.navigator.doNotTrack === "1" || window.navigator.doNotTrack === "yes" || document.getElementById("msime-umami")) return;
  window.msimeUmamiBeforeSend = analyticsBeforeSend(window.location.href);
  const script = document.createElement("script");
  script.id = "msime-umami";
  script.src = `${UMAMI_ORIGIN}/script.js`;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  script.dataset.domains = "msime.app";
  script.dataset.doNotTrack = "true";
  script.dataset.excludeHash = "true";
  script.dataset.beforeSend = "msimeUmamiBeforeSend";
  document.head.appendChild(script);
}

/** 下载点击与安装完成分开统计；统计故障不影响跳转或下载。 */
export function reportDownloadClick(download: DownloadClick) {
  if (typeof window === "undefined" || window.location.hostname !== "msime.app") return;
  if (window.navigator.doNotTrack === "1" || window.navigator.doNotTrack === "yes") return;
  try { void window.umami?.track("Download", download)?.catch(() => {}); } catch { /* 丢弃统计失败。 */ }
}
