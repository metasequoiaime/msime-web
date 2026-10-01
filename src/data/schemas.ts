import { z } from "zod";

/*
 * Zod schemas for every resource the site reads. Query modules import this file lazily (`await import("./schemas.ts")`) so zod stays out of the entry chunk for pages that only render cached or seeded data. Server code (`shared/*`, `functions/*`) imports it directly, so the browser and the Pages Functions validate against the same definitions.
 */

export { communitySchema, type Community } from "../community-data.ts";
export { platformsSchema, type PlatformsManifest } from "../platforms-data.ts";
import { SITE_PLATFORMS } from "./platforms.ts";
import { CANDIDATE_SKIN_CATEGORIES } from "./skin-categories.ts";

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

// ---- notices (/api/notices) ----

/** Notices published to the website channel in the admin console, re-keyed to camelCase by the `/api/notices` Function, newest first. `body` is simple Markdown, rendered with raw HTML disabled. `targets` is `["all"]` or the platforms the notice is meant for. */
export const noticesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1).max(64),
      title: z.string().min(1),
      body: z.string(),
      targets: z.array(z.string()),
      publishedAt: z.iso.datetime({ offset: true }),
    })
  ),
  stale: z.boolean(),
});
export type Notices = z.infer<typeof noticesSchema>;
export type Notice = Notices["items"][number];

// ---- community skins (/api/skins/keyboard, /api/skins/candidate) ----

/** A community item id as msime-backend issues it (`validCommunityID` in internal/account/community.go). It is put into Function paths, so nothing else gets through. */
export const communitySkinIdSchema = z.string().regex(/^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/);

const skinColorSchema = z.number().int().min(0).max(0xffffff);
const optionalIn = (min: number, max: number) => z.number().min(min).max(max).optional().catch(undefined);

/**
 * A keyboard skin's design, the data-only format of `CommunityDesign` in msime-backend (internal/account/community.go), which matches the iOS `CustomKeyboardSkin` v1. The backend validates every field on publish; the required ones are checked again here because the page draws from them, and an optional field the page cannot use degrades to `undefined` instead of dropping the skin. `photo` never travels in the list, so it is not part of this schema; `/api/skins/keyboard/<id>/photo` serves it.
 */
export const keyboardSkinDesignSchema = z.object({
  background: skinColorSchema,
  keyBackground: skinColorSchema,
  keyForeground: skinColorSchema,
  accent: skinColorSchema,
  actionBackground: skinColorSchema,
  cornerRadius: z.number().min(0).max(20),
  borderWidth: z.number().min(0).max(2),
  shadow: z.number().min(0).max(0.4),
  pattern: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  monospaced: z.boolean(),
  keyShape: z.enum(["rounded", "capsule", "ticket", "pebble"]).optional().catch(undefined),
  keyMaterial: z.enum(["flat", "raised", "glass", "paper"]).optional().catch(undefined),
  keyOpacity: optionalIn(0.25, 1),
  gradientEnd: skinColorSchema.optional().catch(undefined),
  gradientHorizontal: z.boolean().optional().catch(undefined),
  patternOpacity: optionalIn(0, 0.5),
  customBorderColor: skinColorSchema.optional().catch(undefined),
  photoShade: optionalIn(0, 0.8),
  photoPosition: optionalIn(0, 1),
});
export type KeyboardSkinDesign = z.infer<typeof keyboardSkinDesignSchema>;

const ratingAverage = z.number().min(0).max(5);

export const keyboardSkinSchema = z.object({
  id: communitySkinIdSchema,
  name: z.string().min(1),
  description: z.string(),
  author: z.string(),
  design: keyboardSkinDesignSchema,
  downloads: count,
  ratingCount: count,
  ratingAverage,
});
export type KeyboardSkin = z.infer<typeof keyboardSkinSchema>;

export const candidateSkinSchema = z.object({
  id: communitySkinIdSchema,
  name: z.string().min(1),
  description: z.string(),
  author: z.string(),
  version: z.string().max(64),
  /** The asset licence the author declared, e.g. `CC-BY-4.0`. */
  license: z.string(),
  size: count,
  downloads: count,
  ratingCount: count,
  ratingAverage,
  createdAt: z.iso.datetime({ offset: true }),
  /** The gallery category. The Function reads a category it does not know as `other`, as the App does; absent only in a copy cached before the Function asked for categories. */
  category: z.enum(CANDIDATE_SKIN_CATEGORIES).optional(),
});
export type CandidateSkin = z.infer<typeof candidateSkinSchema>;

/** One page of a community skin list, re-keyed to camelCase by the Function. `nextOffset` is where the next page starts, or `null` on the last page; it counts the backend's rows, so a row the site could not read never shifts the pages after it. */
const skinPage = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item), nextOffset: count.nullable(), stale: z.boolean() });
export const keyboardSkinsSchema = skinPage(keyboardSkinSchema);
export type KeyboardSkins = z.infer<typeof keyboardSkinsSchema>;
export const candidateSkinsSchema = skinPage(candidateSkinSchema);
export type CandidateSkins = z.infer<typeof candidateSkinsSchema>;
