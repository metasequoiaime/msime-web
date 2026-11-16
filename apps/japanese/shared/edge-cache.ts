/**
 * Edge caching for read-only Pages Functions that proxy an upstream (GitHub, msime-backend).
 *
 * The same shape as `cachedCommunity` in live-community.ts, without its community-specific parts (the bundled snapshot fallback and the hold-back of decreasing numbers): one upstream call per `freshFor` window per edge location, concurrent requests collapse onto one refresh, an expired entry answers immediately while the refresh runs behind the response, and a failed refresh keeps serving the last good copy marked `stale`. With no good copy at all the failure is remembered for `retryAfter`, so an upstream outage costs one call per minute rather than one per visitor.
 */

type Entry<T> = { checkedAt: number; data?: T; stale?: boolean };

export type Cached<T> = { data: T; stale: boolean };

export type CacheOptions = {
  /** How long a good copy is served without asking upstream again. */
  freshFor: number;
  /** How long a failure (stale copy or nothing) is served before upstream is tried again. Defaults to one minute. */
  retryAfter?: number;
  /** How long the edge keeps the entry at all; the stale copy outlives `freshFor` by this much. Defaults to one day. */
  keepFor?: number;
  /** `waitUntil` from the Pages context. Without it every refresh is awaited in the request. */
  background?: (task: Promise<unknown>) => void;
};

/** Upstream failed and there is no earlier copy to fall back to. Functions answer 503. */
export class UpstreamUnavailable extends Error {
  constructor(message = "Upstream unavailable") {
    super(message);
    this.name = "UpstreamUnavailable";
  }
}

const pending = new Map<string, Promise<Cached<unknown>>>();

function refresh<T>(key: Request, cache: Cache, load: () => Promise<T>, entry: Entry<T> | undefined, keepFor: number): Promise<Cached<T>> {
  const existing = pending.get(key.url) as Promise<Cached<T>> | undefined;
  if (existing) return existing;
  const task = (async (): Promise<Cached<T>> => {
    let next: Entry<T>;
    try { next = { checkedAt: Date.now(), data: await load(), stale: false }; }
    catch (error) {
      console.warn("Upstream refresh failed", key.url, error instanceof Error && error.name !== "ZodError" ? error.message : "Invalid upstream response");
      next = entry?.data === undefined ? { checkedAt: Date.now() } : { checkedAt: Date.now(), data: entry.data, stale: true };
    }
    await cache.put(key, Response.json(next, { headers: { "Cache-Control": `max-age=${Math.round(keepFor / 1000)}` } }));
    if (next.data === undefined) throw new UpstreamUnavailable();
    return { data: next.data, stale: next.stale === true };
  })();
  pending.set(key.url, task);
  // Cleared in `finally` so concurrent requests keep collapsing onto a refresh that runs in the background. The derived promise has its own catch because the caller observes the rejection through `task` itself.
  task.finally(() => { if (pending.get(key.url) === task) pending.delete(key.url); }).catch(() => {});
  return task;
}

export async function cachedJson<T>(key: Request, cache: Cache, load: () => Promise<T>, options: CacheOptions): Promise<Cached<T>> {
  const { freshFor, retryAfter = 60_000, keepFor = 86_400_000, background } = options;
  const hit = await cache.match(key);
  const entry = hit ? await hit.json() as Entry<T> : undefined;
  const failed = entry !== undefined && (entry.data === undefined || entry.stale === true);
  if (entry && Date.now() - entry.checkedAt < (failed ? retryAfter : freshFor)) {
    if (entry.data === undefined) throw new UpstreamUnavailable();
    return { data: entry.data, stale: entry.stale === true };
  }
  const task = refresh(key, cache, load, entry, keepFor);
  // An expired copy answers now and the refresh runs behind the response. A cold cache has nothing to answer with, so that request waits.
  if (background && entry?.data !== undefined) {
    background(task.catch(() => {}));
    return { data: entry.data, stale: entry.stale === true };
  }
  return task;
}
