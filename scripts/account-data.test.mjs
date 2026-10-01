import test from 'node:test';
import assert from 'node:assert/strict';
import { accountCall, ApiError, isSignedOut, meQuery, SESSION_RETRY_DELAYS_MS } from '../src/data/account.ts';

const USER = { id: 'u1', display_name: '水杉小鹿', created_at: '2026-10-01T00:00:00Z' };
const retry = () => Response.json({ error: 'session_retry' }, { status: 401 });
const identity = value => value;

/** Answers each fetch with the next of `answers` and records when it was made, on mocked timers so the waits cost nothing. */
const sequence = (t, answers) => {
  const times = [];
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.mock.method(globalThis, 'fetch', async () => {
    times.push(Date.now());
    return answers.shift()();
  });
  return times;
};

/** Settles `promise` while advancing the mocked clock one pending timer at a time. */
const drive = async (t, promise) => {
  let settled = false;
  const result = promise.finally(() => { settled = true; });
  result.catch(() => {});
  while (!settled) {
    await new Promise(resolve => setImmediate(resolve));
    if (!settled) t.mock.timers.runAll();
  }
  return result;
};

test('only a 401 other than session_retry signs the page out', () => {
  assert.equal(isSignedOut(401, 'session_expired'), true);
  assert.equal(isSignedOut(401, 'not_signed_in'), true);
  assert.equal(isSignedOut(401, 'session_retry'), false);
  assert.equal(isSignedOut(503, 'auth_unavailable'), false);
  assert.equal(isSignedOut(403, 'forbidden_origin'), false);
});

test('session_retry is repeated with growing waits that stay well inside the backend\'s 30-second grace', async t => {
  const total = SESSION_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0);
  assert.ok(SESSION_RETRY_DELAYS_MS.length >= 3, 'more than one repeat');
  assert.ok(total <= 10_000, `${total} ms in all`);
  for (const [index, delay] of SESSION_RETRY_DELAYS_MS.entries()) if (index) assert.ok(delay > SESSION_RETRY_DELAYS_MS[index - 1]);
  const times = sequence(t, [retry, retry, retry, () => Response.json({ ok: true })]);
  assert.deepEqual(await drive(t, accountCall('/api/v1/users/me/clipboard', identity)), { ok: true });
  assert.deepEqual(times.slice(1).map((time, index) => time - times[index]), SESSION_RETRY_DELAYS_MS.slice(0, 3));
});

test('a session_retry that outlasts every repeat rejects without signing out, and /api/me does not read it as signed out', async t => {
  sequence(t, Array.from({ length: SESSION_RETRY_DELAYS_MS.length + 1 }, () => retry));
  await assert.rejects(drive(t, accountCall('/api/v1/users/me/clipboard', identity)), error => error instanceof ApiError && error.status === 401 && error.code === 'session_retry');
  t.mock.reset();
  sequence(t, Array.from({ length: SESSION_RETRY_DELAYS_MS.length + 1 }, () => retry));
  const me = meQuery();
  await assert.rejects(drive(t, me.queryFn({ signal: new AbortController().signal, queryKey: me.queryKey })), error => error.code === 'session_retry');
});

test('/api/me reads a real 401 as signed out and a session as the user', async t => {
  const me = meQuery();
  const call = () => me.queryFn({ signal: new AbortController().signal, queryKey: me.queryKey });
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'session_expired' }, { status: 401 }));
  assert.equal(await call(), null);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ user: USER, identities: [{ provider: 'google' }] }));
  assert.deepEqual((await call()).user, USER);
});
