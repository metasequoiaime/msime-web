import { z } from "zod";
import { apiOriginSchema, DEFAULT_API_ORIGIN } from "./app-stats.ts";

/*
 * The website's account session, held by the Pages Functions (a backend-for-frontend) rather than by the page.
 *
 * Signing in runs the same Google ID-token flow as the App against msime-backend's `/v1/auth` (challenge with a nonce, Google Identity Services in the page, then login), so it lands on the same account. The access and refresh tokens the backend returns never reach browser JavaScript: they live only in two `__Host-` HttpOnly cookies, and every account call from the page goes through `/api/*` on the site's own origin, where these Functions read the cookies and call the backend with `Authorization: Bearer`. See docs/user-auth.md in msime-backend for the token lifetimes and the refresh rules.
 */

export const ACCESS_COOKIE = "__Host-msime_at";
export const REFRESH_COOKIE = "__Host-msime_rt";
/** The backend's access token lives 15 minutes; the cookie expires with it, so a missing access cookie next to a refresh cookie means "refresh first". */
export const ACCESS_MAX_AGE = 900;
/** The backend's session lasts at most 30 days. */
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/** The largest request body forwarded to the backend. The site's own forms send a few KiB at most; the backend's account routes accept 16–32 KiB. */
export const MAX_FORWARD_BODY = 64 * 1024;

export type SessionEnv = Record<string, unknown>;
export type SessionContext = { request: Request; env: SessionEnv; params?: Record<string, string | string[]> };

const jsonHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export const json = (data: unknown, status = 200, extra?: HeadersInit) => {
  const headers = new Headers(jsonHeaders);
  for (const [name, value] of new Headers(extra)) headers.append(name, value);
  return Response.json(data, { status, headers });
};

/** `{ "error": code }`, the shape every error this module produces itself has. Errors the backend produced are passed through in its own `{ "error": { code, message } }` shape. */
export const failure = (code: string, status: number, extra?: HeadersInit) => json({ error: code }, status, extra);

// ---- cookies ----

/** The attributes the contract fixes for both cookies. `__Host-` requires `Secure`, `Path=/` and no `Domain`. */
const COOKIE_ATTRIBUTES = "Path=/; Secure; HttpOnly; SameSite=Lax";

