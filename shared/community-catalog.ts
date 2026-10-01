import { z } from "zod";
import { DECLARED_PLUGIN_KINDS, isLivePluginKind, PLUGIN_KINDS, pluginSchema, RESOURCE_KINDS, resourceSchema, type Plugin, type PluginKind, type Resource, type ResourceKind } from "../src/data/schemas.ts";
import { MAX_SKIN_OFFSET, MAX_SKIN_QUERY_BYTES, type SkinContext } from "./community-skins.ts";
import { cachedJson, UpstreamUnavailable } from "./edge-cache.ts";
import { apiOrigin } from "./site-session.ts";

/*
 * The community plugin and resource catalogs of msime-backend as an anonymous visitor reads them: `GET /v1/community/plugins` (docs/plugin-community.md) and `GET /v1/community/resources` (docs/community-resources.md), cached at the edge like the skin lists (shared/community-skins.ts). Signed-in visitors read the same lists through `/api/v1/*` instead, which adds their own rating and favourites and is never cached.
 */

export type CatalogCollection = "plugins" | "resources";

/** `kind` narrows a plugin list and picks which resource list; the backend requires it for resources. The search is trimmed, so " 猫 " and "猫" share one cached copy. */
export type CatalogListParams = { offset: number; q: string; kind?: PluginKind | ResourceKind };

/** Reads `offset`, `q` and `kind` from a list request, within the same limits the backend applies to the skin lists. `undefined` when any of them is outside them, or when a resource list names no kind. */
export function catalogListParams(url: URL, collection: CatalogCollection): CatalogListParams | undefined {
  const rawOffset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(rawOffset)) return undefined;
  const offset = Number(rawOffset);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (offset > MAX_SKIN_OFFSET || new TextEncoder().encode(q).length > MAX_SKIN_QUERY_BYTES) return undefined;
  const kind = url.searchParams.get("kind") ?? "";
  const kinds: readonly string[] = collection === "plugins" ? PLUGIN_KINDS : RESOURCE_KINDS;
  if (kind === "") return collection === "plugins" ? { offset, q } : undefined;
  return kinds.includes(kind) ? { offset, q, kind: kind as PluginKind | ResourceKind } : undefined;
}

/** The query string of a list page, in the order `publicCatalogPath` (src/data/account.ts) writes it, so the edge cache key and the page's request agree: `offset, q, kind` for plugins and `kind, offset, q` for resources. */
export const catalogListQuery = (collection: CatalogCollection, { offset, q, kind }: CatalogListParams) => {
  const search = new URLSearchParams();
  if (collection === "resources" && kind) search.set("kind", kind);
  if (offset) search.set("offset", String(offset));
  if (q) search.set("q", q);
  if (collection === "plugins" && kind) search.set("kind", kind);
  const text = search.toString();
  return text ? `?${text}` : "";
};

const backendPageSchemas = {
  plugins: z.object({ plugins: z.array(z.unknown()), has_more: z.boolean() }),
  resources: z.object({ items: z.array(z.unknown()), has_more: z.boolean() }),
};

/** One page as the page reads it (`Page` in src/data/account.ts), plus whether it is a stale copy. */
export type CatalogPage<T> = { items: T[]; nextOffset: number | null; stale: boolean };

/** Fetches one backend page anonymously and keeps the rows the site can draw. A row that fails validation is left out with a warning; `nextOffset` still counts it, so the following page starts where the backend's does. */
export async function loadCatalogPage(origin: string, collection: CatalogCollection, params: CatalogListParams, request: typeof fetch = fetch): Promise<CatalogPage<Plugin | Resource>> {
  // The backend only lists the newer plugin kinds to callers that declare them; the edge cache key stays the page's own query.
  const query = catalogListQuery(collection, params);
  const declared = collection === "plugins" ? `${query ? "&" : "?"}kinds=${DECLARED_PLUGIN_KINDS}` : "";
  const response = await request(`${origin}/v1/community/${collection}${query}${declared}`, { headers: { Accept: "application/json", "User-Agent": `MSIME-Web-${collection}` }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Community ${collection} unavailable: HTTP ${response.status}`);
  const body = await response.json();
  const page = collection === "plugins" ? backendPageSchemas.plugins.parse(body) : backendPageSchemas.resources.parse(body);
  const rows = "plugins" in page ? page.plugins : page.items;
  const schema = collection === "plugins" ? pluginSchema : resourceSchema;
  const items: (Plugin | Resource)[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) items.push(parsed.data);
    else console.warn(`Skipped a community ${collection} row the site cannot read`, typeof row === "object" && row && "id" in row ? String(row.id) : "");
  }
  return { items, nextOffset: page.has_more ? params.offset + rows.length : null, stale: false };
}

// ---- Pages Functions ----

const jsonHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const UNAVAILABLE = { plugins: "社区插件暂不可用。", resources: "社区词库暂不可用。" };

const edgeCache = () => (caches as CacheStorage & { default: Cache }).default;

/** GET /api/plugins?offset=&q=&kind= and GET /api/resources?kind=&offset=&q= → `{ items, nextOffset, stale }`. Each page, search and kind is asked of the backend at most once a minute per edge location; 503 `{ error }` when the backend has never answered it. */
export async function serveCatalogList(collection: CatalogCollection, { request, env, waitUntil }: SkinContext): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...jsonHeaders, Allow: "GET" } });
  const params = catalogListParams(new URL(request.url), collection);
  if (!params) return Response.json({ error: "搜索内容过长，或页码、类型无效。" }, { status: 400, headers: jsonHeaders });
  // A kind the backend does not serve yet would come back as 400 and surface as 503; the list is simply empty until it does.
  if (collection === "plugins" && params.kind && !isLivePluginKind(params.kind as PluginKind)) return Response.json({ items: [], nextOffset: null, stale: false }, { headers: jsonHeaders });
  const origin = apiOrigin(env);
  if (!origin) return Response.json({ error: UNAVAILABLE[collection] }, { status: 503, headers: jsonHeaders });
  const key = new Request(new URL(`/api/${collection}${catalogListQuery(collection, params)}`, request.url));
  try {
    const { data, stale } = await cachedJson(key, edgeCache(), () => loadCatalogPage(origin, collection, params), { freshFor: 60_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: UNAVAILABLE[collection] }, { status: 503, headers: jsonHeaders });
  }
}
