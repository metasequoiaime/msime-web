import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCESS_COOKIE, REFRESH_COOKIE, allowedBackendPath, readSession } from '../shared/site-session.ts';
import { onRequest as authConfig } from '../functions/api/auth/config.ts';
import { onRequest as challenge } from '../functions/api/auth/challenge.ts';
import { onRequest as login } from '../functions/api/auth/login.ts';
import { onRequest as logout } from '../functions/api/auth/logout.ts';
import { onRequest as me } from '../functions/api/me.ts';
import { onRequest as proxy } from '../functions/api/v1/[[path]].ts';

const SITE = 'https://msime.app';
const API = 'https://api.msime.app';
const CLIENT_ID = '1234567890-abcdefg.apps.googleusercontent.com';
const ENV = { MSIME_API_ORIGIN: API, GOOGLE_WEB_CLIENT_ID: CLIENT_ID };
// Token-shaped values; the real ones are opaque strings of the same alphabet.
const AT = 'access-token-0000000001';
const RT = 'refresh-token-000000001';
const AT2 = 'access-token-0000000002';
const RT2 = 'refresh-token-000000002';
const USER = { id: 'u1', display_name: '水杉小鹿', created_at: '2026-10-01T00:00:00Z' };

const cookieHeader = ({ access, refresh } = {}) => [access && `${ACCESS_COOKIE}=${access}`, refresh && `${REFRESH_COOKIE}=${refresh}`, 'msime-theme=dark'].filter(Boolean).join('; ');

/** A request as the browser sends it: same-origin `Origin` on mutations unless told otherwise. */
const browser = (path, { method = 'GET', body, origin = method === 'GET' ? undefined : SITE, session, headers = {} } = {}) => {
  const all = { ...headers };
  if (origin) all.Origin = origin;
  if (session) all.Cookie = cookieHeader(session);
  if (body !== undefined) all['Content-Type'] = 'application/json';
  return new Request(`${SITE}${path}`, { method, headers: all, body: body === undefined ? undefined : JSON.stringify(body) });
};

/** Records every backend call and answers from `routes`, keyed by `METHOD path`. A route may be a function of the call for sequenced answers. */
const backend = routes => {
  const calls = [];
  const fetcher = async (url, init) => {
    const target = new URL(url);
    const headers = new Headers(init.headers);
    const body = init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : new TextDecoder().decode(init.body);
    const call = { method: init.method, path: target.pathname, search: target.search, headers, body: body && JSON.parse(body), redirect: init.redirect };
    calls.push(call);
    const route = routes[`${init.method} ${target.pathname}`];
    if (!route) return Response.json({ error: { code: 'not_found', message: 'not_found' } }, { status: 404 });
    return typeof route === 'function' ? route(call, calls) : route.clone();
  };
  return { calls, fetcher };
};

const tokens = (access = AT2, refresh = RT2) => Response.json({ access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 900, user: USER });
const backendError = (status, code) => Response.json({ error: { code, message: code } }, { status });

/** Runs a Function with `globalThis.fetch` standing in for the backend, as Pages would call it. */
const run = async (t, handler, request, routes, env = ENV) => {
  const { calls, fetcher } = backend(routes);
  t.mock.method(globalThis, 'fetch', fetcher);
  const response = await handler({ request, env, params: {} });
  return { response, calls, cookies: response.headers.getSetCookie() };
};

const parseCookie = header => {
  const [pair, ...attributes] = header.split('; ');
  const [name, value] = pair.split('=');
  return { name, value, attributes };
};

// ---- cookies ----

