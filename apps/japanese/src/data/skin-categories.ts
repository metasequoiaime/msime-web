/*
 * The gallery categories of community candidate-window skins, plain data so the page reads them without pulling zod into its chunk while schemas.ts and the Function validate against the same list. Ids and order are `candidateSkinCategories` in msime-backend (internal/account/community_candidate.go), labels and order are the App's filter row (packages/ui/src/community/community-candidate-skins.tsx). Keyboard skins have no categories.
 */

export const CANDIDATE_SKIN_CATEGORIES = ["nature", "guofeng", "acg", "cute", "food", "tech", "minimal", "other"] as const;
export type CandidateSkinCategory = (typeof CANDIDATE_SKIN_CATEGORIES)[number];

export const CANDIDATE_SKIN_CATEGORY_LABELS: Record<CandidateSkinCategory, string> = {
  nature: "自然",
  guofeng: "国风",
  acg: "二次元",
  cute: "可爱",
  food: "美食",
  tech: "科技夜色",
  minimal: "简约",
  other: "其他",
};

export const isCandidateSkinCategory = (value: string): value is CandidateSkinCategory => (CANDIDATE_SKIN_CATEGORIES as readonly string[]).includes(value);
