import { apiOriginSchema, DEFAULT_API_ORIGIN } from "../../shared/app-stats.ts";
import { loadDownloadMirrors } from "../../shared/download-mirrors.ts";
import { cachedJson, UpstreamUnavailable } from "../../shared/edge-cache.ts";

type Context = { request: Request; env: Record<string, unknown>; waitUntil: (task: Promise<unknown>) => void };

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** GET /api/download-mirrors → `downloadMirrorsSchema` (src/data/schemas.ts). A server-side proxy so the browser stays on `connect-src 'self'`; 503 `{ error }` when the backend has never answered, and the download panel leaves the mirror out. */
export async function onRequest({ request, env, waitUntil }: Context) {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...headers, Allow: "GET" } });
  const origin = apiOriginSchema.safeParse(env.MSIME_API_ORIGIN ?? DEFAULT_API_ORIGIN);
  if (!origin.success) {
    console.warn("MSIME_API_ORIGIN is not a bare https origin");
    return Response.json({ error: "网盘下载地址暂不可用。" }, { status: 503, headers });
  }
  const key = new Request(new URL("/api/download-mirrors", request.url));
  const cache = (caches as CacheStorage & { default: Cache }).default;
  try {
    const { data, stale } = await cachedJson(key, cache, () => loadDownloadMirrors(origin.data), { freshFor: 600_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: "网盘下载地址暂不可用。" }, { status: 503, headers });
  }
}