export const setCookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Max-Age=${maxAge}; ${COOKIE_ATTRIBUTES}`;
export const clearCookie = (name: string) => `${name}=; Max-Age=0; ${COOKIE_ATTRIBUTES}`;

export type Tokens = { access: string; refresh: string };

export const sessionCookies = ({ access, refresh }: Tokens) => [setCookie(ACCESS_COOKIE, access, ACCESS_MAX_AGE), setCookie(REFRESH_COOKIE, refresh, REFRESH_MAX_AGE)];
export const clearedCookies = () => [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)];

/** A token the backend issued is opaque but cookie-safe; anything else in the cookie is ignored rather than forwarded. */
const tokenPattern = /^[A-Za-z0-9._~+/=-]{16,4096}$/;

/** Reads the two session cookies. A value that is not token-shaped counts as absent. */
export function readSession(request: Request): { access?: string; refresh?: string } {
  const result: { access?: string; refresh?: string } = {};
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!tokenPattern.test(value)) continue;
    if (name === ACCESS_COOKIE) result.access = value;
    else if (name === REFRESH_COOKIE) result.refresh = value;
  }
  return result;
}

const withCookies = (response: Response, cookies: string[]) => {
  for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
  return response;
};

// ---- configuration ----

export function apiOrigin(env: SessionEnv) {
  const origin = apiOriginSchema.safeParse(env.MSIME_API_ORIGIN ?? DEFAULT_API_ORIGIN);
  if (!origin.success) console.warn("MSIME_API_ORIGIN is not a bare https origin");
  return origin.success ? origin.data : undefined;
}

/** The public Google Web client ID. It must also be listed in the backend's `auth.google.client_ids`, or every login fails the audience check. */
export function googleClientId(env: SessionEnv): string | null {
  const value = typeof env.GOOGLE_WEB_CLIENT_ID === "string" ? env.GOOGLE_WEB_CLIENT_ID.trim() : "";
  return /^[\w.-]{1,200}\.apps\.googleusercontent\.com$/.test(value) ? value : null;
}

const proxySecret = (env: SessionEnv) => (typeof env.SITE_PROXY_SECRET === "string" && env.SITE_PROXY_SECRET.trim() ? env.SITE_PROXY_SECRET.trim() : undefined);

/** Every state-changing request must come from a page on this very origin. Browsers always send `Origin` on non-GET fetches, so a missing header is refused too. */
export const sameOrigin = (request: Request) => request.headers.get("Origin") === new URL(request.url).origin;

export const isMutation = (method: string) => method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

// ---- backend calls ----

type BackendCall = { method?: string; path: string; search?: string; body?: ArrayBuffer | string; contentType?: string; access?: string };

/**
 * One call to msime-backend. With `SITE_PROXY_SECRET` configured, the call says it comes from the site and names the visitor's address (`CF-Connecting-IP`), so the backend rate-limits each visitor instead of the Cloudflare egress all of them share; without the secret neither header is sent. Redirects are never followed: the backend has none on these routes, and following one could leave the allowlist.
 */
export async function backend(env: SessionEnv, request: Request, call: BackendCall, fetcher: typeof fetch = fetch): Promise<Response> {
  const origin = apiOrigin(env);
  if (!origin) throw new BackendUnavailable();
  const headers = new Headers({ Accept: "application/json", "User-Agent": "MSIME-Web-account" });
  if (call.contentType) headers.set("Content-Type", call.contentType);
  if (call.access) headers.set("Authorization", `Bearer ${call.access}`);
  const secret = proxySecret(env);
  const visitor = request.headers.get("CF-Connecting-IP");
  if (secret) {
    headers.set("X-MSIME-Site-Proxy", secret);
    if (visitor) headers.set("X-MSIME-Client-IP", visitor);
  }
  try {
    return await fetcher(`${origin}${call.path}${call.search ?? ""}`, { method: call.method ?? "GET", headers, body: call.body, redirect: "manual", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    console.warn("Backend call failed", call.path, error instanceof Error ? error.name : "unknown");
    throw new BackendUnavailable();
  }
}

/** The backend could not be reached or is not configured. Answered with 503 `auth_unavailable`, leaving the cookies alone. */
export class BackendUnavailable extends Error {
  constructor() {
    super("Backend unavailable");
    this.name = "BackendUnavailable";
  }
}

/** The `code` of a backend error body (`{ "error": { "code": ... } }`), or `undefined`. */
export async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body = await response.clone().json() as { error?: { code?: unknown } };
    return typeof body?.error?.code === "string" ? body.error.code : undefined;
  } catch {
    return undefined;
  }
}

const tokenResponseSchema = z.object({ access_token: z.string().regex(tokenPattern), refresh_token: z.string().regex(tokenPattern), user: z.record(z.string(), z.unknown()) });

export type RefreshResult = { kind: "ok"; tokens: Tokens } | { kind: "superseded" } | { kind: "rejected" };

/** Refreshes collapse per refresh token within one isolate, so two requests from the same tab that both find the access cookie expired share one rotation instead of the second one replaying a token the first just rotated. */
const pendingRefreshes = new Map<string, Promise<RefreshResult>>();

/**
 * Rotates the session (`POST /v1/auth/refresh`). `superseded` is the backend's 409 `refresh_superseded`: another request (another tab, another isolate) rotated this token in the last 30 seconds, the session is intact, and the browser already has or is about to receive the new cookies. `rejected` is a token the backend no longer accepts. A backend that cannot be reached throws `BackendUnavailable`.
 */
export function refreshSession(env: SessionEnv, request: Request, refresh: string, fetcher: typeof fetch = fetch): Promise<RefreshResult> {
  const existing = pendingRefreshes.get(refresh);
  if (existing) return existing;
  const task = (async (): Promise<RefreshResult> => {
    const response = await backend(env, request, { method: "POST", path: "/v1/auth/refresh", body: JSON.stringify({ refresh_token: refresh }), contentType: "application/json" }, fetcher);
    if (response.status === 409 && (await errorCode(response)) === "refresh_superseded") return { kind: "superseded" };
    if (response.status >= 500 || response.status === 429) throw new BackendUnavailable();
    if (!response.ok) return { kind: "rejected" };
    const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) throw new BackendUnavailable();
    return { kind: "ok", tokens: { access: parsed.data.access_token, refresh: parsed.data.refresh_token } };
  })();
  pendingRefreshes.set(refresh, task);
  task.finally(() => pendingRefreshes.delete(refresh)).catch(() => {});
  return task;
}

/** What the browser is told when a refresh lost a race: wait a moment and repeat the request once; by then the winning response has replaced the cookies. */
export const sessionRetry = () => failure("session_retry", 401);
/** The session is gone: the cookies are cleared and the page shows the signed-out state. */
export const sessionExpired = () => withCookies(failure("session_expired", 401), clearedCookies());

/** Copies a backend answer for the browser: status, body and the few headers that mean something to the page. Backend cookies and caching headers are never forwarded. */
async function relay(response: Response): Promise<Response> {
  const headers = new Headers(jsonHeaders);
  const type = response.headers.get("Content-Type");
  if (type) headers.set("Content-Type", type);
  const retry = response.headers.get("Retry-After");
  if (retry) headers.set("Retry-After", retry);
  if (response.status >= 300 && response.status < 400) return failure("unexpected_redirect", 502);
  // A body cut off mid-stream is the backend failing, answered like any other outage (and, in `withSession`, still with the rotated cookies).
  const body = response.status === 204 || response.status === 304 ? null : await response.arrayBuffer().catch(() => { throw new BackendUnavailable(); });
  return new Response(body, { status: response.status, headers });
}

/**
 * Calls the backend on the visitor's behalf with the session in their cookies.
 *
 * No access cookie but a refresh cookie (the access token's 15 minutes ran out) refreshes first. A 401 from the backend to a call that carried a token refreshes and repeats the call once. Every successful rotation rewrites both cookies on the response, including a 503 when the backend fails after the rotation: the backend has already retired the old refresh token, and a browser left holding it would replay it later and have the whole session revoked. A refresh that lost a race answers 401 `session_retry` and keeps the cookies; a refresh the backend refused clears them and answers 401 `session_expired`. Without any session cookie the call goes out anonymously, which the public community routes answer as they would for anyone.
 */
export async function withSession(env: SessionEnv, request: Request, call: Omit<BackendCall, "access">, fetcher: typeof fetch = fetch): Promise<Response> {
  let { access, refresh } = readSession(request);
  const cookies: string[] = [];
  const rotate = async (): Promise<Response | undefined> => {
    if (!refresh) return sessionExpired();
    const result = await refreshSession(env, request, refresh, fetcher);
    if (result.kind === "superseded") return sessionRetry();
    if (result.kind === "rejected") return sessionExpired();
    ({ access, refresh } = result.tokens);
    cookies.splice(0, cookies.length, ...sessionCookies(result.tokens));
    return undefined;
  };
  try {
    if (!access && refresh) {
      const stop = await rotate();
      if (stop) return stop;
    }
    let response = await backend(env, request, { ...call, access }, fetcher);
    if (response.status === 401 && access && refresh && cookies.length === 0) {
      const stop = await rotate();
      if (stop) return stop;
      response = await backend(env, request, { ...call, access }, fetcher);
    }
    return withCookies(await relay(response), cookies);
  } catch (error) {
    if (!(error instanceof BackendUnavailable)) throw error;
    return withCookies(failure("auth_unavailable", 503), cookies);
  }
}

// ---- the proxied API ----

/**
 * The backend paths the page may reach through `/api/v1/*`: the signed-in user's own data under `/v1/users/me`, and the community catalog. Everything else (auth, admin, devices, input) is refused before any call. Each segment is plain URL characters, so `..`, encoded slashes and empty segments never get through to be interpreted by the backend's router.
 */
