export interface Contributor {
  login: string;
  type?: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}
export function aggregateContributors(repositories: { repo: string; contributors: Contributor[] }[], limit?: number): {
  login: string; avatarUrl: string; url: string; contributions: number; repos: number;
}[];
export interface StarWeek {
  /** Unix seconds for the Sunday the week starts on, as `/stargazers/history` reports it. */
  week: number;
  /** Seven daily counts, Sunday first. */
  days: number[];
}
export function monthlyStarHistory(weeks: StarWeek[]): { month: string; stars: number }[];
export function repositoryStarSeries(weeks: StarWeek[], now?: Date): { date: string; stars: number }[];
export function recentStars(weeks: StarWeek[], days?: number, now?: Date): number;
