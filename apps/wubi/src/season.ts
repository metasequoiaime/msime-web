/**
 * Seasonal skins (design-home §3.1, §12.2). The inline bootstrap in every entry HTML resolves the stored choice with the same month rule before first paint and writes `html[data-season]`; keep the two in sync.
 */
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_CHOICES = ["auto", ...SEASONS] as const;
export type SeasonChoice = (typeof SEASON_CHOICES)[number];

export const SEASON_STORAGE_KEY = "msime-season";

/** Colour dot of each choice in the appearance menu; the names are in the locale messages (`shell.seasons`). */
export const SEASON_DOTS: Record<SeasonChoice, string> = {
  auto: "conic-gradient(#7FB94A 0 25%, #1E8E4E 0 50%, #C8672C 0 75%, #7F9DB5 0)",
  spring: "#7FB94A",
  summer: "#1E8E4E",
  autumn: "#C8672C",
  winter: "#7F9DB5",
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
