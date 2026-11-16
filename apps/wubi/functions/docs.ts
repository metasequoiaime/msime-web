import { GUIDE_NAMES } from "../shared/site-seo.ts";

/** Preserve old shared guide URLs while consolidating indexing on static paths. */
export function onRequest({ request, next }: { request: Request; next: () => Promise<Response> }) {
  const url = new URL(request.url);
  if (url.hostname === "metasequoiaime.pages.dev") {
    url.hostname = "msime.app";
    return Response.redirect(url.toString(), 301);
  }
  const guide = url.searchParams.get("platform");
  if (guide && Object.hasOwn(GUIDE_NAMES, guide)) {
    url.pathname = `${url.pathname.startsWith("/zh-TW/") ? "/zh-TW" : ""}/docs/${guide}/`;
    url.searchParams.delete("platform");
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
