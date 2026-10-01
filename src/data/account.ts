import { infiniteQueryOptions, queryOptions, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import type { CandidateSkinCategory } from "./skin-categories.ts";
import { DECLARED_PLUGIN_KINDS } from "./plugin-kinds.ts";
import type { DictionaryKind, Plugin, PluginKind, Resource, ResourceKind } from "./schemas.ts";
import { siteApi } from "./source.ts";

/*
 * The signed-in half of the data layer. The browser still talks only to its own origin: `/api/me`, `/api/auth/*` and the `/api/v1/*` proxy, which turns the HttpOnly session cookies into a bearer token for msime-backend (shared/site-session.ts). Nothing here ever sees a token. Anonymous visitors read the plugin and resource galleries from the edge-cached `/api/plugins` and `/api/resources` instead (shared/community-catalog.ts), as they read the skin galleries from `/api/skins/*`.
 *
 * Every query key starts with `account`, so signing in or out invalidates exactly the data that depends on who is looking.
 */

const schemas = () => import("./schemas.ts");

/** A non-2xx answer. `code` is the error code from either the Functions' `{ error: "code" }` or the backend's `{ error: { code } }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(`HTTP ${status} ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Fired on `window` when a call learns the session is gone, so the header and every account view switch to signed out together. */
export const SIGNED_OUT_EVENT = "msime:signed-out";

/** The waits before each repeat of a request that lost a refresh race (401 `session_retry`), growing in case the winning response is slow to set the new cookies. 7.5 s in all, well inside the 30 seconds the backend keeps answering the old refresh token with `refresh_superseded` before it treats a replay as theft. */
export const SESSION_RETRY_DELAYS_MS = [500, 1000, 2000, 4000] as const;

/** Whether an answer means the session is gone. A 401 `session_retry` never does: the session is intact and only this request lost a race, so it must not sign the page out or clear the hint. */
export const isSignedOut = (status: number, code: string) => status === 401 && code !== "session_retry";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });

const codeOf = (body: unknown) => {
  if (typeof body !== "object" || body === null || !("error" in body)) return "unknown";
  const error = (body as { error: unknown }).error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return error.code;
  return "unknown";
};

type CallOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal };

/**
 * One same-origin JSON call. A 401 `session_retry` (two requests refreshed the session at once and this one lost) is repeated after each of `SESSION_RETRY_DELAYS_MS`; if it still answers that, the call rejects with code `session_retry` and the page stays signed in. Any other 401 means signed out: `SIGNED_OUT_EVENT` fires and the call rejects. A 204 resolves to `undefined`.
 */
export async function accountCall<T = unknown>(path: string, parse: (value: unknown) => T | Promise<T>, { method = "GET", body, signal }: CallOptions = {}): Promise<T> {
  if (!path.startsWith("/api/") || path.startsWith("//")) throw new Error(`Account calls stay on the site's own /api/: ${path}`);
  const init: RequestInit = { method, signal, credentials: "same-origin", headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) };
  let response = await fetch(path, init);
  for (const delay of SESSION_RETRY_DELAYS_MS) {
    if (response.status !== 401 || codeOf(await response.clone().json().catch(() => undefined)) !== "session_retry") break;
    await sleep(delay, signal);
    response = await fetch(path, init);
  }
  if (!response.ok) {
    const code = codeOf(await response.json().catch(() => undefined));
    if (isSignedOut(response.status, code) && typeof window !== "undefined") window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    throw new ApiError(response.status, code);
  }
  if (response.status === 204) return parse(undefined);
  return parse(await response.json());
}

export const ignoreBody = () => undefined;

// ---- session ----

/** Set when this browser signs in and cleared when it signs out, so visitors who never signed in do not cost a Function call on every page. It is a hint only: the cookies are the session. */
export const SESSION_HINT_KEY = "msime-account";

export const hasSessionHint = () => {
  try { return localStorage.getItem(SESSION_HINT_KEY) === "1"; } catch { return false; }
};
export const setSessionHint = (signedIn: boolean) => {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch { /* Storage can be off; the session then lasts for this page only. */ }
};

