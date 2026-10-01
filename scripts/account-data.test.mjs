import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { accountCall, ApiError, authConfigQuery, isSignedOut, meQuery, patchCommunityItem, pluginsQuery, resourcesQuery, SESSION_RETRY_DELAYS_MS, v1CandidateSkinsQuery, v1KeyboardSkinsQuery, webLoginAvailable } from '../src/data/account.ts';

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

test('a reaction is written into every cached list row of the item, including the favourites, and nowhere else', () => {
  const client = new QueryClient();
  const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const OTHER = '2d605cc4-f16a-4a76-ae93-a24432263eaa';
  const row = (id, extra = {}) => ({ id, name: id, rating_count: 1, rating_average: 3, my_rating: 0, saved: false, saves: 0, ...extra });
  const pages = (...items) => ({ pages: [{ items: [row(OTHER)], nextOffset: 20 }, { items, nextOffset: null }], pageParams: [0, 20] });
  const lists = {
    keyboardGallery: v1KeyboardSkinsQuery('').queryKey,
    keyboardSaved: v1KeyboardSkinsQuery('', 'saved').queryKey,
    candidateGallery: v1CandidateSkinsQuery('猫', 'nature').queryKey,
    pluginGallery: pluginsQuery('', undefined, '', true).queryKey,
    pluginSaved: pluginsQuery('', undefined, 'saved', true).queryKey,
    pluginAnonymous: pluginsQuery('', undefined, '', false).queryKey,
    dictionaryGallery: resourcesQuery('dictionary', '', '', true).queryKey,
    replySaved: resourcesQuery('reply', '', 'saved', true).queryKey,
  };
  for (const key of Object.values(lists)) client.setQueryData(key, pages(row(ID)));
  const rowOf = key => client.getQueryData(key).pages[1].items[0];

  patchCommunityItem(client, 'plugin', ID, { saved: true, saves: 1 });
  assert.deepEqual(rowOf(lists.pluginGallery), row(ID, { saved: true, saves: 1 }));
  assert.deepEqual(rowOf(lists.pluginSaved), row(ID, { saved: true, saves: 1 }), 'the /me/ favourites list too');
  assert.deepEqual(rowOf(lists.pluginAnonymous), row(ID), 'the anonymous list describes nobody\'s reactions');
  assert.deepEqual(rowOf(lists.keyboardGallery), row(ID), 'another collection with the same id is untouched');

  patchCommunityItem(client, 'keyboard', ID, { my_rating: 5, rating_count: 2, rating_average: 4 });
  assert.equal(rowOf(lists.keyboardGallery).my_rating, 5);
  assert.equal(rowOf(lists.keyboardSaved).rating_average, 4);
  assert.equal(rowOf(lists.candidateGallery).my_rating, 0, 'candidate skins are their own collection');
  patchCommunityItem(client, 'candidate', ID, { my_rating: 2, rating_count: 2, rating_average: 2.5 });
  assert.equal(rowOf(lists.candidateGallery).my_rating, 2);

  patchCommunityItem(client, 'resource', ID, { saved: true });
  assert.equal(rowOf(lists.dictionaryGallery).saved, true);
  assert.equal(rowOf(lists.replySaved).saved, true, 'word packs and reply templates are one collection');
  assert.deepEqual(client.getQueryData(lists.dictionaryGallery).pages[0].items, [row(OTHER)], 'other rows keep their values');

  const before = client.getQueryData(lists.pluginGallery);
  patchCommunityItem(client, 'plugin', 'ea041e49-e1ab-48ff-8b06-942ec9c291b9', { saved: true });
  assert.equal(client.getQueryData(lists.pluginGallery), before, 'a list without the item keeps its identity, so nothing re-renders');
});

test('web sign-in is offered only when the site has a Google client, and unknown until the config answers', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ google_client_id: null }));
  const client = new QueryClient();
  const config = await client.fetchQuery(authConfigQuery());
  assert.deepEqual(config, { google_client_id: null });
  assert.equal(webLoginAvailable(config, false), false, 'no client: no 登录');
  assert.equal(webLoginAvailable({ google_client_id: 'id.apps.googleusercontent.com' }, false), true);
  assert.equal(webLoginAvailable(undefined, false), undefined, 'still asking');
  assert.equal(webLoginAvailable(undefined, true), true, 'a failed read keeps 登录, whose dialog explains the failure');
});
