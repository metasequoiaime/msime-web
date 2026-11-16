/**
 * Data sources behind the site's queries.
 *
 * A resource can be read from more than one place: the live same-origin Pages Function, and the JSON snapshot bundled into `public/` at build time. Each place is a `Source<T>`, and `withFallback` tries them in order so a page component never needs to know which one answered. The browser only ever talks to its own origin (CSP `connect-src 'self'`), so every adapter here refuses absolute or protocol-relative URLs.
 *
 * Nothing in this module touches `window` or other browser globals at import time, so it is safe to import during SSR.
 */

export interface Source<T> {
  /** Stable identifier, e.g. `api:/api/community` or `static:/community.json`; reported as `Loaded.source`. */
  id: string;
  load(signal?: AbortSignal): Promise<T>;
}

/** What `withFallback` resolves to: the data, which source produced it, and whether it should be treated as out of date. */
export type Loaded<T> = { data: T; source: string; stale: boolean };

/** Validates and narrows a parsed JSON body. May be async so schema modules can be loaded lazily and stay out of the entry chunk. */
export type Parse<T> = (value: unknown) => T | Promise<T>;

/** A non-2xx answer from a same-origin endpoint. `status` lets callers tell "unavailable" (503) from "broken" without parsing messages. */
export class SourceError extends Error {
  readonly status: number;
  readonly source: string;
  constructor(source: string, status: number) {
    super(`${source} returned HTTP ${status}`);
    this.name = "SourceError";
    this.status = status;
    this.source = source;
  }
}

const sameOrigin = (url: string) => {
  // A leading single slash is a same-origin path; `//host` is protocol-relative and would leave the origin.
  if (!url.startsWith("/") || url.startsWith("//")) throw new Error(`Data sources must be same-origin paths: ${url}`);
  return url;
};

type FetchOptions = {
  /** Extra fetch options, e.g. `{ cache: "no-store" }`. */
  init?: RequestInit;
  /** Append `t=<now>` to bypass intermediary caches. Evaluated per load, never at import. */
  bustCache?: boolean;
};

async function fetchJson<T>(id: string, url: string, parse: Parse<T>, options: FetchOptions, signal?: AbortSignal): Promise<T> {
  const target = options.bustCache ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url;
  const response = await fetch(target, { ...options.init, signal, headers: { Accept: "application/json", ...options.init?.headers } });
  if (!response.ok) throw new SourceError(id, response.status);
  return parse(await response.json());
}

/** A JSON file shipped in `public/` (for example `/community.json`); refreshed by the daily automation, never live. */
export function staticSnapshot<T>(url: string, parse: Parse<T>, options: FetchOptions = {}): Source<T> {
  const path = sameOrigin(url);
  const id = `static:${path}`;
  return { id, load: signal => fetchJson(id, path, parse, options, signal) };
}

/** A same-origin Pages Function under `/api/`. */
export function siteApi<T>(path: string, parse: Parse<T>, options: FetchOptions = {}): Source<T> {
  if (!sameOrigin(path).startsWith("/api/")) throw new Error(`Site API paths live under /api/: ${path}`);
  const id = `api:${path}`;
  return { id, load: signal => fetchJson(id, path, parse, options, signal) };
}

const reportsStale = (data: unknown) => typeof data === "object" && data !== null && "stale" in data && data.stale === true;

/**
 * Try `primary`, then each fallback in order, and report which one answered.
 *
 * `stale` is true when a fallback answered, or when the answering source itself says so through a `stale: true` field (the Pages Functions set it when they serve a cached copy because GitHub or the backend failed). An aborted load is rethrown immediately instead of falling through, so a cancelled query does not fire the remaining requests. When every source fails, the rejection is an `AggregateError` holding each failure in order.
 */
export function withFallback<T>(primary: Source<T>, ...fallbacks: Source<T>[]): Source<Loaded<T>> {
  const sources = [primary, ...fallbacks];
  return {
    id: sources.map(source => source.id).join(" > "),
    async load(signal) {
      const errors: unknown[] = [];
      for (const [index, source] of sources.entries()) {
        try {
          const data = await source.load(signal);
          return { data, source: source.id, stale: index > 0 || reportsStale(data) };
        } catch (error) {
          if (signal?.aborted) throw error;
          errors.push(error);
        }
      }
      throw new AggregateError(errors, `All sources failed: ${sources.map(source => source.id).join(", ")}`);
    },
  };
}
