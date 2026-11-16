import type { DownloadFile, PlatformsManifest, Release } from "../platforms-data.ts";

// Type-only imports: the home page uses this module and zod stays out of its chunk.

/** The edition id used in every installer name (msime shared/contracts/editions.json). */
export const EDITION_ID = "vietnamese";

export type LinuxFormat = "deb" | "rpm" | "tar.gz";
export type CpuArch = "x86_64" | "aarch64" | "arm64" | "universal" | "x64";

export type EditionFile = DownloadFile & { format: "pkg" | LinuxFormat | "apk" | "exe"; cpu: CpuArch };

export type EditionRelease = { version: string; releaseUrl: string; publishedAt: string; signed: boolean | null; files: EditionFile[] };

/** The release page to send visitors to when the manifest lists no installer of this edition yet. */
export type EditionPlatform = { release: EditionRelease | null; fallbackUrl: string };

export type EditionDownloads = { macos: EditionPlatform; linux: EditionPlatform; android: EditionPlatform; windows: EditionPlatform };

const RELEASES = "https://github.com/metasequoiaime/msime/releases";

/*
 * Installers are recognised by their file name only, never by the Chinese `label` the official site's generator writes: the names are the release pipeline's contract (msime shared/contracts/editions.json), the labels are presentation. Each pattern is anchored at both ends so the full edition (`msime-linux_…`, `msime-android.apk`) and the other single-scheme editions never match.
 */
const VERSION = String.raw`\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?`;
const MACOS_PKG = new RegExp(`^msime-macos-${EDITION_ID}-${VERSION}-universal\\.pkg$`);
const LINUX_DEB = new RegExp(`^msime-linux-${EDITION_ID}_${VERSION}_(amd64|arm64)\\.deb$`);
const LINUX_RPM = new RegExp(`^msime-linux-${EDITION_ID}-${VERSION}-\\d+\\.(x86_64|aarch64)\\.rpm$`);
const LINUX_TGZ = new RegExp(`^msime-linux-${EDITION_ID}-${VERSION}-linux-(x86_64|aarch64)\\.tar\\.gz$`);
const ANDROID_APK = new RegExp(`^msime-android-${EDITION_ID}\\.apk$`);
// Windows names its edition installers MetasequoiaIME-<Edition>_Setup_v<version>.exe (installer_base_name "MetasequoiaIME-Vietnamese_Setup"); the Windows 7 builds carry a _win7_ suffix and are not offered here.
const WINDOWS_EXE = new RegExp(`^MetasequoiaIME-${EDITION_ID}_Setup_v${VERSION}\\.exe$`, "i");

const LINUX_ORDER: LinuxFormat[] = ["deb", "rpm", "tar.gz"];

function linuxFile(file: DownloadFile): EditionFile | null {
  const deb = LINUX_DEB.exec(file.name);
  if (deb) return { ...file, format: "deb", cpu: deb[1] === "amd64" ? "x86_64" : "aarch64" };
  const rpm = LINUX_RPM.exec(file.name);
  if (rpm) return { ...file, format: "rpm", cpu: rpm[1] as CpuArch };
  const tgz = LINUX_TGZ.exec(file.name);
  if (tgz) return { ...file, format: "tar.gz", cpu: tgz[1] as CpuArch };
  return null;
}

function pick(release: Release | null | undefined, select: (file: DownloadFile) => EditionFile | null): EditionRelease | null {
  if (!release) return null;
  const files = release.downloads.map(select).filter((file): file is EditionFile => file !== null);
  if (!files.length) return null;
  return { version: release.version, releaseUrl: release.releaseUrl, publishedAt: release.publishedAt, signed: release.signed, files };
}

/** This edition's installers from the official site's release manifest. Pure, so it runs the same during the static build and in the browser. */
export function editionDownloads(manifest: PlatformsManifest | undefined): EditionDownloads {
  const platforms = manifest?.platforms;
  const linux = pick(platforms?.linux, linuxFile);
  linux?.files.sort((a, b) => LINUX_ORDER.indexOf(a.format as LinuxFormat) - LINUX_ORDER.indexOf(b.format as LinuxFormat) || (a.cpu === b.cpu ? 0 : a.cpu === "x86_64" ? -1 : 1));
  return {
    macos: {
      release: pick(platforms?.macos, (file) => (MACOS_PKG.test(file.name) ? { ...file, format: "pkg", cpu: "universal" } : null)),
      // Until the official manifest lists the single-scheme pkgs, the macOS release itself is the way in: it carries msime-macos-vietnamese-<version>-universal.pkg.
      fallbackUrl: platforms?.macos?.releaseUrl ?? RELEASES,
    },
    linux: { release: linux, fallbackUrl: platforms?.linux?.releaseUrl ?? RELEASES },
    android: {
      release: pick(platforms?.android, (file) => (ANDROID_APK.test(file.name) ? { ...file, format: "apk", cpu: "arm64" } : null)),
      fallbackUrl: platforms?.android?.releaseUrl ?? RELEASES,
    },
    windows: {
      release: pick(platforms?.windows?.experimental, (file) => (WINDOWS_EXE.test(file.name) ? { ...file, format: "exe", cpu: "x64" } : null)),
      fallbackUrl: platforms?.windows?.experimental?.releaseUrl ?? RELEASES,
    },
  };
}

/** Megabytes with one decimal, in the page language's number format (35,1 MB in Vietnamese). */
export const formatSize = (bytes: number, lang: string) => `${new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;

/** A release date in the page language. UTC, so the static HTML and the hydrated page print the same day. */
export const formatDate = (iso: string, lang: string) => new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
