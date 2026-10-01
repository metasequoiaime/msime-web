import { z } from "zod";
import { candidateSkinSchema, communitySkinIdSchema, keyboardSkinSchema, type CandidateSkins, type KeyboardSkins } from "../src/data/schemas.ts";
import { isCandidateSkinCategory, type CandidateSkinCategory } from "../src/data/skin-categories.ts";
import { apiOriginSchema, DEFAULT_API_ORIGIN } from "./app-stats.ts";
import { cachedJson, UpstreamUnavailable } from "./edge-cache.ts";
import { imageExtension } from "./feedback-images.ts";

/*
 * The community skin catalog of msime-backend, read without an account: `GET /v1/community/skins` (keyboard skins) and `GET /v1/community/candidate-skins` (candidate-window skins) in internal/account/community.go and community_candidate.go, 20 per page, newest first, `q` matching the name. Candidate skins also filter by `category` and return each item's category when asked with `include=category`; keyboard skins have no categories. Downloading needs a signed-in session, so the website only browses and sends visitors to the App.
 */

export const SKIN_KINDS = ["keyboard", "candidate"] as const;
export type SkinKind = (typeof SKIN_KINDS)[number];

/** The backend's own limits on the list parameters (`invalid_offset`, `invalid_search`). */
export const MAX_SKIN_OFFSET = 100_000;
export const MAX_SKIN_QUERY_BYTES = 128;

/** `category` is set only for a candidate list narrowed to one category. */
export type SkinListParams = { offset: number; q: string; category?: CandidateSkinCategory };

/** Reads `offset`, `q` and, for candidate skins, `category` from a list request. The search is trimmed, so " 月 " and "月" share one cached copy. `undefined` when any of them is outside what the backend accepts: an unknown category is `invalid_category` there, and an empty one lists every category. The keyboard catalog has no categories and its backend ignores the parameter, so the keyboard list ignores it too. */
export function skinListParams(url: URL, kind: SkinKind): SkinListParams | undefined {
  const rawOffset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(rawOffset)) return undefined;
  const offset = Number(rawOffset);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (offset > MAX_SKIN_OFFSET || new TextEncoder().encode(q).length > MAX_SKIN_QUERY_BYTES) return undefined;
  const category = kind === "candidate" ? url.searchParams.get("category") ?? "" : "";
  if (category === "") return { offset, q };
  return isCandidateSkinCategory(category) ? { offset, q, category } : undefined;
}

/** The query string of a list page, in the order `skinListPath` (src/data/queries.ts) writes it, so the edge cache key and the page's request agree. `include` is only ever added for the backend. */
const listQuery = ({ offset, q, category }: SkinListParams, include?: string) => {
  const search = new URLSearchParams();
  if (offset) search.set("offset", String(offset));
  if (q) search.set("q", q);
  if (category) search.set("category", category);
  if (include) search.set("include", include);
  const text = search.toString();
  return text ? `?${text}` : "";
};

const backendPageSchema = z.object({ skins: z.array(z.unknown()), has_more: z.boolean() });

const backendKeyboardSkinSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  author: z.string(),
  design: z.unknown(),
  downloads: z.number(),
  rating_count: z.number(),
  rating_average: z.number(),
});

const backendCandidateSkinSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  license: z.object({ assets: z.string() }),
  size: z.number(),
  downloads: z.number(),
  rating_count: z.number(),
  rating_average: z.number(),
  created_at: z.string(),
  category: z.string().optional(),
});

const headers = (agent: string) => ({ Accept: "application/json", "User-Agent": `MSIME-Web-${agent}` });

