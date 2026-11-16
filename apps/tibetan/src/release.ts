import { z } from "zod";

/**
 * The slice of the official release manifest (apps/web/public/platforms.json, copied by scripts/sync-release-data.mjs) that this site needs, and the rules that pick the Tibetan edition's installers out of it.
 *
 * This module runs at build time only (vite.config.ts and the tests); the pages receive the selected result through the `virtual:edition-releases` module, so neither the manifest nor zod reaches the browser.
 *
 * Installers are recognised by file name only. The manifest's `label` is Chinese display text written for msime.app and may change wording at any time; the file names are fixed by the edition table in the msime repository (shared/contracts/editions.json).
 */

const PROJECT_RELEASES = "https://github.com/metasequoiaime/";

/** Every link must stay inside the project's GitHub organisation; a manifest with a foreign address is rejected as a whole, as on the official site. */
const projectUrl = z
  .string()
  .url()
  .refine(value => value.startsWith(PROJECT_RELEASES), { message: "URL must point at the project's GitHub organisation" });

const downloadSchema = z.object({
  name: z.string(),
  url: projectUrl,
  // The mirror copy on dl.msime.app is optional and dropped on its own when malformed.
  mirrorUrl: z.url({ protocol: /^https$/, hostname: z.regexes.domain }).optional().catch(undefined),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().catch(null),
});

const releaseSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?$/),
  releaseUrl: projectUrl,
  publishedAt: z.string(),
  signed: z.boolean().nullable().catch(null),
  downloads: z.array(downloadSchema).min(1),
});

const platformSchema = releaseSchema.extend({
  // A broken preview line only hides the preview card.
  experimental: releaseSchema.nullable().optional().catch(null),
});

export const manifestSchema = z.object({
  generatedAt: z.string(),
  platforms: z.object({
    windows: platformSchema,
    macos: platformSchema,
    linux: platformSchema,
    android: platformSchema,
  }),
});

export type Manifest = z.infer<typeof manifestSchema>;
type Release = z.infer<typeof releaseSchema>;
type Download = z.infer<typeof downloadSchema>;

export type Arch = "x86_64" | "aarch64" | "universal" | "arm64" | "x64";
export type PackageFormat = "pkg" | "deb" | "rpm" | "tar.gz" | "apk" | "exe";

export type EditionDownload = Download & { format: PackageFormat; arch: Arch };

export type EditionPlatform = {
  version: string;
  releaseUrl: string;
  publishedAt: string;
  /** null when the release does not say. */
  signed: boolean | null;
  /** This edition's installers in the release; empty when the release has none for it. */
  downloads: EditionDownload[];
};

export type EditionReleases = {
  generatedAt: string;
  macos: EditionPlatform;
  linux: EditionPlatform;
  android: EditionPlatform;
  /** The unsigned preview line from the msime repository. null when the manifest has no preview line at all. */
  windowsPreview: EditionPlatform | null;
};

export const EDITION = "tibetan";

type Matcher = (name: string) => { format: PackageFormat; arch: Arch } | null;

const LINUX_ARCH: Record<string, Arch> = { amd64: "x86_64", x86_64: "x86_64", arm64: "aarch64", aarch64: "aarch64" };

const MATCHERS: Record<"macos" | "linux" | "android" | "windows", Matcher[]> = {
  macos: [name => (/^msime-macos-tibetan-\d[0-9A-Za-z.-]*-universal\.pkg$/.test(name) ? { format: "pkg", arch: "universal" } : null)],
  linux: [
    name => {
      const match = /^msime-linux-tibetan_\d[^_]*_(amd64|arm64)\.deb$/.exec(name);
      return match ? { format: "deb", arch: LINUX_ARCH[match[1]] } : null;
    },
    name => {
      const match = /^msime-linux-tibetan-\d[^/]*\.(x86_64|aarch64)\.rpm$/.exec(name);
      return match ? { format: "rpm", arch: LINUX_ARCH[match[1]] } : null;
    },
    name => {
      const match = /^msime-linux-tibetan-\d[^/]*-linux-(x86_64|aarch64)\.tar\.gz$/.exec(name);
      return match ? { format: "tar.gz", arch: LINUX_ARCH[match[1]] } : null;
    },
  ],
  android: [name => (name === "msime-android-tibetan.apk" ? { format: "apk", arch: "arm64" } : null)],
  // The edition table names the installer `MetasequoiaIME-Tibetan_Setup`; Windows 7 builds carry a `_win7_` suffix and are a different line.
  windows: [name => (/^MetasequoiaIME-tibetan_Setup_v\d[0-9A-Za-z.-]*\.exe$/i.test(name) ? { format: "exe", arch: "x64" } : null)],
};

const FORMAT_ORDER: PackageFormat[] = ["pkg", "deb", "rpm", "tar.gz", "apk", "exe"];

function pick(release: Release, platform: keyof typeof MATCHERS): EditionPlatform {
  const downloads: EditionDownload[] = [];
  for (const download of release.downloads) {
    for (const matcher of MATCHERS[platform]) {
      const matched = matcher(download.name);
      if (matched) {
        downloads.push({ ...download, ...matched });
        break;
      }
    }
  }
  downloads.sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format) || a.arch.localeCompare(b.arch));
  return { version: release.version, releaseUrl: release.releaseUrl, publishedAt: release.publishedAt, signed: release.signed, downloads };
}

export function selectEdition(value: unknown): EditionReleases {
  const manifest = manifestSchema.parse(value);
  const { platforms } = manifest;
  return {
    generatedAt: manifest.generatedAt,
    macos: pick(platforms.macos, "macos"),
    linux: pick(platforms.linux, "linux"),
    android: pick(platforms.android, "android"),
    windowsPreview: platforms.windows.experimental ? pick(platforms.windows.experimental, "windows") : null,
  };
}