const SEGMENT = "[A-Za-z0-9_~-][A-Za-z0-9._~-]*";
const ALLOWED_PATH = new RegExp(`^/v1/(?:users/me(?:/${SEGMENT})*|community(?:/${SEGMENT})+)$`);

export const allowedBackendPath = (path: string) => ALLOWED_PATH.test(path) && !path.split("/").some(segment => segment === "." || segment === "..");

const PROXY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** Reads a request body up to `MAX_FORWARD_BODY`, or `undefined` when it is larger. Read once so a refreshed retry can send it again. The stream is read chunk by chunk and abandoned as soon as it passes the limit, so a body sent without `Content-Length` (chunked) is never buffered beyond it. */
async function boundedBody(request: Request): Promise<ArrayBuffer | undefined | null> {
  if (!request.body) return null;
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (declared > MAX_FORWARD_BODY) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FORWARD_BODY) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

/** `/api/v1/<path>` → the backend's `/v1/<path>` with the same query, method and JSON body. */
export async function proxyApi({ request, env }: SessionContext, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  if (!PROXY_METHODS.includes(request.method)) return failure("method_not_allowed", 405, { Allow: PROXY_METHODS.join(", ") });
  if (isMutation(request.method) && !sameOrigin(request)) return failure("forbidden_origin", 403);
  const path = url.pathname.slice("/api".length);
  if (!url.pathname.startsWith("/api/v1/") || !allowedBackendPath(path)) return failure("not_found", 404);
  const body = request.method === "GET" ? null : await boundedBody(request);
  if (body === undefined) return failure("request_too_large", 413);
  const contentType = body ? request.headers.get("Content-Type") ?? undefined : undefined;
  return withSession(env, request, { method: request.method, path, search: url.search, body: body ?? undefined, contentType }, fetcher);
}

