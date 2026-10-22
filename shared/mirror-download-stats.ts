import { z } from "zod";

const count = z.number().int().nonnegative();

/** 累计值覆盖全部历史镜像点击，未知平台也保留在合计中。 */
export const mirrorDownloadStatsSchema = z.object({
  total: count,
  platforms: z.record(z.string(), count),
  generatedAt: z.iso.datetime({ offset: true }),
}).refine(value => value.total === Object.values(value.platforms).reduce((sum, number) => sum + number, 0));
export type MirrorDownloadStats = z.infer<typeof mirrorDownloadStatsSchema>;

export async function loadMirrorDownloadStats(origin: string, request: typeof fetch = fetch): Promise<MirrorDownloadStats> {
  const response = await request(`${origin}/v1/site/download-stats`, {
    headers: { Accept: "application/json", "User-Agent": "MSIME-Web-download-stats" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Download stats unavailable: HTTP ${response.status}`);
  const value = await response.json() as Record<string, unknown>;
  return mirrorDownloadStatsSchema.parse({ ...value, generatedAt: value.generated_at });
}

/** 使用最近成功的镜像数据；读取失败时不能把已有累计数替换为零。 */
export function latestMirrorDownloadStats(...values: (MirrorDownloadStats | undefined)[]): MirrorDownloadStats | undefined {
  return values.filter((value): value is MirrorDownloadStats => !!value)
    .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))[0];
}
