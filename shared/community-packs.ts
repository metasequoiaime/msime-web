import { z } from "zod";
import { communityDictionarySchema, communityPluginSchema, type CommunityDictionaries, type CommunityPlugins } from "../src/data/schemas.ts";
import { ENTRY_KINDS, isCommunityPluginKind, type CommunityPluginKind } from "../src/data/pack-kinds.ts";
import { apiOrigin, edgeCache, jsonHeaders, type SkinContext } from "./community-skins.ts";
import { cachedJson, UpstreamUnavailable } from "./edge-cache.ts";

/*
 * Community plugin packs and shared dictionaries of msime-backend, read without an account: `GET /v1/community/plugins` (internal/account/community_plugins.go, `q` matching the name, `kind` one of the plugin kinds) and `GET /v1/community/resources?kind=dictionary` (internal/account/community_resources.go, `q` matching the name, no categories), both 20 per page, newest first. Installing, importing, saving and rating need a signed-in App session, so the website only browses and sends visitors to the App, as the skins page does.
 */

/** The backend's limits are 100,000 for a plugin offset and 128 bytes for a plugin search; a resource takes a larger offset and 128 characters. The stricter pair serves both, and the search box stops at the same length. */
export const MAX_PACK_OFFSET = 100_000;
export const MAX_PACK_QUERY_BYTES = 128;

export type CommunityPackList = "plugins" | "dictionaries";

/** `kind` is set only for a plugin list narrowed to one kind. */
export type PackListParams = { offset: number; q: string; kind?: CommunityPluginKind };

/** Reads `offset`, `q` and, for plugins, `kind` from a list request, trimming the search so " 雨 " and "雨" share one cached copy. `undefined` when any of them is outside what the backend accepts or a kind the App's gallery does not list (effect packs cannot be installed from the community). Dictionaries have no kinds, so their list ignores the parameter. */
export function packListParams(url: URL, list: CommunityPackList): PackListParams | undefined {
  const rawOffset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(rawOffset)) return undefined;
  const offset = Number(rawOffset);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (offset > MAX_PACK_OFFSET || new TextEncoder().encode(q).length > MAX_PACK_QUERY_BYTES || /\p{Cc}/u.test(q)) return undefined;
  const kind = list === "plugins" ? url.searchParams.get("kind") ?? "" : "";
  if (kind === "") return { offset, q };
  return isCommunityPluginKind(kind) ? { offset, q, kind } : undefined;
}

/** The query string of a list page, in the order `communityPackPath` (src/data/queries.ts) writes it, so the edge cache key and the page's request agree. The backend's `kind=dictionary` is added only for the backend. */
const listQuery = ({ offset, q, kind }: PackListParams, resourceKind?: string) => {
  const search = new URLSearchParams();
  if (resourceKind) search.set("kind", resourceKind);
  if (offset) search.set("offset", String(offset));
  if (q) search.set("q", q);
  if (kind) search.set("kind", kind);
  const text = search.toString();
  return text ? `?${text}` : "";
};

const headers = { Accept: "application/json", "User-Agent": "MSIME-Web-packs" };

const backendPluginSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  license: z.string(),
  size: z.number(),
  downloads: z.number(),
  rating_count: z.number(),
  rating_average: z.number(),
  created_at: z.string(),
});

const backendDictionarySchema = z.object({
  id: z.string(),
  kind: z.literal("dictionary"),
  name: z.string(),
  description: z.string(),
  author: z.string(),
  content: z.object({ entries: z.array(z.object({ kind: z.string(), word: z.string() })).optional() }),
  saves: z.number(),
  rating_count: z.number(),
  rating_average: z.number(),
});

/** How many words a dictionary card shows. */
const SAMPLE_WORDS = 8;

