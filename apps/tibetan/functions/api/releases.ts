import { RELEASE_FILTERS } from "../../src/data/platforms.ts";
import { cachedJson, UpstreamUnavailable } from "../../shared/edge-cache.ts";
import { communityToken, githubAppConfig } from "../../shared/github-app.ts";
import { loadReleases } from "../../shared/releases.ts";

type Context = { request: Request; env: Record<string, unknown>; waitUntil: (task: Promise<unknown>) => void };

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** GET /api/releases?platform=all|windows|macos|linux|android|ios|harmony → `releasesSchema` (src/data/schemas.ts). One cached sweep serves every filter. */
export async function onRequest({ request, env, waitUntil }: Context) {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...headers, Allow: "GET" } });
  const requested = new URL(request.url).searchParams.get("platform") ?? "all";
  const platform = RELEASE_FILTERS.find(value => value === requested);
  if (!platform) return Response.json({ error: "未知的平台。" }, { status: 400, headers });
  const key = new Request(new URL("/api/releases", request.url));
  const cache = (caches as CacheStorage & { default: Cache }).default;
  try {
    const { data, stale } = await cachedJson(key, cache, async () => {
      // Releases of public repositories need nothing beyond the metadata permission the community sweep already uses.
      const token = await communityToken(githubAppConfig.parse(env));
      return loadReleases(token);
    }, { freshFor: 600_000, background: waitUntil });
    const items = platform === "all" ? data.items : data.items.filter(item => item.platform === platform);
    return Response.json({ ...data, stale, items }, { headers });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: "暂时无法读取更新日志，请稍后再试或前往 GitHub 查看。" }, { status: 503, headers });
  }
}
