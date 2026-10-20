import type { PlatformRelease } from "../platforms-data.ts";

type Download = PlatformRelease["downloads"][number];

/** The parts of `navigator` read here. User-Agent Client Hints (`userAgentData`) are not in TypeScript's DOM library, and only Chromium-based browsers provide them. */
export type NavigatorLike = {
  userAgent: string;
  userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }> };
};

/**
 * Whether the visitor's machine is 64-bit Arm, used only to pick which Linux package the main button offers.
 *
 * Chromium reports the real CPU through the `architecture` and `bitness` client hints, while its User-Agent string says `Linux x86_64` on every Linux machine, so when the hints answer they are the only signal used. Firefox has no client hints but puts the real machine in its User-Agent (`X11; Linux aarch64`). Anything else (`armv7l`, `armv8l`, a 32-bit userland, no answer) counts as not arm64: the button then offers the x86_64 package and its label says so, and every other package is one click away.
 *
 * The distribution is not guessed from the User-Agent: browsers rarely name it, and a wrong guess would hand out a package that does not install.
 */
export const detectArm64 = async (nav: NavigatorLike | undefined = typeof navigator === "undefined" ? undefined : navigator): Promise<boolean> => {
  if (!nav) return false;
  // getHighEntropyValues rejects when a permissions policy withholds the hints; that is the browser's answer, not a bug, so it falls back to the User-Agent.
  const hints = await nav.userAgentData?.getHighEntropyValues?.(["architecture", "bitness"]).catch(() => null);
  if (hints?.architecture) return hints.architecture === "arm" && hints.bitness === "64";
  return /\b(?:aarch64|arm64)\b/i.test(nav.userAgent);
};

/**
 * The package behind the main download button and the packages left for the "其他安装包" list.
 *
 * The manifest lists the full edition's x86_64 `.deb` first (scripts/generate-platforms.mjs), and that stays the default. On an arm64 machine Linux offers the package with the same label built for aarch64 instead, when the release has one. Other platforms keep the manifest's first package.
 */
export const pickPrimary = (platform: string, downloads: Download[], arm64: boolean): { primary: Download | undefined; others: Download[] } => {
  const [first] = downloads;
  const primary = platform === "linux" && arm64 && first ? (downloads.find((entry) => entry.label === first.label && entry.arch === "aarch64") ?? first) : first;
  return { primary, others: downloads.filter((entry) => entry !== primary) };
};

/**
 * What a Linux package is, in the words of its manifest label: `Debian 12+ / Ubuntu 22.04+ · deb` on x86_64 reads `deb（Debian 12+ / Ubuntu 22.04+，x86_64）`. The format is the label's last part, as scripts/generate-platforms.mjs writes it.
 */
export const describeLinuxPackage = (entry: Pick<Download, "label" | "arch">) => {
  const parts = entry.label.split(" · ");
  const format = parts.pop();
  return parts.length ? `${format}（${parts.join(" · ")}，${entry.arch}）` : `${format}（${entry.arch}）`;
};