test('login sets both session cookies with the contract attributes and keeps the tokens out of the body', async t => {
  const { response, calls, cookies } = await run(t, login, browser('/api/auth/login', { method: 'POST', body: { challenge_id: 'c1', credential: 'google-id-token' } }), { 'POST /v1/auth/login': tokens(AT, RT) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { user: USER });
  assert.doesNotMatch(JSON.stringify(body), /token/);
  assert.deepEqual(calls[0].body, { challenge_id: 'c1', credential: 'google-id-token' });
  const [access, refresh] = cookies.map(parseCookie);
  assert.deepEqual(access, { name: '__Host-msime_at', value: AT, attributes: ['Max-Age=900', 'Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax'] });
  assert.deepEqual(refresh, { name: '__Host-msime_rt', value: RT, attributes: ['Max-Age=2592000', 'Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax'] });
  for (const cookie of cookies) assert.doesNotMatch(cookie, /Domain=/i, '__Host- cookies must not carry a Domain');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('a failed login sets no cookie and passes the backend code on', async t => {
  const { response, cookies } = await run(t, login, browser('/api/auth/login', { method: 'POST', body: { challenge_id: 'c1', credential: 'bad' } }), { 'POST /v1/auth/login': backendError(401, 'invalid_credentials') });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'invalid_credentials' });
  assert.deepEqual(cookies, []);
});

test('login rejects unknown fields and malformed bodies before calling the backend', async t => {
  for (const body of [{ challenge_id: 'c1', credential: 'x', extra: 1 }, { challenge_id: 'c1' }, 'nope']) {
    const { response, calls } = await run(t, login, browser('/api/auth/login', { method: 'POST', body }), {});
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  }
});

test('logout ends the backend session and clears both cookies even when the backend fails', async t => {
  for (const answer of [new Response(null, { status: 204 }), backendError(503, 'auth_unavailable')]) {
    const { response, calls, cookies } = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session: { access: AT, refresh: RT } }), { 'POST /v1/auth/logout': answer });
    assert.equal(response.status, 204);
    assert.equal(calls[0].headers.get('Authorization'), `Bearer ${AT}`);
    assert.deepEqual(calls[0].body, { all: false });
    assert.deepEqual(cookies.map(parseCookie), [
      { name: '__Host-msime_at', value: '', attributes: ['Max-Age=0', 'Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax'] },
      { name: '__Host-msime_rt', value: '', attributes: ['Max-Age=0', 'Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax'] },
    ]);
  }
  const { response, cookies } = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session: { access: AT, refresh: RT } }), {}, { ...ENV, MSIME_API_ORIGIN: 'not a url' });
  assert.equal(response.status, 204, 'an unreachable backend still signs the browser out');
  assert.equal(cookies.length, 2);
});

test('logout with an expired access cookie refreshes first, so the backend session really ends', async t => {
  const { calls } = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session: { refresh: RT } }), { 'POST /v1/auth/refresh': tokens(), 'POST /v1/auth/logout': new Response(null, { status: 204 }) });
  assert.deepEqual(calls.map(call => call.path), ['/v1/auth/refresh', '/v1/auth/logout']);
  assert.equal(calls[1].headers.get('Authorization'), `Bearer ${AT2}`);
});

test('logout whose access token the backend rejects refreshes once and ends the session with the new token', async t => {
  const { response, calls, cookies } = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session: { access: AT, refresh: RT } }), {
    'POST /v1/auth/refresh': tokens(),
    'POST /v1/auth/logout': call => call.headers.get('Authorization') === `Bearer ${AT2}` ? new Response(null, { status: 204 }) : backendError(401, 'invalid_credentials'),
  });
  assert.equal(response.status, 204);
  assert.deepEqual(calls.map(call => `${call.path} ${call.headers.get('Authorization') ?? ''}`), [`/v1/auth/logout Bearer ${AT}`, '/v1/auth/refresh ', `/v1/auth/logout Bearer ${AT2}`]);
  assert.deepEqual(cookies.map(cookie => parseCookie(cookie).attributes[0]), ['Max-Age=0', 'Max-Age=0']);
  // A session the backend no longer knows: the refresh is refused, nothing is retried, and the cookies are still cleared.
  const gone = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session: { access: AT, refresh: RT } }), { 'POST /v1/auth/refresh': backendError(401, 'invalid_credentials'), 'POST /v1/auth/logout': backendError(401, 'invalid_credentials') });
  assert.equal(gone.response.status, 204);
  assert.deepEqual(gone.calls.map(call => call.path), ['/v1/auth/logout', '/v1/auth/refresh']);
  assert.equal(gone.cookies.length, 2);
});

