import { z } from "zod";
import type { SitePlatform } from "../src/data/platforms.ts";
import { PROJECT_ORIGIN, RELEASE_BODY_LIMIT, releaseItemSchema, type ReleaseItem, type Releases } from "../src/data/schemas.ts";

/*
 * Release history for the changelog page, gathered from every repository that publishes installable builds.
 *
 * - `msime` hosts macOS, iOS and (eventually) Android and HarmonyOS. One release can carry builds for two platforms (`v0.49.0-build.1002.71.1` ships both `-ios-testflight.ipa` and `-macos-universal.pkg`), so the platform is read from each asset name and such a release is listed once under each platform. The tag prefix (`ios-v…`) is the fallback for a release whose assets say nothing.
 * - `msime-windows` only ships Windows.
 * - `msime-linux` is archived but still holds the only Linux releases (0.8.x stable, 0.9.x previews), so it stays a source.
 */
export const RELEASE_SOURCES: readonly { repo: string; platform?: SitePlatform }[] = [
  { repo: "msime" },
  { repo: "msime-windows", platform: "windows" },
  { repo: "msime-linux", platform: "linux" },
];

const PLATFORM_TOKENS: Record<string, SitePlatform> = {
  windows: "windows", macos: "macos", linux: "linux", android: "android", ios: "ios", harmony: "harmony", harmonyos: "harmony", ohos: "harmony",
};
const EXTENSIONS: Record<string, SitePlatform> = {
  exe: "windows", msi: "windows", msix: "windows", pkg: "macos", dmg: "macos", deb: "linux", rpm: "linux", appimage: "linux", apk: "android", aab: "android", ipa: "ios", hap: "harmony",
};

/** The platform an asset belongs to, from a platform word in its name (`-macos-universal.pkg`, `-ios-testflight.ipa`) or else from an installer extension. Checksums, appcasts and manifests carry neither and return `null`. */
export function assetPlatform(name: string): SitePlatform | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".sha256") || lower.endsWith(".xml") || lower.endsWith(".json")) return null;
  for (const token of lower.split(/[-_.\s]+/)) {
    const platform = PLATFORM_TOKENS[token];
    if (platform) return platform;
  }
  return EXTENSIONS[lower.slice(lower.lastIndexOf(".") + 1)] ?? null;
}

const TAG_PREFIX = /^(windows|macos|linux|android|ios|harmony)-/;

/** Platforms one release belongs to. A repository that ships a single platform answers for all its releases. */
export function releasePlatforms(release: { tag_name: string; assets: { name: string }[] }, fixed?: SitePlatform): SitePlatform[] {
  if (fixed) return [fixed];
  const found = new Set<SitePlatform>();
  for (const asset of release.assets) {
    const platform = assetPlatform(asset.name);
    if (platform) found.add(platform);
  }
  if (!found.size) {
    const prefix = release.tag_name.match(TAG_PREFIX)?.[1] as SitePlatform | undefined;
    if (prefix) found.add(prefix);
  }
  return [...found];
}

/** `ios-v0.50.0-build.14` → `0.50.0-build.14`; `v0.9.1` → `0.9.1`. */
export const tagVersion = (tag: string) => tag.replace(TAG_PREFIX, "").replace(/^v/i, "");

/** Release notes without HTML comments (the release workflow's machine markers), cut to `RELEASE_BODY_LIMIT` UTF-8 bytes at a line break where one is close. */
export function releaseBody(raw: string | null | undefined): { body: string; truncated: boolean } {
  const text = (raw ?? "").replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= RELEASE_BODY_LIMIT) return { body: text, truncated: false };
  // Decoding a byte prefix can split the last character; the decoder turns the fragment into U+FFFD, which is dropped.
  let cut = new TextDecoder().decode(bytes.slice(0, RELEASE_BODY_LIMIT)).replace(/�+$/, "");
  const newline = cut.lastIndexOf("\n");
  if (newline > cut.length * 0.75) cut = cut.slice(0, newline);
  return { body: cut.trimEnd(), truncated: true };
}

const githubReleaseSchema = z.object({
  id: z.number().int().positive(),
  tag_name: z.string().min(1),
  name: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  html_url: z.string(),
  body: z.string().nullable().optional(),
  assets: z.array(z.object({ name: z.string() })),
});
type GithubRelease = z.infer<typeof githubReleaseSchema>;

/** One GitHub release as zero or more changelog items. Items that fail validation (an off-project URL, a tag that is not a version) are dropped rather than failing the whole list. */
export function normalizeRelease(repo: string, release: GithubRelease, fixed?: SitePlatform): ReleaseItem[] {
  if (release.draft) return [];
  const { body, truncated } = releaseBody(release.body);
  const items: ReleaseItem[] = [];
  for (const platform of releasePlatforms(release, fixed)) {
    const parsed = releaseItemSchema.safeParse({
      id: `${repo}/${release.id}/${platform}`,
      repo,
      platform,
      version: tagVersion(release.tag_name),
      tag: release.tag_name,
      title: (release.name?.trim() || release.tag_name).slice(0, 256),
      prerelease: release.prerelease,
      publishedAt: release.published_at ?? release.created_at,
      // Checked against this repository's releases path, not only the organisation: the link is rendered as-is. GitHub owner and repository names are case-insensitive, so the comparison is too; an empty string fails the schema and drops the item.
      url: release.html_url.toLowerCase().startsWith(`${PROJECT_ORIGIN}${repo}/releases/`.toLowerCase()) ? release.html_url : "",
      body,
      truncated,
    });
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

/** Pages per repository. msime publishes a prerelease on most merges, so one page of 100 covers only a few weeks of it; two keep a useful history without letting the response grow unbounded. */
const MAX_PAGES = 2;

export async function loadReleases(token: string, request: typeof fetch = fetch): Promise<Releases> {
  const signal = AbortSignal.timeout(20_000);
  // Keyed by id: a release published mid-sweep shifts GitHub's pages, so the same release can arrive on both.
  const items = new Map<string, ReleaseItem>();
  // Sequential, like the community sweep: a handful of calls, and no burst against GitHub's secondary rate limit.
  for (const { repo, platform } of RELEASE_SOURCES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await request(`https://api.github.com/repos/metasequoiaime/${repo}/releases?per_page=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "MSIME-Web-releases", "X-GitHub-Api-Version": "2022-11-28" },
        signal,
      });
      if (!response.ok) throw new Error(`GitHub releases unavailable: HTTP ${response.status} (${repo})`);
      for (const release of z.array(githubReleaseSchema).parse(await response.json())) {
        for (const item of normalizeRelease(repo, release, platform)) items.set(item.id, item);
      }
      if (!response.headers.get("link")?.includes('rel="next"')) break;
    }
  }
  const sorted = [...items.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id));
  return { generatedAt: new Date().toISOString(), stale: false, items: sorted };
}