/** Fetches one backend page and keeps the rows the site can show. A row that fails validation (or an effect pack, which the App cannot install from the community) is left out with a warning; `nextOffset` still counts it, so the following page starts where the backend's does. */
async function loadPage<T>(url: string, field: "plugins" | "items", offset: number, toItem: (row: unknown) => T | undefined, request: typeof fetch) {
  const response = await request(url, { headers, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Community packs unavailable: HTTP ${response.status}`);
  const page = z.object({ [field]: z.array(z.unknown()), has_more: z.boolean() }).parse(await response.json()) as { has_more: boolean } & Record<typeof field, unknown[]>;
  const rows = page[field];
  const items: T[] = [];
  for (const row of rows) {
    const item = toItem(row);
    if (item === undefined) console.warn("Skipped a community pack the site cannot show", typeof row === "object" && row && "id" in row ? String(row.id) : "");
    else items.push(item);
  }
  return { items, nextOffset: page.has_more ? offset + rows.length : null, stale: false };
}

export function loadCommunityPlugins(origin: string, params: PackListParams, request: typeof fetch = fetch): Promise<CommunityPlugins> {
  return loadPage(`${origin}/v1/community/plugins${listQuery(params)}`, "plugins", params.offset, row => {
    const parsed = backendPluginSchema.safeParse(row);
    if (!parsed.success) return undefined;
    const pack = parsed.data;
    const item = communityPluginSchema.safeParse({ id: pack.id, kind: pack.kind, name: pack.name, description: pack.description, author: pack.author, version: pack.version, license: pack.license, size: pack.size, downloads: pack.downloads, ratingCount: pack.rating_count, ratingAverage: pack.rating_average, createdAt: pack.created_at });
    return item.success ? item.data : undefined;
  }, request);
}

export function loadCommunityDictionaries(origin: string, params: PackListParams, request: typeof fetch = fetch): Promise<CommunityDictionaries> {
  return loadPage(`${origin}/v1/community/resources${listQuery(params, "dictionary")}`, "items", params.offset, row => {
    const parsed = backendDictionarySchema.safeParse(row);
    if (!parsed.success) return undefined;
    const resource = parsed.data;
    const entries = resource.content.entries ?? [];
    const counts = Object.fromEntries(ENTRY_KINDS.map(kind => [kind, entries.filter(entry => entry.kind === kind).length]));
    const sample = [...new Set(entries.map(entry => entry.word.trim()).filter(Boolean))].slice(0, SAMPLE_WORDS);
    const item = communityDictionarySchema.safeParse({ id: resource.id, name: resource.name, description: resource.description, author: resource.author, counts, sample, saves: resource.saves, ratingCount: resource.rating_count, ratingAverage: resource.rating_average });
    return item.success ? item.data : undefined;
  }, request);
}

const NAMES: Record<CommunityPackList, string> = { plugins: "社区插件", dictionaries: "社区词库" };

/** GET /api/plugins/community?offset=&q=&kind= and /api/dictionaries/community?offset=&q= → `communityPluginsSchema` / `communityDictionariesSchema` (src/data/schemas.ts). Each page, search and kind is asked of the backend at most once a minute per edge location; 503 `{ error }` when the backend has never answered it. */
export async function serveCommunityPacks(list: CommunityPackList, { request, env, waitUntil }: SkinContext): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...jsonHeaders, Allow: "GET" } });
  const params = packListParams(new URL(request.url), list);
  if (!params) return Response.json({ error: "搜索内容过长，或页码、类型无效。" }, { status: 400, headers: jsonHeaders });
  const origin = apiOrigin(env);
  if (!origin) return Response.json({ error: `${NAMES[list]}暂不可用。` }, { status: 503, headers: jsonHeaders });
  const key = new Request(new URL(`/api/${list}/community${listQuery(params)}`, request.url));
  const load = list === "plugins" ? () => loadCommunityPlugins(origin, params) : () => loadCommunityDictionaries(origin, params);
  try {
    const { data, stale } = await cachedJson<CommunityPlugins | CommunityDictionaries>(key, edgeCache(), load, { freshFor: 60_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: `${NAMES[list]}暂不可用。` }, { status: 503, headers: jsonHeaders });
  }
}
