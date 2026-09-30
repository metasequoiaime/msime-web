import { SITE_PLATFORMS } from "../src/data/platforms.ts";

/**
 * The retired /releases/ page redirects to the release list at the end of the download page.
 *
 * The old page filtered with `?platform=`, which on the download page belongs to the installer picker, so a valid platform moves to the list's own `?release=` filter and anything else is dropped (the list then shows every platform). Other params are kept.
 */
export function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");
  url.searchParams.delete("platform");
  if (SITE_PLATFORMS.some((value) => value === platform)) url.searchParams.set("release", platform as string);
  url.pathname = `${url.pathname.startsWith("/zh-TW/") ? "/zh-TW" : ""}/download/`;
  url.hash = "releases";
  return Response.redirect(url.toString(), 301);
}
