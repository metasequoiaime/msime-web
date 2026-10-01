/**
 * Download counts for the cloud-drive mirror. GitHub Release downloads are counted by msime-backend from its release snapshots and installed apps report themselves, so the only download the website reports is a click on the Lanzou mirror link, as `kind=download` with `channel=cn-mirror`. The GitHub buttons report nothing: counting them here would count the same download twice.
 *
 * The event is anonymous: a fresh random id per click, no install id, no cookie. `POST /v1/telemetry/events` needs no credentials, and `https://api.msime.app` is already in the page's `connect-src`.
 */

export const TELEMETRY_EVENTS_URL = "https://api.msime.app/v1/telemetry/events";

export type MirrorDownload = {
  /** The release version the mirror is offered for, e.g. `0.9.3`. */
  version: string;
  /** The installer file name, e.g. `MetasequoiaIME_Setup_v0.9.3.exe`. */
  artifact: string;
};

/** The request body of `POST /v1/telemetry/events` for one mirror click. Only the Windows installer is mirrored. */
export const mirrorDownloadEvent = ({ version, artifact }: MirrorDownload, id: string = crypto.randomUUID()) => ({
  id,
  kind: "download",
  platform: "windows",
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
