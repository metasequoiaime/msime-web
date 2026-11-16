import { screenshotBucket } from "../../../shared/feedback-images.ts";

export async function onRequest({ request, env, params }: { request: Request; env: Record<string, unknown>; params: { key: string } }) {
  const headers = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": "no-store" };
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  if (new URL(request.url).origin !== env.FEEDBACK_ORIGIN) return new Response(null, { status: 403, headers });
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(png|jpeg|webp)$/.test(params.key)) return new Response(null, { status: 404, headers });
  const bucket = screenshotBucket(env);
  if (!bucket) return new Response(null, { status: 503, headers });
  try {
    const object = await bucket.get(`feedback/${params.key}`);
    if (!object) return new Response(null, { status: 404, headers });
    const extension = params.key.split(".").at(-1);
    return new Response(request.method === "HEAD" ? null : object.body, { headers: {
      ...headers, "Content-Type": `image/${extension}`, "Content-Disposition": "inline", "Cache-Control": "public, max-age=3600",
    } });
  } catch { return new Response(null, { status: 503, headers }); }
}