test('logout whose refresh lost a race answers session_retry and keeps the cookies, so the page repeats it with the new ones', async t => {
  for (const session of [{ refresh: RT }, { access: AT, refresh: RT }]) {
    const { response, calls, cookies } = await run(t, logout, browser('/api/auth/logout', { method: 'POST', session }), { 'POST /v1/auth/refresh': backendError(409, 'refresh_superseded'), 'POST /v1/auth/logout': backendError(401, 'invalid_credentials') });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'session_retry' });
    assert.deepEqual(cookies, []);
    assert.equal(calls.at(-1).path, '/v1/auth/refresh');
  }
});

test('only token-shaped values are read from the cookies', () => {
  const request = new Request(SITE, { headers: { Cookie: `${ACCESS_COOKIE}=bad value; ${REFRESH_COOKIE}=${RT}; other=${AT}` } });
  assert.deepEqual(readSession(request), { refresh: RT });
});

// ---- Origin ----

test('every state-changing request must come from the site itself', async t => {
  const cases = [
    [login, '/api/auth/login', { challenge_id: 'c', credential: 'x' }],
    [logout, '/api/auth/logout', undefined],
    [challenge, '/api/auth/challenge', undefined],
    [proxy, '/api/v1/community/resources/7c9e6679-7425-40de-944b-e07fc1f90ae7/save', { saved: true }],
  ];
  for (const [handler, path, body] of cases) {
    for (const origin of ['https://evil.example', 'https://msime.app.evil.example', 'null', '']) {
      const method = path.endsWith('/save') ? 'PUT' : 'POST';
      const { response, calls, cookies } = await run(t, handler, browser(path, { method, body, origin, session: { access: AT, refresh: RT } }), {});
      assert.equal(response.status, 403, `${path} from ${origin || 'no origin'}`);
      assert.equal(calls.length, 0);
      assert.deepEqual(cookies, [], 'a refused request never touches the session');
    }
  }
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const { response } = await run(t, proxy, browser('/api/v1/users/me', { method, origin: 'https://evil.example', session: { access: AT } }), {});
    assert.equal(response.status, 403, method);
  }
});

test('reads need no Origin', async t => {
  const { response } = await run(t, proxy, browser('/api/v1/community/plugins?q=%E7%8C%AB'), { 'GET /v1/community/plugins': Response.json({ plugins: [], has_more: false }) });
  assert.equal(response.status, 200);
});

// ---- allowlist ----

test('the proxy reaches only the user\'s own data and the community catalog', async t => {
  for (const path of ['/v1/users/me', '/v1/users/me/clipboard', '/v1/users/me/dictionaries/pinyin/abc-1', '/v1/community/skins', '/v1/community/candidate-skins/2d605cc4-f16a-4a76-ae93-a24432263eaa/preview']) assert.ok(allowedBackendPath(path), path);
  for (const path of ['/v1/auth/refresh', '/v1/auth/login', '/v1/users/me2', '/v1/users/other', '/v1/users', '/v1/community', '/v1/community/', '/v1/devices', '/v1/admin/users', '/v1/users/me/../../auth/refresh', '/v1/community/..', '/v1/community/%2e%2e/auth', '/v1/community/a%2Fb', '/v1/community//skins', '/v1/users/me/', '/v1/community/skins\\x']) assert.ok(!allowedBackendPath(path), path);
  for (const path of ['/api/v1/auth/refresh', '/api/v1/admin/users', '/api/v1/users/me/%2e%2e/%2e%2e/auth/refresh', '/api/v1/community/a%2F..%2F..%2Fauth']) {
    const { response, calls } = await run(t, proxy, browser(path, { session: { access: AT, refresh: RT } }), {});
    assert.equal(response.status, 404, path);
    assert.equal(calls.length, 0, path);
  }
});

