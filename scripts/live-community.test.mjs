import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedCommunity, loadCommunity } from '../shared/live-community.ts';

const fallback = { generatedAt: '2026-09-01T00:00:00Z', totalStars: 1, repoCount: 1, starHistory: [{ month: '2026-09', stars: 1 }], contributors: [{ login: 'human', avatarUrl: 'https://avatars.githubusercontent.com/u/1', url: 'https://github.com/human', contributions: 1, repos: 1 }] };
const memoryCache = () => {
  let stored;
  return { match: async () => stored?.clone(), put: async (_, value) => { stored = value; } };
};
test('cache refresh is shared, reused for ten minutes and failure keeps its original timestamp', async () => {
  const cache = memoryCache();
  const key = new Request('https://msime.app/api/community');
  let calls = 0;
  const load = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return { ...fallback, stale: false }; };
  await Promise.all([cachedCommunity(key, cache, load, fallback), cachedCommunity(key, cache, load, fallback)]);
  assert.equal(calls, 1);
  await cachedCommunity(key, cache, load, fallback);
  assert.equal(calls, 1);
  await cache.put(key, Response.json({ checkedAt: 0, data: fallback }));
  const failed = await cachedCommunity(key, cache, async () => { throw new Error('rate limited'); }, fallback);
  assert.equal(failed.stale, true);
  assert.equal(failed.generatedAt, fallback.generatedAt);
  await cachedCommunity(key, cache, load, fallback);
  assert.equal(calls, 1, 'failures also back off for the whole window');
});
test('an expired entry answers immediately while the refresh runs behind the response', async () => {
  const cache = memoryCache();
  const key = new Request('https://msime.app/api/community');
  const background = [];
  const refreshed = { ...fallback, generatedAt: '2026-09-02T00:00:00Z', totalStars: 2, stale: false };
  let calls = 0;
  const load = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return refreshed; };
  await cache.put(key, Response.json({ checkedAt: 0, data: fallback }));
  const served = await cachedCommunity(key, cache, load, fallback, task => background.push(task));
  assert.equal(served.totalStars, fallback.totalStars, 'the expired entry is served without waiting for GitHub');
  assert.equal(background.length, 1);
  await Promise.all(background);
  assert.equal((await cachedCommunity(key, cache, load, fallback, task => background.push(task))).totalStars, 2);
  assert.equal(calls, 1, 'the refreshed entry counts as fresh for the next minute');
});
test('a cold cache answers from the shipped snapshot rather than holding the request open', async () => {
  const cache = memoryCache();
  const key = new Request('https://msime.app/api/community');
  const background = [];
  const collect = task => background.push(task);
  const live = { ...fallback, generatedAt: '2026-09-03T00:00:00Z', totalStars: 3, stale: false };
  const first = await cachedCommunity(key, cache, async () => live, fallback, collect);
  assert.equal(first.totalStars, fallback.totalStars, 'the snapshot answers now and the sweep runs behind it');
  assert.equal(background.length, 1);
  await Promise.all(background);
  assert.equal((await cachedCommunity(key, cache, async () => live, fallback, collect)).totalStars, 3);
});
test('one lower reading is held back, the same reading twice is published', async () => {
  const cache = memoryCache();
  const key = new Request('https://msime.app/api/community');
  const high = { ...fallback, totalStars: 10, starHistory: [{ month: '2026-09', stars: 10 }], contributors: [{ ...fallback.contributors[0], contributions: 1627 }], stale: false };
  const lower = { ...high, contributors: [{ ...high.contributors[0], contributions: 1625 }] };
  const expire = async () => {
    const stored = await (await cache.match(key)).json();
    await cache.put(key, Response.json({ ...stored, checkedAt: 0 }));
    return stored;
  };

  await cache.put(key, Response.json({ checkedAt: 0, data: high }));
  const held = await cachedCommunity(key, cache, async () => lower, fallback);
  assert.equal(held.contributors[0].contributions, 1627, 'a replica disagreeing by two commits does not move the published number');
  assert.equal((await expire()).unconfirmed.contributors[0].contributions, 1625, 'the rejected reading is remembered');

  const published = await cachedCommunity(key, cache, async () => lower, fallback);
  assert.equal(published.contributors[0].contributions, 1625, 'a decrease that reads the same way twice is real and is published');
  assert.equal((await expire()).unconfirmed, undefined);

  const climbing = { ...high, totalStars: 11, starHistory: [{ month: '2026-09', stars: 11 }] };
  assert.equal((await cachedCommunity(key, cache, async () => climbing, fallback)).totalStars, 11, 'an increase is never delayed');
});
test('live collection follows pagination, excludes forks and does not hide contributor failures', async () => {
  const urls = [];
  const request = async (url, options) => {
    urls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer test');
    if (url.includes('/orgs/')) return Response.json([{ name: 'repo', fork: false, private: false, archived: false, stargazers_count: 2 }, { name: 'fork', fork: true, private: false, archived: false, stargazers_count: 100 }]);
    if (url.includes('/contributors')) return Response.json([{ login: 'human', type: 'User', avatar_url: fallback.contributors[0].avatarUrl, html_url: fallback.contributors[0].url, contributions: 4 }]);
    assert.ok(url.includes('/stargazers/history?per_page=30'));
    return Response.json([{ week: 1788048000, days: [0, 0, 1, 0, 0, 0, 0] }], { headers: url.includes('page=2') ? {} : { link: '<https://api.github.com/example>; rel="next"' } });
  };
  const result = await loadCommunity('test', request);
  assert.equal(result.totalStars, 2);
  assert.equal(result.repoCount, 1);
  assert.equal(result.contributors[0].contributions, 4);
  assert.equal(result.starHistory.at(-1).stars, 2);
  assert.equal(urls.length, 4);
  await assert.rejects(loadCommunity('test', async (url, options) => url.includes('/contributors') ? new Response(null, { status: 403 }) : request(url, options)), /unavailable/);
});
test('endless pagination is rejected per path instead of silently publishing partial totals', async () => {
  let calls = 0;
  await assert.rejects(loadCommunity('test', async () => {
    calls++;
    return Response.json([], { headers: { link: '<https://api.github.com/example>; rel="next"' } });
  }), /Pagination did not terminate/);
  // Per path, so adding repositories or another thirty weeks of star history cannot push a healthy sweep over the edge the way one shared budget did.
  assert.equal(calls, 30);
});
test('live collection adds per-repository star series and the 30-day gain without extra calls', async () => {
  const now = Math.floor(Date.now() / 1000);
  const recentWeek = now - (now % 86400) - 6 * 86400;
  const urls = [];
  const request = async url => {
    urls.push(url);
    if (url.includes('/orgs/')) return Response.json([{ name: 'small', fork: false, private: false, archived: false, stargazers_count: 1 }, { name: 'big', fork: false, private: false, archived: false, stargazers_count: 5 }, { name: 'none', fork: false, private: false, archived: false, stargazers_count: 0 }]);
    if (url.includes('/contributors')) return Response.json([{ login: 'human', type: 'User', avatar_url: fallback.contributors[0].avatarUrl, html_url: fallback.contributors[0].url, contributions: 1 }]);
    if (url.includes('/big/')) return Response.json([{ week: recentWeek - 400 * 86400, days: [2, 0, 0, 0, 0, 0, 0] }, { week: recentWeek, days: [3, 0, 0, 0, 0, 0, 0] }]);
    return Response.json([{ week: recentWeek, days: [1, 0, 0, 0, 0, 0, 0] }]);
  };
  const result = await loadCommunity('test', request);
  assert.deepEqual(result.starSeries.map(series => series.repo), ['big', 'small'], 'ordered by stars, repositories without stars left out');
  assert.equal(result.starSeries[0].points.at(-1).stars, 5);
  assert.equal(result.starSeries[0].points.at(-1).date, new Date().toISOString().slice(0, 10), 'the last point is dated today');
  assert.ok(result.starSeries[0].points.every((point, index, points) => index === 0 || point.date > points[index - 1].date));
  assert.equal(result.starDelta30d, 4);
  assert.equal(urls.length, 1 + 3 + 2, 'one organisation call, contributors per repository, history per starred repository');
});
