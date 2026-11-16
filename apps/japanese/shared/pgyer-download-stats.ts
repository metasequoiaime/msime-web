import { z } from "zod";

/** 只公开累计和版本标识的摘要，不保存蒲公英凭据或应用详情。 */
export const pgyerDownloadStatsSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  total: z.number().int().nonnegative().safe(),
  builds: z.array(z.object({
    id: z.string().regex(/^[a-f0-9]{64}$/),
    downloads: z.number().int().nonnegative().safe(),
  })),
}).refine(value => new Set(value.builds.map(build => build.id)).size === value.builds.length
  && value.total === value.builds.reduce((sum, build) => sum + build.downloads, 0));

export type PgyerDownloadStats = z.infer<typeof pgyerDownloadStatsSchema>;
