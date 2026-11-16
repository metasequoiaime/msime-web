import { CANDIDATE_SKIN_CATEGORY_LABELS, type CandidateSkinCategory } from "../data/skin-categories.ts";

/*
 * What a candidate skin card says about a skin, from the list row alone: the list carries no manifest, so every trait here is one the row proves.
 */

type TraitSource = { category?: CandidateSkinCategory; fileCount?: number; size: number };

/** A package size the way the download button's users think of it. */
export const packageSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * The two or three short traits under the name in the card's hero. A package holds `skin.toml` plus at most three images, and every image must be the preview, the decoration or the background (msime-backend `validCandidatePackage`), so three images mean the skin has both a decoration and a background image, and two mean it has one of them. One image is the preview alone unless the author reused it as the decoration, so it says nothing either way.
 */
export function candidateTraits({ category, fileCount, size }: TraitSource): string[] {
  const traits: string[] = [];
  if (category && category !== "other") traits.push(CANDIDATE_SKIN_CATEGORY_LABELS[category]);
  if (fileCount !== undefined && fileCount >= 3) traits.push("装饰图与背景图");
  else if (fileCount === 2) traits.push("图片装饰");
  traits.push(`皮肤包 ${packageSize(size)}`);
  return traits;
}

/**
 * The `?v=` of a public preview, and the key of a private one. The version alone went stale when an author replaced a package without bumping it, since the edge keeps a preview for a day; the package size changes with any replaced image, so the pair names one upload. The list row has no update time or content hash to use instead.
 */
export const candidatePreviewKey = ({ version, size }: { version: string; size: number }) => (version ? `${version}-${size}` : String(size));
