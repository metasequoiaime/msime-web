import { z } from "zod";

/**
 * The release manifest and the selection of this edition's installers from it.
 *
 * `public/platforms.json` is copied from the official site (apps/web) by scripts/sync-release-data.mjs before every dev and build run; the official site's automation refreshes that file and this site's Pages project rebuilds when it changes. Only the parts this site reads are parsed here; everything else in the manifest is ignored.
 *
 * Installers are picked by file name, never by the manifest's `label`: the labels are display text written for msime.app and may be reworded at any time, while the file names are fixed by the release workflows in the msime repository.
 */

/** The edition id used in installer file names. */
export const EDITION = "wubi";

const ORG = "https://github.com/metasequoiaime/";

/** Every link must point into the project's GitHub organization: a manifest with any other address is rejected as a whole, as on msime.app. */
const projectUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith(ORG), { message: "URL outside the project's GitHub organization" });

const downloadSchema = z.object({
  name: z.string(),
  url: projectUrl,
  // The mirror is optional; a malformed mirror drops only that link.
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

export const manifestSchema = z.object({
  generatedAt: z.string(),
  platforms: z.object({
    windows: releaseSchema.extend({ experimental: releaseSchema.nullable().catch(null) }),
    macos: releaseSchema,
    linux: releaseSchema,
    android: releaseSchema,
  }),
});

export type Manifest = z.infer<typeof manifestSchema>;
type Download = z.infer<typeof downloadSchema>;
type Release = z.infer<typeof releaseSchema>;

export type Arch = "universal" | "x86_64" | "aarch64" | "arm64";
export type Format = "pkg" | "deb" | "rpm" | "tar.gz" | "apk" | "exe";

export type EditionFile = {
  name: string;
  url: string;
  mirrorUrl: string | null;
  size: number;
  sha256: string | null;
  arch: Arch;
  format: Format;
};

export type EditionRelease = {
  version: string;
  releaseUrl: string;
  publishedAt: string;
  /** This edition's installers in that release; empty when the release has none. */
  files: EditionFile[];
};

/** What the download page shows: per platform, the release and this edition's files in it. */
export type EditionReleases = {
  generatedAt: string;
  macos: EditionRelease;
  linux: EditionRelease;
  android: EditionRelease;
  /** The unsigned preview from the msime repository (`windows-v…`), the only Windows line with per-edition installers; null when the manifest has no preview. */
  windowsPreview: EditionRelease | null;
  /** The signed stable Windows app from msime-windows; it is the full app and includes Wubi 86. */
  windowsStable: { version: string; releaseUrl: string };
};

const FORMAT_ORDER: Record<Format, number> = { pkg: 0, exe: 0, apk: 0, deb: 0, rpm: 1, "tar.gz": 2 };
const ARCH_ORDER: Record<Arch, number> = { universal: 0, x86_64: 0, arm64: 0, aarch64: 1 };

/** Format and architecture of one of this edition's installers, or null when the file belongs to another edition or is not an installer. */
export function classify(platform: "macos" | "linux" | "android" | "windows", name: string, version: string): Pick<EditionFile, "arch" | "format"> | null {
  if (platform === "macos") return name === `msime-macos-${EDITION}-${version}-universal.pkg` ? { arch: "universal", format: "pkg" } : null;
  if (platform === "android") return name === `msime-android-${EDITION}.apk` ? { arch: "arm64", format: "apk" } : null;
  if (platform === "windows") return name === `MetasequoiaIME-Wubi_Setup_v${version}.exe` ? { arch: "x86_64", format: "exe" } : null;
  if (name === `msime-linux-${EDITION}_${version}_amd64.deb`) return { arch: "x86_64", format: "deb" };
  if (name === `msime-linux-${EDITION}_${version}_arm64.deb`) return { arch: "aarch64", format: "deb" };
  if (name.startsWith(`msime-linux-${EDITION}-${version}-`) && name.endsWith(".x86_64.rpm")) return { arch: "x86_64", format: "rpm" };
  if (name.startsWith(`msime-linux-${EDITION}-${version}-`) && name.endsWith(".aarch64.rpm")) return { arch: "aarch64", format: "rpm" };
  if (name === `msime-linux-${EDITION}-${version}-linux-x86_64.tar.gz`) return { arch: "x86_64", format: "tar.gz" };
  if (name === `msime-linux-${EDITION}-${version}-linux-aarch64.tar.gz`) return { arch: "aarch64", format: "tar.gz" };
  return null;
}

function editionRelease(platform: "macos" | "linux" | "android" | "windows", release: Release): EditionRelease {
  const files = release.downloads
    .flatMap((download: Download) => {
      const kind = classify(platform, download.name, release.version);
      return kind ? [{ name: download.name, url: download.url, mirrorUrl: download.mirrorUrl ?? null, size: download.size, sha256: download.sha256, ...kind }] : [];
    })
    .sort((a, b) => FORMAT_ORDER[a.format] - FORMAT_ORDER[b.format] || ARCH_ORDER[a.arch] - ARCH_ORDER[b.arch]);
  return { version: release.version, releaseUrl: release.releaseUrl, publishedAt: release.publishedAt, files };
}

export function editionReleases(manifest: Manifest): EditionReleases {
  const { windows, macos, linux, android } = manifest.platforms;
  return {
    generatedAt: manifest.generatedAt,
    macos: editionRelease("macos", macos),
    linux: editionRelease("linux", linux),
    android: editionRelease("android", android),
    windowsPreview: windows.experimental ? editionRelease("windows", windows.experimental) : null,
    windowsStable: { version: windows.version, releaseUrl: windows.releaseUrl },
  };
}

export async function fetchEditionReleases(): Promise<EditionReleases> {
  const response = await fetch("/platforms.json", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`/platforms.json returned HTTP ${response.status}`);
  return editionReleases(manifestSchema.parse(await response.json()));
}

export const EDITION_RELEASES_KEY = "edition-releases";

export const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