test('the proxy forwards path, query, method and body, with the session as a bearer token', async t => {
  const body = { code: 'nihao', word: '你好', weight: 10, revision: 3 };
  const { response, calls } = await run(t, proxy, browser('/api/v1/users/me/dictionaries/pinyin/abc-1?x=1', { method: 'PUT', body, session: { access: AT, refresh: RT } }), { 'PUT /v1/users/me/dictionaries/pinyin/abc-1': Response.json({ revision: 4 }, { headers: { 'Set-Cookie': 'backend=1', 'Cache-Control': 'public, max-age=60' } }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { revision: 4 });
  assert.equal(response.headers.get('Set-Cookie'), null, 'backend cookies never reach the browser');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const [call] = calls;
  assert.equal(call.method, 'PUT');
  assert.equal(call.search, '?x=1');
  assert.deepEqual(call.body, body);
  assert.equal(call.headers.get('Authorization'), `Bearer ${AT}`);
  assert.equal(call.headers.get('Content-Type'), 'application/json');
  assert.equal(call.headers.get('Cookie'), null, 'the site cookies stay on the site');
  assert.equal(call.redirect, 'manual');
});

test('without a session the community catalog is read anonymously, and backend errors pass through', async t => {
  const { response, calls } = await run(t, proxy, browser('/api/v1/community/resources?kind=reply'), { 'GET /v1/community/resources': backendError(400, 'invalid_fields') });
  assert.equal(calls[0].headers.get('Authorization'), null);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { code: 'invalid_fields', message: 'invalid_fields' } });
});

