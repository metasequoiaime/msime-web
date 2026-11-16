import { galleryImageBaseUrl, galleryItems } from "./items";
import { SEASONS, SEASON_NAMES } from "../season";

export const GALLERY_CATEGORIES = ["poses", "expressions", "outfits", "scenes"] as const;
export type GalleryCategory = typeof GALLERY_CATEGORIES[number];
export const CATEGORY_NAMES: Record<GalleryCategory, string> = { poses: "姿势", expressions: "表情", outfits: "服装", scenes: "场景" };
export const GALLERY_SEASONS = SEASONS;
export type GallerySeason = typeof GALLERY_SEASONS[number];
export const GALLERY_SEASON_NAMES = SEASON_NAMES;
export type GalleryItem = typeof galleryItems[number] & { readonly season: GallerySeason };
// Reviewed against the artwork's character palette. The base yellow-green design
// joins spring; these blue-green variants join summer. Props and holidays do not
// change the character's colour family.
const SUMMER_PALETTES = new Set([
  "poses/捧着幼苗",
  "poses/站立挥手",
  "expressions/22-举手",
  "expressions/37-偷看",
  "expressions/55-呆住",
  "expressions/63-下雨了",
]);
const seasonOf = (item: typeof galleryItems[number]): GallerySeason => {
  const prefix = item.name.split("-")[0];
  const season = SEASONS.find(value => SEASON_NAMES[value] === prefix);
  if (season) return season;
  if (item.path === "poses/秋天版") return "autumn";
  if (item.path === "expressions/33-震惊") return "winter";
  return SUMMER_PALETTES.has(item.path) ? "summer" : "spring";
};
export const GALLERY_ITEMS: readonly GalleryItem[] = galleryItems.map(item => ({ ...item, season: seasonOf(item) }));
export const imageUrl = (item: GalleryItem, width: 480 | 1536 = 480) => `${galleryImageBaseUrl}/${item.path}-${width}w.webp`;
export const SEASON_PORTRAITS = [
  { label: "春", caption: "新芽初生", name: "春-站立挥手", color: "#718c49" },
  { label: "夏", caption: "绿意正浓", name: "夏-站立挥手", color: "#397d64" },
  { label: "秋", caption: "杉叶渐红", name: "秋-站立挥手", color: "#b66b39" },
  { label: "冬", caption: "暖意相伴", name: "冬-站立挥手", color: "#58758a" },
].map(season => {
  const item = GALLERY_ITEMS.find(item => item.category === "outfits" && item.name === season.name);
  if (!item) throw new Error(`Missing seasonal portrait: ${season.name}`);
  return { ...season, item };
});