// ---- auth endpoints ----

/** GET /api/auth/config → `{ google_client_id }`, `null` when the site has no Google client configured (the page then hides 登录). */
export function serveAuthConfig({ request, env }: SessionContext): Response {
  if (request.method !== "GET") return failure("method_not_allowed", 405, { Allow: "GET" });
  return json({ google_client_id: googleClientId(env) });
}

const challengeSchema = z.object({ challenge_id: z.string().min(1).max(256), nonce: z.string().min(1).max(512) });

/** POST /api/auth/challenge → `{ challenge_id, nonce }` from `POST /v1/auth/challenges {"provider":"google"}`. The nonce goes into Google Identity Services, which signs it into the ID token the backend then checks. */
export async function serveChallenge({ request, env }: SessionContext, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return failure("method_not_allowed", 405, { Allow: "POST" });
  if (!sameOrigin(request)) return failure("forbidden_origin", 403);
  if (!googleClientId(env)) return failure("provider_disabled", 503);
  try {
    const response = await backend(env, request, { method: "POST", path: "/v1/auth/challenges", body: JSON.stringify({ provider: "google" }), contentType: "application/json" }, fetcher);
    if (!response.ok) return failure((await errorCode(response)) ?? "auth_unavailable", response.status >= 500 ? 503 : response.status);
    const parsed = challengeSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) return failure("auth_unavailable", 503);
    return json(parsed.data);
  } catch (error) {
    if (!(error instanceof BackendUnavailable)) throw error;
    return failure("auth_unavailable", 503);
  }
}

