import { z } from "zod";
import { appStatsSchema, type AppStats } from "../src/data/schemas.ts";

export const DEFAULT_API_ORIGIN = "https://api.msime.app";

/** Only an https origin (or a loopback http one for local `wrangler pages dev`) with no path, so a misconfigured variable cannot turn the Function into a proxy for arbitrary URLs. */
export const apiOriginSchema = z
  .url()
  .refine(value => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return (url.protocol === "https:" || (loopback && url.protocol === "http:")) && url.origin === value.replace(/\/$/, "");
  })
  .transform(value => value.replace(/\/$/, ""));

/** `GET /v1/community/stats` on msime-backend (internal/account/community_stats.go). */
const backendStatsSchema = z.object({
  skins: z.number().int().nonnegative(),
  skin_downloads: z.number().int().nonnegative(),
  dictionaries: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  resource_saves: z.number().int().nonnegative(),
  generated_at: z.string(),
});

export async function loadAppStats(origin: string, request: typeof fetch = fetch): Promise<AppStats> {
  const response = await request(`${origin}/v1/community/stats`, {
    headers: { Accept: "application/json", "User-Agent": "MSIME-Web-app-stats" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Community stats unavailable: HTTP ${response.status}`);
  const stats = backendStatsSchema.parse(await response.json());
  return appStatsSchema.parse({
    skins: stats.skins,
    skinDownloads: stats.skin_downloads,
    dictionaries: stats.dictionaries,
    replies: stats.replies,
    resourceSaves: stats.resource_saves,
    generatedAt: stats.generated_at,
    stale: false,
  });
}
