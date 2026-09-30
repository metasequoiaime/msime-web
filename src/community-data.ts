import { z } from "zod";

const githubUrl = (prefix: string) =>
  z
    .string()
    .url()
    .refine((value) => value.startsWith(prefix), { message: `地址必须以 ${prefix} 开头` });

export const communitySchema = z.object({
  generatedAt: z.string(),
  stale: z.boolean().optional(),
  totalStars: z.number().int().nonnegative(),
  repoCount: z.number().int().nonnegative(),
  starHistory: z.array(z.object({ month: z.string(), stars: z.number().int().nonnegative() })).min(1),
  /* Per-repository cumulative stars, one point per month (the last one dated today). Optional: the bundled snapshot and edge-cache entries written before the field existed do not carry it, and the chart falls back to `starHistory`. A malformed series only drops the series, never the section. */
  starSeries: z
    .array(
      z.object({
        repo: z.string().regex(/^[\w.-]+$/),
        points: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), stars: z.number().int().nonnegative() })).min(1),
      })
    )
    .optional()
    .catch(undefined),
  /* Stars gained across the organisation in the last 30 days, from the same weekly aggregate as the series. */
  starDelta30d: z.number().int().nonnegative().optional().catch(undefined),
  contributors: z
    .array(
      z.object({
        login: z.string(),
        avatarUrl: githubUrl("https://avatars.githubusercontent.com/"),
        url: githubUrl("https://github.com/"),
        contributions: z.number().int().nonnegative(),
        repos: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

export type Community = z.infer<typeof communitySchema>;
