import { z } from "zod";

/*
 * Zod schemas for every resource the site reads. Query modules import this file lazily (`await import("./schemas.ts")`) so zod stays out of the entry chunk for pages that only render cached or seeded data. Server code (`shared/*`, `functions/*`) imports it directly, so the browser and the Pages Functions validate against the same definitions.
 */

export { communitySchema, type Community } from "../community-data.ts";
export { platformsSchema, type PlatformsManifest } from "../platforms-data.ts";
import { SITE_PLATFORMS } from "./platforms.ts";

export const PROJECT_ORIGIN = "https://github.com/metasequoiaime/";

const projectUrl = z
  .string()
  .url()
  .refine(value => value.startsWith(PROJECT_ORIGIN), { message: "地址必须指向本项目的 GitHub 仓库" });

// ---- update-manifest (/update.json) ----

const WINDOWS_RELEASES = "https://github.com/metasequoiaime/MSIME-Windows/releases";

/**
 * `public/update.json`, the Windows client's own update manifest. The version and release URL are required and the release URL must sit under the Windows releases path, because it becomes a download link; the other fields degrade to `undefined` on their own so one bad field never blanks the page. The installer name is substituted into a PowerShell command, so it is held to the shape the release workflow produces.
 */
export const updateManifestSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)*$/),
  releaseUrl: z.string().refine(value => value === WINDOWS_RELEASES || value.startsWith(`${WINDOWS_RELEASES}/`)),
  installerUrl: z
    .string()
    .refine(value => value.startsWith(`${WINDOWS_RELEASES}/download/`))
    .optional()
    .catch(undefined),
  installerName: z
    .string()
    .regex(/^MetasequoiaIME_Setup_v[\w.-]+\.exe$/i)
    .optional()
    .catch(undefined),
  installerSha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional()
    .catch(undefined),
  signed: z.boolean().optional().catch(undefined),
});
export type UpdateManifest = z.infer<typeof updateManifestSchema>;

// ---- releases (/api/releases) ----

/** Release notes are cut to this many UTF-8 bytes on the server; `truncated` tells the page to link to GitHub for the rest. */
export const RELEASE_BODY_LIMIT = 8192;

export const releaseItemSchema = z.object({
  /** `<repo>/<GitHub release id>/<platform>`: one GitHub release that ships assets for two platforms appears once under each. */
  id: z.string().regex(/^[\w.-]+\/\d+\/[a-z]+$/),
  repo: z.string().regex(/^[\w.-]+$/),
  platform: z.enum(SITE_PLATFORMS),
  version: z.string().regex(/^\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?$/),
  tag: z.string().min(1).max(128),
  title: z.string().min(1).max(256),
  prerelease: z.boolean(),
  publishedAt: z.iso.datetime(),
  url: projectUrl,
  body: z.string().max(RELEASE_BODY_LIMIT),
  truncated: z.boolean(),
});
export type ReleaseItem = z.infer<typeof releaseItemSchema>;

export const releasesSchema = z.object({
  generatedAt: z.iso.datetime(),
  /** True when the Function served its cached copy because GitHub could not be reached. */
  stale: z.boolean(),
  items: z.array(releaseItemSchema),
});
export type Releases = z.infer<typeof releasesSchema>;

// ---- app-stats (/api/app-stats) ----

const count = z.number().int().nonnegative();

/** Community content counters from msime-backend, re-keyed to camelCase by the `/api/app-stats` Function. */
export const appStatsSchema = z.object({
  skins: count,
  skinDownloads: count,
  dictionaries: count,
  replies: count,
  resourceSaves: count,
  generatedAt: z.iso.datetime({ offset: true }),
  stale: z.boolean(),
});
export type AppStats = z.infer<typeof appStatsSchema>;

// ---- download-mirrors (/api/download-mirrors) ----

/** Cloud-drive mirrors of the Windows installer, set by admins in msime-backend. Only https links get through: the value is rendered as an `href`. An empty string means none is configured. */
export const downloadMirrorsSchema = z.object({
  lanzouUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, hostname: z.regexes.domain })]),
  stale: z.boolean(),
});
export type DownloadMirrors = z.infer<typeof downloadMirrorsSchema>;