test('unsupported methods and oversized bodies are refused', async t => {
  assert.equal((await run(t, proxy, browser('/api/v1/community/skins', { method: 'OPTIONS', origin: SITE }), {})).response.status, 405);
  const big = new Request(`${SITE}/api/v1/users/me/clipboard`, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: 'x'.repeat(70_000) });
  const { response, calls } = await run(t, proxy, big, {});
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

test('a body without Content-Length is read only until it passes the limit', async t => {
  let pulled = 0;
  let cancelled = false;
  // 1 KiB chunks for up to 1 MiB, produced only as they are read.
  const stream = new ReadableStream({
    pull(controller) {
      pulled += 1;
      if (pulled > 1024) controller.close();
      else controller.enqueue(new Uint8Array(1024).fill(0x20));
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const chunked = new Request(`${SITE}/api/v1/users/me/clipboard`, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal(chunked.headers.get('Content-Length'), null);
  const { response, calls } = await run(t, proxy, chunked, {});
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
  assert.ok(pulled <= 66, `stopped after ${pulled} KiB`);
  assert.ok(cancelled, 'the rest of the stream is abandoned');
  // A chunked body within the limit is forwarded whole.
  const text = JSON.stringify({ text: 'x'.repeat(5000) });
  const small = new Request(`${SITE}/api/v1/users/me/clipboard`, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: new Blob([text]).stream(), duplex: 'half' });
  const forwarded = await run(t, proxy, small, { 'POST /v1/users/me/clipboard': Response.json({ ok: true }) });
  assert.equal(forwarded.response.status, 200);
  assert.deepEqual(forwarded.calls[0].body, JSON.parse(text));
});

// ---- refresh ----

test('an expired access cookie is refreshed before the call, and both cookies are rewritten', async t => {
  const { response, calls, cookies } = await run(t, proxy, browser('/api/v1/users/me/clipboard', { session: { refresh: RT } }), {
    'POST /v1/auth/refresh': tokens(),
    'GET /v1/users/me/clipboard': call => Response.json({ enabled: true, items: [], auth: call.headers.get('Authorization') }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).auth, `Bearer ${AT2}`);
  assert.deepEqual(calls[0].body, { refresh_token: RT });
  assert.deepEqual(cookies.map(cookie => parseCookie(cookie).value), [AT2, RT2]);
});

test('a backend 401 refreshes and repeats the call once', async t => {
  const { response, calls, cookies } = await run(t, me, browser('/api/me', { session: { access: AT, refresh: RT } }), {
    'POST /v1/auth/refresh': tokens(),
    'GET /v1/users/me': call => call.headers.get('Authorization') === `Bearer ${AT2}` ? Response.json({ user: USER, identities: [] }) : backendError(401, 'invalid_credentials'),
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, USER);
  assert.deepEqual(calls.map(call => call.path), ['/v1/users/me', '/v1/auth/refresh', '/v1/users/me']);
  assert.equal(cookies.length, 2);
});

test('a call that still fails after a refresh is not retried again', async t => {
  const { response, calls } = await run(t, proxy, browser('/api/v1/users/me/clipboard', { session: { access: AT, refresh: RT } }), {
    'POST /v1/auth/refresh': tokens(),
    'GET /v1/users/me/clipboard': backendError(401, 'invalid_credentials'),
  });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 3);
});

test('a refresh that lost a race answers session_retry and keeps the cookies', async t => {
  const { response, cookies, calls } = await run(t, proxy, browser('/api/v1/users/me/clipboard', { session: { refresh: RT } }), { 'POST /v1/auth/refresh': backendError(409, 'refresh_superseded') });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'session_retry' });
  assert.deepEqual(cookies, []);
  assert.equal(calls.length, 1, 'the call itself waits for the retry');
});

test('a refused refresh clears the cookies and answers 401', async t => {
  for (const answer of [backendError(401, 'invalid_credentials'), backendError(409, 'identity_already_linked')]) {
    const { response, cookies } = await run(t, me, browser('/api/me', { session: { refresh: RT } }), { 'POST /v1/auth/refresh': answer });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'session_expired' });
    assert.deepEqual(cookies.map(cookie => parseCookie(cookie).attributes[0]), ['Max-Age=0', 'Max-Age=0']);
  }
});

test('a backend outage after a successful rotation still hands the browser the rotated cookies', async t => {
  // The backend has retired RT the moment it answered the refresh; a browser left with it would replay it and lose the session.
  const unreachable = async () => { throw new TypeError('network'); };
  for (const [session, routes] of [
    [{ refresh: RT }, { 'POST /v1/auth/refresh': tokens(), 'GET /v1/users/me': unreachable }],
    [{ access: AT, refresh: RT }, { 'POST /v1/auth/refresh': tokens(), 'GET /v1/users/me': call => call.headers.get('Authorization') === `Bearer ${AT}` ? backendError(401, 'invalid_credentials') : unreachable() }],
    [{ refresh: RT }, { 'POST /v1/auth/refresh': tokens(), 'GET /v1/users/me': () => new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('reset')); } }), { headers: { 'Content-Type': 'application/json' } }) }],
  ]) {
    const { response, cookies } = await run(t, me, browser('/api/me', { session }), routes);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'auth_unavailable' });
    assert.deepEqual(cookies.map(cookie => parseCookie(cookie).value), [AT2, RT2]);
  }
});

test('a backend outage during refresh is 503 and does not sign the visitor out', async t => {
  const { response, cookies } = await run(t, me, browser('/api/me', { session: { refresh: RT } }), { 'POST /v1/auth/refresh': backendError(503, 'auth_unavailable') });
  assert.equal(response.status, 503);
  assert.deepEqual(cookies, []);
});

test('concurrent requests with the same refresh token share one rotation', async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { calls, fetcher } = backend({
    'POST /v1/auth/refresh': async () => { await gate; return tokens(); },
    'GET /v1/users/me': Response.json({ user: USER, identities: [] }),
  });
  t.mock.method(globalThis, 'fetch', fetcher);
  const first = me({ request: browser('/api/me', { session: { refresh: RT } }), env: ENV });
  const second = me({ request: browser('/api/me', { session: { refresh: RT } }), env: ENV });
  release();
  const responses = await Promise.all([first, second]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.equal(calls.filter(call => call.path === '/v1/auth/refresh').length, 1);
  for (const response of responses) assert.equal(response.headers.getSetCookie().length, 2);
});

test('/api/me without any session cookie answers 401 without calling the backend', async t => {
  const { response, calls } = await run(t, me, browser('/api/me'), {});
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'not_signed_in' });
  assert.equal(calls.length, 0);
});

