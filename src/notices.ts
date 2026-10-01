import type { Notice } from "./data/schemas.ts";
import type { Platform } from "./platform.ts";

/*
 * Which website notices to show. Dismissal is remembered per notice id in localStorage, so a dismissed notice stays hidden on this browser and a newly published one still appears.
 */

export const DISMISSED_NOTICES_KEY = "msime-dismissed-notices";

/** At most this many notices are stacked above the page; the feed is newest first, so older ones wait until these are dismissed. */
export const MAX_VISIBLE_NOTICES = 3;

/** Notices for everyone, plus those targeting the visitor's platform when the user agent names one. */
export const visibleNotices = (items: readonly Notice[], platform: Platform | null, dismissed: ReadonlySet<string>) =>
  items
    .filter(item => !dismissed.has(item.id))
    .filter(item => item.targets.includes("all") || (platform !== null && item.targets.includes(platform)))
    .slice(0, MAX_VISIBLE_NOTICES);

const parseIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const readDismissed = (storage: Pick<Storage, "getItem">): Set<string> => {
  try {
    return new Set(parseIds(storage.getItem(DISMISSED_NOTICES_KEY)));
  } catch {
    // Storage can be unavailable (privacy modes); every notice is then shown until dismissed in this session.
    return new Set();
  }
};

/** Adds `id` to the stored set. Ids no longer in the live feed are dropped so the entry does not grow forever; `liveIds` is the feed the page currently shows. */
export const rememberDismissed = (storage: Pick<Storage, "getItem" | "setItem">, id: string, liveIds: readonly string[]) => {
  const live = new Set(liveIds);
  const kept = [...readDismissed(storage)].filter(stored => live.has(stored));
  const next = new Set([...kept, id]);
  try {
    storage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify([...next]));
  } catch {
    // The dismissal still applies for this session when storage is unavailable.
  }
  return next;
};