const loginRequestSchema = z.object({ challenge_id: z.string().min(1).max(256), credential: z.string().min(1).max(8192) }).strict();

/** POST /api/auth/login `{ challenge_id, credential }` → `{ user }` with the two session cookies set. The tokens themselves are never in the body. */
export async function serveLogin({ request, env }: SessionContext, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return failure("method_not_allowed", 405, { Allow: "POST" });
  if (!sameOrigin(request)) return failure("forbidden_origin", 403);
  const body = await boundedBody(request);
  if (!body) return failure("invalid_json", 400);
  let input: unknown;
  try { input = JSON.parse(new TextDecoder().decode(body)); } catch { return failure("invalid_json", 400); }
  const parsed = loginRequestSchema.safeParse(input);
  if (!parsed.success) return failure("invalid_json", 400);
  try {
    const response = await backend(env, request, { method: "POST", path: "/v1/auth/login", body: JSON.stringify(parsed.data), contentType: "application/json" }, fetcher);
    if (!response.ok) return failure((await errorCode(response)) ?? "auth_unavailable", response.status >= 500 ? 503 : response.status);
    const tokens = tokenResponseSchema.safeParse(await response.json().catch(() => undefined));
    if (!tokens.success) return failure("auth_unavailable", 503);
    return withCookies(json({ user: tokens.data.user }), sessionCookies({ access: tokens.data.access_token, refresh: tokens.data.refresh_token }));
  } catch (error) {
    if (!(error instanceof BackendUnavailable)) throw error;
    return failure("auth_unavailable", 503);
  }
}

/**
 * POST /api/auth/logout → 204 with both cookies cleared, whatever the backend answers. The backend session must really end instead of lingering until its 30 days are up, so an access token that is missing (expired) or that the backend rejects with 401 is refreshed once and the logout sent with the new one.
 *
 * The one exception is a refresh that lost a race (`superseded`): the browser is about to receive the cookies of the request that won it, and only those can end the session. That answers 401 `session_retry` and keeps the cookies, like every other call, so the page repeats the logout with the new cookies a moment later.
 */
export async function serveLogout({ request, env }: SessionContext, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return failure("method_not_allowed", 405, { Allow: "POST" });
  if (!sameOrigin(request)) return failure("forbidden_origin", 403);
  const session = readSession(request);
  let refresh = session.refresh;
  const logout = (access: string) => backend(env, request, { method: "POST", path: "/v1/auth/logout", body: JSON.stringify({ all: false }), contentType: "application/json", access }, fetcher);
  /** A fresh access token, `superseded` when another request rotated the session first, or `undefined` when there is no session left to end. Refreshes at most once. */
  const rotate = async (): Promise<string | "superseded" | undefined> => {
    if (!refresh) return undefined;
    const result = await refreshSession(env, request, refresh, fetcher);
    refresh = undefined;
    if (result.kind === "superseded") return "superseded";
    return result.kind === "ok" ? result.tokens.access : undefined;
  };
  try {
    let access = session.access ?? await rotate();
    if (access === "superseded") return sessionRetry();
    if (access && (await logout(access)).status === 401) {
      access = await rotate();
      if (access === "superseded") return sessionRetry();
      if (access) await logout(access);
    }
  } catch (error) {
    if (!(error instanceof BackendUnavailable)) throw error;
  }
  return withCookies(new Response(null, { status: 204, headers: jsonHeaders }), clearedCookies());
}

/** GET /api/me → `GET /v1/users/me` (`{ user, identities }`). 401 `not_signed_in` without asking the backend when there is no session cookie at all. */
export async function serveMe({ request, env }: SessionContext, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "GET") return failure("method_not_allowed", 405, { Allow: "GET" });
  const { access, refresh } = readSession(request);
  if (!access && !refresh) return failure("not_signed_in", 401);
  return withSession(env, request, { method: "GET", path: "/v1/users/me" }, fetcher);
}
