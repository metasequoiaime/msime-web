/** Retired beta pages redirect to the matching download option. */
export function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  url.searchParams.set("platform", url.searchParams.get("platform") === "macos" ? "macos" : "ios");
  url.pathname = `${url.pathname.startsWith("/zh-TW/") ? "/zh-TW" : ""}/download/`;
  return Response.redirect(url.toString(), 301);
}
