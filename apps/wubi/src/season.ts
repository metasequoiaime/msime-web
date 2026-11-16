/**
 * Seasonal skins (design-home §3.1, §12.2). The inline bootstrap in every entry HTML resolves the stored choice with the same month rule before first paint and writes `html[data-season]`; keep the two in sync.
 */
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_CHOICES = ["auto", ...SEASONS] as const;
export type SeasonChoice = (typeof SEASON_CHOICES)[number];

export const SEASON_STORAGE_KEY = "msime-season";

/** Single-character label shown in the header button. */
export const SEASON_NAMES: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

/** Menu rows: name, subtitle and the colour dot, as in the design's season dropdown. */
export const SEASON_OPTIONS: Record<SeasonChoice, { name: string; sub: string; dot: string }> = {
  auto: { name: "自动", sub: "按月份切换", dot: "conic-gradient(#7FB94A 0 25%, #1E8E4E 0 50%, #C8672C 0 75%, #7F9DB5 0)" },
  spring: { name: "春", sub: "新芽 · 嫩绿", dot: "#7FB94A" },
  summer: { name: "夏", sub: "盛夏 · 翠绿", dot: "#1E8E4E" },
  autumn: { name: "秋", sub: "霜叶 · 赭红", dot: "#C8672C" },
  winter: { name: "冬", sub: "落叶 · 霜蓝", dot: "#7F9DB5" },
};

export const isSeasonChoice = (value: unknown): value is SeasonChoice =>
  typeof value === "string" && (SEASON_CHOICES as readonly string[]).includes(value);

/** March–May spring, June–August summer, September–November autumn, otherwise winter. */
export const seasonForMonth = (month: number): Season =>
  month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";

export const resolveSeason = (choice: SeasonChoice, now: Date): Season =>
  choice === "auto" ? seasonForMonth(now.getMonth() + 1) : choice;

/** Client only: the stored preference, defaulting to "auto". */
export const readSeasonChoice = (): SeasonChoice => {
  try {
    const stored = localStorage.getItem(SEASON_STORAGE_KEY);
    return isSeasonChoice(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
};
