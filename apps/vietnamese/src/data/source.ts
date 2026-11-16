/**
 * The site has no API of its own: its only data is the release manifest copied into `public/` at build time. The browser only talks to its own origin (CSP `connect-src 'self'`), so the adapter refuses absolute or protocol-relative URLs.
 *
 * Nothing here touches browser globals at import time, so it is safe to import during SSR.
 */

export interface Source<T> {
  /** Stable identifier, e.g. `static:/platforms.json`. */
  id: string;
  load(signal?: AbortSignal): Promise<T>;
}

/** Validates and narrows a parsed JSON body. May be async so the schema module can be loaded lazily and stay out of the entry chunk. */
export type Parse<T> = (value: unknown) => T | Promise<T>;

/** A non-2xx answer from the same origin. */
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

/** A JSON file shipped in `public/`. */
export function staticSnapshot<T>(url: string, parse: Parse<T>): Source<T> {
  // A leading single slash is a same-origin path; `//host` is protocol-relative and would leave the origin.
  if (!url.startsWith("/") || url.startsWith("//")) throw new Error(`Data sources must be same-origin paths: ${url}`);
  const id = `static:${url}`;
  return {
    id,
    async load(signal) {
      const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new SourceError(id, response.status);
      return parse(await response.json());
    },
  };
}
