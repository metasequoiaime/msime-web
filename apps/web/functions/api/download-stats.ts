import { apiOriginSchema, DEFAULT_API_ORIGIN } from "../../shared/app-stats.ts";
import { loadMirrorDownloadStats } from "../../shared/mirror-download-stats.ts";
import { cachedJson, UpstreamUnavailable } from "../../shared/edge-cache.ts";

type Context = { request: Request; env: Record<string, unknown>; waitUntil: (task: Promise<unknown>) => void };
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** 只代理公开汇总，不持有后台令牌；首次不可用返回 503，已有缓存时保留最近成功值。 */
export async function onRequest({ request, env, waitUntil }: Context) {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...headers, Allow: "GET" } });
  const origin = apiOriginSchema.safeParse(env.MSIME_API_ORIGIN ?? DEFAULT_API_ORIGIN);
  if (!origin.success) return Response.json({ error: "下载统计暂不可用。" }, { status: 503, headers });
  const key = new Request(new URL("/api/download-stats", request.url));
  const cache = (caches as CacheStorage & { default: Cache }).default;
  try {
    const { data, stale } = await cachedJson(key, cache, () => loadMirrorDownloadStats(origin.data), { freshFor: 60_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: "下载统计暂不可用。" }, { status: 503, headers });
  }
}
