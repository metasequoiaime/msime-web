import type { Download, PlatformsManifest, Release } from "../platforms-data.ts";

/**
 * Picks this edition's installers out of the shared release manifest by file name. The manifest's `label` is Chinese display text written for the official site and is never used here.
 *
 * Names follow the msime release workflows (shared/contracts/editions.json in the msime repository): macOS `msime-macos-japanese-<version>-universal.pkg`, Linux `msime-linux-japanese_<version>_<amd64|arm64>.deb`, `msime-linux-japanese-<version>-1.<x86_64|aarch64>.rpm` and `msime-linux-japanese-<version>-linux-<x86_64|aarch64>.tar.gz`, Android `msime-android-japanese.apk`, Windows `MetasequoiaIME-Japanese_Setup_v<version>.exe`.
 */
export const EDITION_ID = "japanese";

export type Arch = "x86_64" | "aarch64";
export type LinuxFormat = "deb" | "rpm" | "tar";
export type LinuxPackage = { download: Download; format: LinuxFormat; arch: Arch };

const MACOS = /^msime-macos-japanese-[0-9][^/]*\.(?:pkg|dmg)$/;
const LINUX: { format: LinuxFormat; pattern: RegExp }[] = [
  { format: "deb", pattern: /^msime-linux-japanese_[^_/]+_(amd64|arm64)\.deb$/ },
  { format: "rpm", pattern: /^msime-linux-japanese-[0-9][^/]*\.(x86_64|aarch64)\.rpm$/ },
  { format: "tar", pattern: /^msime-linux-japanese-[0-9][^/]*-linux-(x86_64|aarch64)\.tar\.gz$/ },
];
const ANDROID = "msime-android-japanese.apk";
const WINDOWS = /^MetasequoiaIME-Japanese_Setup_v[0-9][^/]*\.exe$/i;

const ARCH: Record<string, Arch> = { amd64: "x86_64", x86_64: "x86_64", arm64: "aarch64", aarch64: "aarch64" };
const FORMAT_ORDER: LinuxFormat[] = ["deb", "rpm", "tar"];
const ARCH_ORDER: Arch[] = ["x86_64", "aarch64"];

export const macosPackages = (release: Release | null | undefined) => release?.downloads.filter((download) => MACOS.test(download.name)) ?? [];

export function linuxPackages(release: Release | null | undefined): LinuxPackage[] {
  const packages: LinuxPackage[] = [];
  for (const download of release?.downloads ?? [])
    for (const { format, pattern } of LINUX) {
      const match = pattern.exec(download.name);
      if (match) packages.push({ download, format, arch: ARCH[match[1]] });
    }
  return packages.sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format) || ARCH_ORDER.indexOf(a.arch) - ARCH_ORDER.indexOf(b.arch));
}

export const androidPackages = (release: Release | null | undefined) => release?.downloads.filter((download) => download.name === ANDROID) ?? [];

export const windowsPackages = (release: Release | null | undefined) => release?.downloads.filter((download) => WINDOWS.test(download.name)) ?? [];

/** This edition's files per platform. Windows only ever comes from the unsigned preview line (`experimental`); the stable Windows app is the full product. */
export function editionDownloads(manifest: PlatformsManifest | undefined) {
  const platforms = manifest?.platforms;
  return {
    macos: { release: platforms?.macos ?? null, files: macosPackages(platforms?.macos) },
    linux: { release: platforms?.linux ?? null, files: linuxPackages(platforms?.linux) },
    android: { release: platforms?.android ?? null, files: androidPackages(platforms?.android) },
    windows: { release: platforms?.windows?.experimental ?? null, files: windowsPackages(platforms?.windows?.experimental) },
  };
}

/** Mebibytes with one decimal, as the official download page shows them. */
export const readableSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