/** Fetches one backend page and keeps the rows the site can draw. A row that fails validation is left out with a warning rather than failing the whole page; `nextOffset` still counts it, so the following page starts where the backend's does. */
async function loadPage<T>(url: string, offset: number, agent: string, toItem: (row: unknown) => T | undefined, request: typeof fetch) {
  const response = await request(url, { headers: headers(agent), signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Community skins unavailable: HTTP ${response.status}`);
  const page = backendPageSchema.parse(await response.json());
  const items: T[] = [];
  for (const row of page.skins) {
    const item = toItem(row);
    if (item === undefined) console.warn("Skipped a community skin the site cannot read", typeof row === "object" && row && "id" in row ? String(row.id) : "");
    else items.push(item);
  }
  return { items, nextOffset: page.has_more ? offset + page.skins.length : null, stale: false };
}

export function loadKeyboardSkins(origin: string, params: SkinListParams, request: typeof fetch = fetch): Promise<KeyboardSkins> {
  return loadPage(`${origin}/v1/community/skins${listQuery(params)}`, params.offset, "skins", row => {
    const parsed = backendKeyboardSkinSchema.safeParse(row);
    if (!parsed.success) return undefined;
    const skin = parsed.data;
    const item = keyboardSkinSchema.safeParse({ id: skin.id, name: skin.name, description: skin.description, author: skin.author, design: skin.design, downloads: skin.downloads, ratingCount: skin.rating_count, ratingAverage: skin.rating_average });
    return item.success ? item.data : undefined;
  }, request);
}

/** Always asks for `include=category`, so every card can name its category. A category added on the backend before the site knows it reads as `other`, as the App does. */
export function loadCandidateSkins(origin: string, params: SkinListParams, request: typeof fetch = fetch): Promise<CandidateSkins> {
  return loadPage(`${origin}/v1/community/candidate-skins${listQuery(params, "category")}`, params.offset, "skins", row => {
    const parsed = backendCandidateSkinSchema.safeParse(row);
    if (!parsed.success) return undefined;
    const skin = parsed.data;
    const category = skin.category === undefined ? {} : { category: isCandidateSkinCategory(skin.category) ? skin.category : "other" };
    const item = candidateSkinSchema.safeParse({ id: skin.id, name: skin.name, description: skin.description, author: skin.author, version: skin.version, license: skin.license.assets, size: skin.size, downloads: skin.downloads, ratingCount: skin.rating_count, ratingAverage: skin.rating_average, createdAt: skin.created_at, ...category });
    return item.success ? item.data : undefined;
  }, request);
}

/** An image kept in the edge cache as base64, the form the backend sends it in. `null` means the skin has no such image (or no longer exists). */
export type SkinImage = { contentType: string; data: string } | null;

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

/** Only bytes whose signature is PNG, JPEG or WebP are served, typed by that signature rather than by what the upstream declared. */
function checkedImage(data: string): SkinImage {
  let bytes: Uint8Array;
  try { bytes = decodeBase64(data); } catch { return null; }
  const extension = imageExtension(bytes);
  return extension ? { contentType: `image/${extension}`, data } : null;
}

/** The wallpaper of a photo keyboard skin. The list strips `design.photo`; only the detail (`GET /v1/community/skins/{id}`, public for any skin that is not removed) carries it. */
export async function loadKeyboardPhoto(origin: string, id: string, request: typeof fetch = fetch): Promise<SkinImage> {
  const response = await request(`${origin}/v1/community/skins/${id}`, { headers: headers("skins"), signal: AbortSignal.timeout(8_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Keyboard skin unavailable: HTTP ${response.status}`);
  const { design } = z.object({ design: z.object({ photo: z.string().optional() }) }).parse(await response.json());
  return design.photo ? checkedImage(design.photo) : null;
}

/** The preview image of a candidate-window skin package (`GET /v1/community/candidate-skins/{id}/preview`). */
export async function loadCandidatePreview(origin: string, id: string, request: typeof fetch = fetch): Promise<SkinImage> {
  const response = await request(`${origin}/v1/community/candidate-skins/${id}/preview`, { headers: headers("skins"), signal: AbortSignal.timeout(8_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Candidate skin preview unavailable: HTTP ${response.status}`);
  return checkedImage(z.object({ data: z.string() }).parse(await response.json()).data);
}

// ---- Pages Functions ----

export type SkinContext = { request: Request; env: Record<string, unknown>; waitUntil: (task: Promise<unknown>) => void; params?: Record<string, string | string[]> };

const jsonHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const imageHeaders = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline" };

const apiOrigin = (env: Record<string, unknown>) => {
  const origin = apiOriginSchema.safeParse(env.MSIME_API_ORIGIN ?? DEFAULT_API_ORIGIN);
  if (!origin.success) console.warn("MSIME_API_ORIGIN is not a bare https origin");
  return origin.success ? origin.data : undefined;
};

const edgeCache = () => (caches as CacheStorage & { default: Cache }).default;

/** GET /api/skins/<kind>?offset=&q= (and `&category=` for candidate skins) → `keyboardSkinsSchema` / `candidateSkinsSchema` (src/data/schemas.ts). Each page, search and category is asked of the backend at most once a minute per edge location; 503 `{ error }` when the backend has never answered it. */
export async function serveSkinList(kind: SkinKind, { request, env, waitUntil }: SkinContext): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...jsonHeaders, Allow: "GET" } });
  const params = skinListParams(new URL(request.url), kind);
  if (!params) return Response.json({ error: "搜索内容过长，或页码、分类无效。" }, { status: 400, headers: jsonHeaders });
  const origin = apiOrigin(env);
  if (!origin) return Response.json({ error: "社区皮肤暂不可用。" }, { status: 503, headers: jsonHeaders });
  const key = new Request(new URL(`/api/skins/${kind}${listQuery(params)}`, request.url));
  const load = kind === "keyboard" ? () => loadKeyboardSkins(origin, params) : () => loadCandidateSkins(origin, params);
  try {
    const { data, stale } = await cachedJson<KeyboardSkins | CandidateSkins>(key, edgeCache(), load, { freshFor: 60_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: "社区皮肤暂不可用。" }, { status: 503, headers: jsonHeaders });
  }
}

/** Optional `?v=` on a candidate preview: the package version, so a new release is a new URL for the browser and the edge alike. */
const versionSchema = z.string().regex(/^[\w.+-]{1,64}$/);

/**
 * GET /api/skins/keyboard/<id>/photo and /api/skins/candidate/<id>/preview?v=<version>: the image bytes, so the page shows them under `img-src 'self'` without base64 in its JSON. A keyboard photo can change when its author republishes, so it is cached for an hour; a candidate preview is addressed by version and kept for a day. 404 (cached briefly) when the skin has no such image.
 */
export async function serveSkinImage(kind: SkinKind, { request, env, waitUntil, params }: SkinContext): Promise<Response> {
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { ...imageHeaders, "Cache-Control": "no-store", Allow: "GET" } });
  const id = communitySkinIdSchema.safeParse(params?.id);
  const url = new URL(request.url);
  const version = url.searchParams.get("v");
  if (!id.success || (version !== null && (kind === "keyboard" || !versionSchema.safeParse(version).success))) return new Response(null, { status: 404, headers: { ...imageHeaders, "Cache-Control": "no-store" } });
  const origin = apiOrigin(env);
  if (!origin) return new Response(null, { status: 503, headers: { ...imageHeaders, "Cache-Control": "no-store" } });
  const skinId = id.data.toLowerCase();
  const path = kind === "keyboard" ? `/api/skins/keyboard/${skinId}/photo` : `/api/skins/candidate/${skinId}/preview${version ? `?v=${encodeURIComponent(version)}` : ""}`;
  const freshFor = kind === "keyboard" ? 3_600_000 : 86_400_000;
  const load = kind === "keyboard" ? () => loadKeyboardPhoto(origin, skinId) : () => loadCandidatePreview(origin, skinId);
  try {
    const { data } = await cachedJson<SkinImage>(new Request(new URL(path, request.url)), edgeCache(), load, { freshFor, background: waitUntil });
    if (!data) return new Response(null, { status: 404, headers: { ...imageHeaders, "Cache-Control": "public, max-age=300" } });
    return new Response(decodeBase64(data.data), { headers: { ...imageHeaders, "Content-Type": data.contentType, "Cache-Control": `public, max-age=${freshFor / 1000}` } });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return new Response(null, { status: 503, headers: { ...imageHeaders, "Cache-Control": "no-store" } });
  }
}
