import { writeFile } from 'node:fs/promises';

// Optional static fallback for SSR and API outages. Live statistics use /api/community.
const organisation = 'metasequoiaime';

import { aggregateContributors, monthlyStarHistory, recentStars, repositoryStarSeries } from '../shared/community-aggregation.mjs';
export { aggregateContributors, monthlyStarHistory, recentStars, repositoryStarSeries } from '../shared/community-aggregation.mjs';

const headers = () => {
  const value = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) value.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  return value;
};

async function getPage(url) {
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(30000) });
  // An empty repository answers 204 with no body. That is a repository with no contributors, not a failure, and it is the only failure-shaped response worth swallowing: a blanket catch here would write a snapshot with a contributor silently missing from the ranking.
  if (response.status === 204) return { batch: [], next: false };
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return { batch: await response.json(), next: response.headers.get('link')?.includes('rel="next"') ?? false };
}

/** Follow `rel="next"` rather than stopping at the first short page: `/stargazers/history` sets its own page length, so a page below the requested size is not evidence of the end. */
async function getAllPages(url, perPage = 100) {
  const collected = [];
  for (let page = 1; page <= 60; page += 1) {
    const { batch, next } = await getPage(`${url}${url.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`);
    if (!Array.isArray(batch)) break;
    collected.push(...batch);
    if (!next) return collected;
  }
  throw new Error(`Pagination did not terminate for ${url}`);
}

async function main() {
  const repositories = (await getAllPages(`https://api.github.com/orgs/${organisation}/repos?sort=full_name`))
    .filter(repo => !repo.fork && !repo.archived && !repo.private);

  const starWeeks = [];
  const starSeries = [];
  const perRepository = [];

  for (const repo of repositories) {
    const contributors = await getAllPages(`https://api.github.com/repos/${organisation}/${repo.name}/contributors`);
    perRepository.push({ repo: repo.name, contributors });

    if (repo.stargazers_count > 0) {
      // The aggregate weekly history, not `/stargazers`: listing individual stargazers is restricted, and answers 403 to the `GITHUB_TOKEN` this job runs under. The worker reads the same endpoint, so both produce the same series.
      const weeks = await getAllPages(`https://api.github.com/repos/${organisation}/${repo.name}/stargazers/history`, 30);
      starWeeks.push(...weeks);
      // Per-repository curves for the home chart, from the same weeks: the same shape and order /api/community returns, so the chart looks the same whichever source answered.
      const points = repositoryStarSeries(weeks);
      if (points.length) starSeries.push({ repo: repo.name, stars: repo.stargazers_count, points });
    }
  }

  const community = {
    generatedAt: new Date().toISOString(),
    totalStars: repositories.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0),
    repoCount: repositories.length,
    starHistory: monthlyStarHistory(starWeeks),
    starSeries: starSeries
      .sort((left, right) => right.stars - left.stars || left.repo.localeCompare(right.repo))
      .map(({ repo, points }) => ({ repo, points })),
    starDelta30d: recentStars(starWeeks),
    contributors: aggregateContributors(perRepository),
  };

  if (!community.starHistory.length || !community.contributors.length)
    throw new Error('Refusing to write an empty community snapshot');

  await writeFile(new URL('../public/community.json', import.meta.url), `${JSON.stringify(community, null, 2)}\n`);
  console.log(`Generated community snapshot: ${community.totalStars} stars, ${community.contributors.length} contributors`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
