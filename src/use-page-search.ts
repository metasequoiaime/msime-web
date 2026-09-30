import { useSyncExternalStore } from "react";
import { useLocation, useMatch, useNavigate } from "@tanstack/react-router";

const subscribe = () => () => {};
// Static HTML represents default choices. Apply URL choices after that HTML hydrates.
export const useSearchReady = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Shareable UI choices live in router history; drafts and personal data stay local.
 *
 * The search comes from the page's own route match, not from the router location: the location switches to the next URL as soon as a navigation starts, while the page is still mounted until the next one commits. Reading the location let a page see its params vanish mid-navigation and "restore" them onto the next page (leaving /download/?platform=linux for /faq/ landed on /faq/?platform=macos). Without a match (the page is being torn down) there is nothing to read or update.
 */
export function usePageSearch() {
  const ready = useSearchReady();
  const matchSearch = useMatch({ strict: false, shouldThrow: false, select: match => match.search }) as Record<string, unknown> | undefined;
  const locationHash = useLocation({ select: location => location.hash });
  const search = ready && matchSearch ? matchSearch : {};
  const navigate = useNavigate();
  const get = (key: string, fallback = "") => typeof search[key] === "string" ? search[key] as string : fallback;
  const choice = <T extends string>(key: string, values: readonly T[], fallback: T): T => {
    const value = get(key);
    return values.includes(value as T) ? value as T : fallback;
  };
  // Changing an option is not a request to revisit the URL's existing section anchor. A replace that keeps the hash is a normalization of the URL the visitor just asked for (the download page restoring `?platform=` after a link to /download/#releases), so it scrolls to that anchor again; otherwise the first scroll lands before the normalized layout and misses it.
  const update = (patch: Record<string, string | undefined>, replace = false, preserveHash = true) => {
    if (!matchSearch) return;
    if (Object.entries(patch).every(([key, value]) => matchSearch[key] === value) && (preserveHash || !locationHash)) return;
    void navigate({ to: "./", search: previous => ({ ...previous, ...patch }), replace, resetScroll: false, hashScrollIntoView: replace && preserveHash && !!locationHash, hash: preserveHash ? true : "" });
  };
  return { get, choice, update, ready };
}
