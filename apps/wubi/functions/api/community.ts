import { communityToken, githubAppConfig } from "../../shared/github-app.ts";
import { cachedCommunity, loadCommunity } from "../../shared/live-community.ts";
import fallback from "../../public/community.json";

export async function onRequest({ request, env, waitUntil }: { request: Request; env: Record<string, unknown>; waitUntil: (task: Promise<unknown>) => void }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { ...headers, Allow: "GET" } });
  const key = new Request(new URL("/api/community", request.url));
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const data = await cachedCommunity(key, cache, async () => {
    let stage = "configuration";
    try {
      const config = githubAppConfig.parse(env);
      stage = "authentication";
      const token = await communityToken(config);
      stage = "statistics";
      return await loadCommunity(token);
    } catch (error) {
      console.warn("Community refresh failed", stage, error instanceof Error && error.name !== "ZodError" ? error.message : "Invalid response or configuration");
      throw error;
    }
  }, fallback, waitUntil);
  return Response.json(data, { headers });
}