// ---- proxy headers ----

test('the site-proxy headers are sent only when the secret is configured', async t => {
  const request = () => browser('/api/v1/community/skins', { headers: { 'CF-Connecting-IP': '203.0.113.7' } });
  const routes = { 'GET /v1/community/skins': Response.json({ skins: [], has_more: false }) };
  const without = await run(t, proxy, request(), routes);
  assert.equal(without.calls[0].headers.get('X-MSIME-Site-Proxy'), null);
  assert.equal(without.calls[0].headers.get('X-MSIME-Client-IP'), null);
  const blank = await run(t, proxy, request(), routes, { ...ENV, SITE_PROXY_SECRET: '  ' });
  assert.equal(blank.calls[0].headers.get('X-MSIME-Site-Proxy'), null);
  const configured = await run(t, proxy, request(), routes, { ...ENV, SITE_PROXY_SECRET: 's3cret' });
  assert.equal(configured.calls[0].headers.get('X-MSIME-Site-Proxy'), 's3cret');
  assert.equal(configured.calls[0].headers.get('X-MSIME-Client-IP'), '203.0.113.7');
  const spoofed = await run(t, proxy, browser('/api/v1/community/skins', { headers: { 'X-MSIME-Client-IP': '198.51.100.1', 'X-MSIME-Site-Proxy': 'guess' } }), routes);
  assert.equal(spoofed.calls[0].headers.get('X-MSIME-Client-IP'), null, 'a visitor cannot pass their own proxy headers through');
  assert.equal(spoofed.calls[0].headers.get('X-MSIME-Site-Proxy'), null);
});

test('refresh and login calls carry the proxy headers too', async t => {
  const env = { ...ENV, SITE_PROXY_SECRET: 's3cret' };
  const headers = { 'CF-Connecting-IP': '2001:db8::1' };
  const refreshed = await run(t, me, browser('/api/me', { session: { refresh: RT }, headers }), { 'POST /v1/auth/refresh': tokens(), 'GET /v1/users/me': Response.json({ user: USER, identities: [] }) }, env);
  for (const call of refreshed.calls) assert.equal(call.headers.get('X-MSIME-Client-IP'), '2001:db8::1', call.path);
  const loggedIn = await run(t, login, browser('/api/auth/login', { method: 'POST', body: { challenge_id: 'c', credential: 'x' }, headers }), { 'POST /v1/auth/login': tokens() }, env);
  assert.equal(loggedIn.calls[0].headers.get('X-MSIME-Site-Proxy'), 's3cret');
});

// ---- config and challenge ----

test('the Google client ID is public configuration, null when unset or malformed', async t => {
  assert.deepEqual(await (await authConfig({ request: browser('/api/auth/config'), env: ENV })).json(), { google_client_id: CLIENT_ID });
  for (const value of [undefined, '', 'not-a-client-id', `${CLIENT_ID}<script>`]) assert.deepEqual(await (await authConfig({ request: browser('/api/auth/config'), env: { GOOGLE_WEB_CLIENT_ID: value } })).json(), { google_client_id: null });
  const { response } = await run(t, challenge, browser('/api/auth/challenge', { method: 'POST' }), {}, { MSIME_API_ORIGIN: API });
  assert.equal(response.status, 503, 'no challenge without a Google client');
});

test('the challenge asks the backend for a Google nonce and returns only the id and nonce', async t => {
  const { response, calls } = await run(t, challenge, browser('/api/auth/challenge', { method: 'POST' }), { 'POST /v1/auth/challenges': Response.json({ challenge_id: 'c1', nonce: 'n1', expires_in: 300 }, { status: 201 }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { challenge_id: 'c1', nonce: 'n1' });
  assert.deepEqual(calls[0].body, { provider: 'google' });
});

test('Pages routes the account endpoints to their Functions', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url), 'utf8')).include;
  for (const path of ['/api/auth/*', '/api/me', '/api/v1/*']) assert.ok(routes.includes(path), path);
});
