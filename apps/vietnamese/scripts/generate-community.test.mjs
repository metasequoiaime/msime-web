import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateContributors, monthlyStarHistory } from './generate-community.mjs';
import { EXCLUDED_REPOSITORIES } from '../shared/community-aggregation.mjs';

/** GitHub reports each bucket as the Unix second its week starts on. */
const week = day => Date.parse(`${day}T00:00:00Z`) / 1000;

test('contributions are summed across repositories and bots are left out', () => {
  const ranked = aggregateContributors([
    {
      repo: 'MSIME-Windows',
      contributors: [
        { login: 'alice', type: 'User', contributions: 100, avatar_url: 'a', html_url: 'ua' },
        { login: 'github-actions[bot]', type: 'Bot', contributions: 900, avatar_url: 'b', html_url: 'ub' },
        { login: 'bob', type: 'User', contributions: 40, avatar_url: 'c', html_url: 'uc' },
      ],
    },
    {
      repo: 'MSIME-Engine',
      contributors: [
        { login: 'bob', type: 'User', contributions: 90, avatar_url: 'c', html_url: 'uc' },
        { login: 'dependabot[bot]', type: 'User', contributions: 500, avatar_url: 'd', html_url: 'ud' },
      ],
    },
  ]);

  assert.deepEqual(ranked.map(entry => entry.login), ['bob', 'alice']);
  assert.equal(ranked[0].contributions, 130);
  assert.equal(ranked[0].repos, 2);
  assert.equal(ranked[1].repos, 1);
});

test('a bot named like a person is still excluded by its account type', () => {
  const ranked = aggregateContributors([
    { repo: 'r', contributors: [{ login: 'renovate', type: 'Bot', contributions: 999 }] },
  ]);
  assert.deepEqual(ranked, []);
});

test('the ranking is capped and ties break on login so the output is stable', () => {
  const contributors = ['dave', 'carol', 'erin'].map(login => ({ login, type: 'User', contributions: 5 }));
  const ranked = aggregateContributors([{ repo: 'r', contributors }], 2);
  assert.deepEqual(ranked.map(entry => entry.login), ['carol', 'dave']);
});

test('star history accumulates by month and keeps quiet months as plateaus', () => {
  const series = monthlyStarHistory([
    { week: week('2026-01-04'), days: [0, 0, 1, 0, 0, 0, 0] },
    { week: week('2026-01-18'), days: [1, 0, 0, 0, 0, 0, 0] },
    { week: week('2026-02-01'), days: [0, 0, 0, 0, 0, 0, 0] },
    { week: week('2026-03-01'), days: [0, 1, 0, 0, 0, 0, 0] },
  ]);

  const upToMarch = series.slice(0, 3);
  assert.deepEqual(upToMarch, [
    { month: '2026-01', stars: 2 },
    { month: '2026-02', stars: 2 },
    { month: '2026-03', stars: 3 },
  ]);
  // The series runs to the current month, so it never stops short of today.
  assert.ok(series.length >= 3);
  // Cumulative means it can never go down.
  for (let i = 1; i < series.length; i += 1) assert.ok(series[i].stars >= series[i - 1].stars);
});

test('a week straddling a month boundary splits its stars, and empty weeks still anchor the start', () => {
  // GitHub reports every week since the repository was created, so the first bucket is usually empty. The series has to start there rather than at the first star, because the worker starts there too and the home page hydrates one over the other.
  const series = monthlyStarHistory([
    { week: week('2025-12-28'), days: [0, 0, 0, 0, 0, 0, 0] },
    { week: week('2026-01-28'), days: [1, 0, 0, 0, 2, 0, 0] },
  ]);

  assert.deepEqual(series.slice(0, 3), [
    { month: '2025-12', stars: 0 },
    { month: '2026-01', stars: 1 },
    { month: '2026-02', stars: 3 },
  ]);
});

test('no history at all produces no series rather than a run of empty months', () => {
  assert.deepEqual(monthlyStarHistory([]), []);
});

test('the community exclusion list covers organisation files, distribution, skins, and prototypes', () => {
  assert.deepEqual([...EXCLUDED_REPOSITORIES], ['.github', 'homebrew-tap', 'msime-skin-example', 'msime-skins', 'pinyin_cpp', 'pinyin_python']);
});
