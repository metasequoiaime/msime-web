import { z } from "zod";

const PROJECT_RELEASES = "https://github.com/metasequoiaime/";

/**
 * Release manifest of the official site (`apps/web/public/platforms.json`, copied by scripts/sync-release-data.mjs), trimmed to the fields this site reads.
 *
 * Every address must sit under the project's GitHub organisation: these values become download links, and `z.string().url()` alone accepts `javascript:` and `data:`. One bad address voids that platform's release, so the page falls back to the release list instead of showing a quietly filtered list. A platform that fails to parse only removes that platform.
 */
const projectUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith(PROJECT_RELEASES), { message: "Address must point at the project's GitHub organisation" });

const downloadSchema = z.object({
  name: z.string(),
  url: projectUrl,
  // The same file on dl.msime.app, written by the official site's automation after reading it back through the mirror. A bad mirror address drops only the mirror link.
  mirrorUrl: z.url({ protocol: /^https$/, hostname: z.regexes.domain }).optional().catch(undefined),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().catch(null),
});

const releaseSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?$/),
  releaseUrl: projectUrl,
  publishedAt: z.string(),
  downloads: z.array(downloadSchema).min(1),
});

const platformSchema = releaseSchema
  .extend({
    // The Windows line from the msime repository (unsigned preview); the only Windows release that carries per-edition installers.
    experimental: releaseSchema.nullable().catch(null),
  })
  .nullable()
  .optional()
  .catch(null);

export const platformsSchema = z.object({
  generatedAt: z.string(),
  platforms: z.object({
    windows: platformSchema,
    macos: platformSchema,
    linux: platformSchema,
    android: platformSchema,
  }),
});

export type PlatformsManifest = z.infer<typeof platformsSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Download = z.infer<typeof downloadSchema>;