/** The signed-in user, or `null` when signed out. A `session_retry` that outlasted every repeat is an error, not `null`: the session is still there, so the page must not forget it. */
export const meQuery = () =>
  queryOptions({
    queryKey: ["account", "me"] as const,
    queryFn: async ({ signal }) => {
      try {
        return await accountCall("/api/me", async value => (await schemas()).meSchema.parse(value), { signal });
      } catch (error) {
        if (error instanceof ApiError && isSignedOut(error.status, error.code)) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

export const authConfigQuery = () =>
  queryOptions({
    queryKey: ["auth-config"] as const,
    queryFn: async ({ signal }) => accountCall("/api/auth/config", async value => {
      const { z } = await import("zod");
      return z.object({ google_client_id: z.string().nullable() }).parse(value);
    }, { signal }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

// ---- community lists ----

/** One page of a community list as the pages read it: the rows that parsed and where the next page starts. */
export type Page<T> = { items: T[]; nextOffset: number | null };

const page = <T>(offset: number, rows: { rows: number; items: T[] }, hasMore: boolean): Page<T> => ({ items: rows.items, nextOffset: hasMore ? offset + rows.rows : null });

const withSearch = (path: string, params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && value !== 0) search.set(key, String(value));
  const text = search.toString();
  return text ? `${path}?${text}` : path;
};

const PAGE_STALE_MS = 30_000;

export type CommunityScope = "" | "saved" | "mine";

/** Keyboard skins through the proxy, for a signed-in viewer: the public catalog with their own rating and favourites, or `scope=saved` / `scope=mine`. */
export const v1KeyboardSkinsQuery = (q: string, scope: CommunityScope = "") =>
  infiniteQueryOptions({
    queryKey: ["account", "skins", "keyboard", scope, q.trim(), ""] as const,
    queryFn: async ({ signal, pageParam }) => {
      const path = withSearch("/api/v1/community/skins", { offset: pageParam, q: q.trim(), scope, fields: scope === "mine" ? "moderation" : "saved" });
      const data = await accountCall(path, async value => (await schemas()).v1KeyboardSkinsSchema.parse(value), { signal });
      return page(pageParam, data.skins, data.has_more);
    },
    initialPageParam: 0,
    getNextPageParam: (last: Page<unknown>) => last.nextOffset ?? undefined,
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

/** Candidate-window skins through the proxy. `scope=mine` asks for `fields=sync`, which is what brings the author's private skins into the list. */
export const v1CandidateSkinsQuery = (q: string, category?: CandidateSkinCategory, scope: CommunityScope = "") =>
  infiniteQueryOptions({
    queryKey: ["account", "skins", "candidate", scope, q.trim(), category ?? ""] as const,
    queryFn: async ({ signal, pageParam }) => {
      const path = withSearch("/api/v1/community/candidate-skins", { offset: pageParam, q: q.trim(), category, scope, include: "category", fields: scope === "mine" ? "sync,moderation" : "saved" });
      const data = await accountCall(path, async value => (await schemas()).v1CandidateSkinsSchema.parse(value), { signal });
      return page(pageParam, data.skins, data.has_more);
    },
    initialPageParam: 0,
    getNextPageParam: (last: Page<unknown>) => last.nextOffset ?? undefined,
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

/** The same-origin path of one page of an anonymous plugin or resource list. `q` is trimmed and the parameters are written in the order the Function caches under (`catalogListQuery` in shared/community-catalog.ts). */
export const publicCatalogPath = (collection: "plugins" | "resources", offset: number, q: string, kind?: PluginKind | ResourceKind) =>
  withSearch(`/api/${collection}`, collection === "resources" ? { kind, offset, q: q.trim() } : { offset, q: q.trim(), kind });

/** Community plugins. Anonymous visitors read the edge-cached public catalog; a signed-in viewer reads it through the proxy with `fields=saved`, so their own rating and favourites show. */
export const pluginsQuery = (q: string, kind: PluginKind | undefined, scope: CommunityScope, signedIn: boolean) =>
  infiniteQueryOptions({
    queryKey: ["account", "plugins", scope, q.trim(), kind ?? "", signedIn] as const,
    queryFn: async ({ signal, pageParam }): Promise<Page<Plugin>> => {
      if (!signedIn && scope === "") return siteApi(publicCatalogPath("plugins", pageParam, q, kind), async value => (await schemas()).publicPluginsSchema.parse(value)).load(signal);
      const path = withSearch("/api/v1/community/plugins", { offset: pageParam, q: q.trim(), kind, scope, fields: signedIn ? "saved" : undefined, kinds: DECLARED_PLUGIN_KINDS });
      const data = await accountCall(path, async value => (await schemas()).pluginsSchema.parse(value), { signal });
      return page(pageParam, data.plugins, data.has_more);
    },
    initialPageParam: 0,
    getNextPageParam: (last: Page<unknown>) => last.nextOffset ?? undefined,
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

/** Community word packs and reply templates, anonymously from the edge-cached public catalog and otherwise through the proxy. The resource catalog always reports `saved` and `saves`. */
export const resourcesQuery = (kind: ResourceKind, q: string, scope: CommunityScope, signedIn: boolean) =>
  infiniteQueryOptions({
    queryKey: ["account", "resources", kind, scope, q.trim(), signedIn] as const,
    queryFn: async ({ signal, pageParam }): Promise<Page<Resource>> => {
      if (!signedIn && scope === "") return siteApi(publicCatalogPath("resources", pageParam, q, kind), async value => (await schemas()).publicResourcesSchema.parse(value)).load(signal);
      const path = withSearch("/api/v1/community/resources", { kind, offset: pageParam, q: q.trim(), scope });
      const data = await accountCall(path, async value => (await schemas()).resourcesSchema.parse(value), { signal });
      return page(pageParam, data.items, data.has_more);
    },
    initialPageParam: 0,
    getNextPageParam: (last: Page<unknown>) => last.nextOffset ?? undefined,
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

/** A private candidate skin's preview can only be read with the author's session, so `/me/` loads it as data through the proxy and shows it as a `data:` image. */
export const candidatePreviewQuery = (id: string, version: string) =>
  queryOptions({
    queryKey: ["account", "candidate-preview", id, version] as const,
    queryFn: async ({ signal }) => {
      const preview = await accountCall(`/api/v1/community/candidate-skins/${id}/preview`, async value => (await schemas()).candidatePreviewSchema.parse(value), { signal });
      return `data:${preview.content_type};base64,${preview.data}`;
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

// ---- the user's own data ----

/** The longest search the backend's dictionary and clipboard lists accept, in UTF-8 bytes. */
export const MAX_DATA_QUERY_BYTES = 1024;

const DICTIONARY_PAGE = 50;

export const dictionaryQuery = (kind: DictionaryKind, q: string) =>
  infiniteQueryOptions({
    queryKey: ["account", "dictionary", kind, q] as const,
    queryFn: async ({ signal, pageParam }) => {
      const path = withSearch(`/api/v1/users/me/dictionaries/${kind}`, { offset: pageParam, limit: DICTIONARY_PAGE, q });
      const data = await accountCall(path, async value => (await schemas()).dictionaryPageSchema.parse(value), { signal });
      return page(pageParam, data.entries, data.has_more);
    },
    initialPageParam: 0,
    getNextPageParam: (last: Page<unknown>) => last.nextOffset ?? undefined,
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

export const clipboardQuery = (q: string) =>
  queryOptions({
    queryKey: ["account", "clipboard", q] as const,
    queryFn: async ({ signal }) => accountCall(withSearch("/api/v1/users/me/clipboard", { q }), async value => (await schemas()).clipboardSchema.parse(value), { signal }),
    staleTime: PAGE_STALE_MS,
    retry: 1,
  });

// ---- reactions ----

/** The backend collection each kind of community item lives in. */
export const COMMUNITY_COLLECTIONS = { keyboard: "skins", candidate: "candidate-skins", plugin: "plugins", resource: "resources" } as const;
export type CommunityItemKind = keyof typeof COMMUNITY_COLLECTIONS;

export const saveItem = async (kind: CommunityItemKind, id: string, saved: boolean) =>
  accountCall(`/api/v1/community/${COMMUNITY_COLLECTIONS[kind]}/${id}/save`, async value => (await schemas()).saveResultSchema.parse(value), { method: "PUT", body: { saved } });

/** What a reaction changes on a community row, in the backend's field names that every account list keeps. */
export type ItemPatch = { saved?: boolean; saves?: number; my_rating?: number; rating_count?: number; rating_average?: number };

/** The query keys of every cached list a kind of item can appear in: the galleries, `scope=saved` (the /me/ favourites) and `scope=mine`. */
const LIST_KEYS: Record<CommunityItemKind, readonly string[]> = {
  keyboard: ["account", "skins", "keyboard"],
  candidate: ["account", "skins", "candidate"],
  plugin: ["account", "plugins"],
  resource: ["account", "resources"],
};

/**
 * Writes a reaction into every cached list row of the item, so a card that remounts (another tab of the page, a search cleared, /me/ and back) shows the new heart and stars instead of the copy read before. The anonymous plugin and resource lists (`signedIn` false, the last key part) are left alone: they describe nobody's reactions.
 */
export function patchCommunityItem(client: QueryClient, kind: CommunityItemKind, id: string, patch: ItemPatch) {
  client.setQueriesData<InfiniteData<Page<{ id: string }>>>({ queryKey: LIST_KEYS[kind], predicate: query => query.queryKey.at(-1) !== false }, data => {
    if (!data?.pages.some(page => page.items.some(item => item.id === id))) return data;
    return { ...data, pages: data.pages.map(page => ({ ...page, items: page.items.map(item => (item.id === id ? { ...item, ...patch } : item)) })) };
  });
}

export const rateItem = async (kind: CommunityItemKind, id: string, stars: number) =>
  accountCall(`/api/v1/community/${COMMUNITY_COLLECTIONS[kind]}/${id}/rating`, async value => (await schemas()).ratingResultSchema.parse(value), { method: "PUT", body: { stars } });
