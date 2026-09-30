import { z } from "zod";
import { communitySchema } from "../src/community-data.ts";
import { aggregateContributors, monthlyStarHistory, recentStars, repositoryStarSeries, type StarWeek } from "./community-aggregation.mjs";

const repositorySchema = z.object({ name: z.string().regex(/^[\w.-]+$/), fork: z.boolean(), archived: z.boolean(), private: z.boolean(), stargazers_count: z.number().int().nonnegative() });
const contributorSchema = z.object({ login: z.string(), type: z.string(), avatar_url: z.string(), html_url: z.string(), contributions: z.number().int().nonnegative() });

export async function loadCommunity(token: string, request: typeof fetch = fetch) {
  const signal = AbortSignal.timeout(25_000);
  async function pages(path: string, perPage = 100): Promise<unknown[]> {
    const result: unknown[] = [];
    for (let page = 1; ; page++) {
      // A cap per path, not one budget for the whole sweep. The shared budget of 45 was already two thirds spent by thirteen repositories, and `stargazers/history` ignores `per_page` and gains a page every thirty weeks, so the sweep would have grown into the ceiling and started failing outright inside a year.
      if (page > 30) throw new Error(`Pagination did not terminate for ${path}`);
      const response = await request(`https://api.github.com/${path}${path.includes("?") ? "&" : "?"}per_page=${perPage}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "MSIME-Web-community", "X-GitHub-Api-Version": "2026-03-10" }, signal,
      });
      if (response.status === 204) return result;
      if (!response.ok) throw new Error(`GitHub statistics unavailable: HTTP ${response.status} (${path})`);
      const batch = z.array(z.unknown()).parse(await response.json());
      result.push(...batch);
      if (!response.headers.get("link")?.includes('rel="next"')) return result;
    }
  }
  const repositories = z.array(repositorySchema).parse(await pages("orgs/metasequoiaime/repos?sort=full_name"))
    .filter(repo => !repo.fork && !repo.archived && !repo.private);
  const perRepository = [];
  const starWeeks: StarWeek[] = [];
  const starSeries: { repo: string; stars: number; points: { date: string; stars: number }[] }[] = [];
  // Sequential calls respect GitHub's secondary rate limit and bound open connections.
  for (const repo of repositories) {
    const base = `repos/metasequoiaime/${repo.name}`;
    const contributors = z.array(contributorSchema).parse(await pages(`${base}/contributors`));
    perRepository.push({ repo: repo.name, contributors });
    if (repo.stargazers_count) {
      // GitHub restricts individual stargazer lists; aggregate history is public.
      const weeks = z.array(z.object({ week: z.number().int(), days: z.array(z.number().int().nonnegative()).length(7) })).parse(await pages(`${base}/stargazers/history`, 30));
      starWeeks.push(...weeks);
      // The same weeks bucketed per repository: no extra GitHub calls, since the history endpoint is already read one repository at a time.
      const points = repositoryStarSeries(weeks);
      if (points.length) starSeries.push({ repo: repo.name, stars: repo.stargazers_count, points });
    }
  }
  return communitySchema.parse({ generatedAt: new Date().toISOString(), stale: false,
    totalStars: repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0), repoCount: repositories.length,
    contributors: aggregateContributors(perRepository), starHistory: monthlyStarHistory(starWeeks),
    starSeries: starSeries.sort((left, right) => right.stars - left.stars || left.repo.localeCompare(right.repo)).map(({ repo, points }) => ({ repo, points })),
    starDelta30d: recentStars(starWeeks),
  });
}

type Community = z.infer<typeof communitySchema>;
type Entry = { checkedAt: number; data: Community; unconfirmed?: Community };
type Settled = { data: Community; unconfirmed?: Community };

/** One sweep costs around thirty sequential GitHub calls and ten seconds. Reusing it for ten minutes keeps the installation token's hourly allowance clear however many edge locations are warm; at the previous one minute, three busy locations alone would have spent it. */
const freshFor = 600_000;
const pending = new Map<string, Promise<Community>>();

// GitHub answers contributor and star counts from replicas that disagree with each other by a commit or two: polling from the edge saw one contributor's total read 1,627, then 1,625, then 1,627 again within four minutes, while the same repositories read from a single client stayed flat across twelve rounds. Someone dropping out of the top twelve is not a decrease, so only logins present in both are compared.
function decreased(previous: Community, next: Community) {
  if (next.totalStars < previous.totalStars) return true;
  if ((next.starHistory.at(-1)?.stars ?? 0) < (previous.starHistory.at(-1)?.stars ?? 0)) return true;
  const before = new Map(previous.contributors.map(person => [person.login, person.contributions]));
  return next.contributors.some(person => person.contributions < (before.get(person.login) ?? 0));
}

function settle(entry: Entry | undefined, next: Community): Settled {
  if (!entry || !decreased(entry.data, next)) return { data: next };
  // A decrease has to turn up twice before it is published, so a replica's stale reading never shows as the numbers going backwards. A force-push or an unstar is a real decrease, reads the same way twice, and lands one refresh later.
  if (entry.unconfirmed && !decreased(entry.unconfirmed, next)) return { data: next };
  return { data: entry.data, unconfirmed: next };
}

function refreshCommunity(key: Request, cache: Cache, load: () => Promise<Community>, entry: Entry | undefined, fallback: Community): Promise<Community> {
  const existing = pending.get(key.url);
  if (existing) return existing;
  const refresh = (async () => {
    let settled: Settled;
    try { settled = settle(entry, await load()); }
    catch { settled = { data: { ...(entry?.data ?? fallback), stale: true } }; }
    await cache.put(key, Response.json({ checkedAt: Date.now(), ...settled }, { headers: { "Cache-Control": "max-age=86400" } }));
    return settled.data;
  })();
  pending.set(key.url, refresh);
  // Clearing in `finally` rather than around an await keeps the entry alive for the whole background refresh, so concurrent requests still collapse onto it. The derived promise gets its own catch because a rejected `cache.put` would otherwise land as an unhandled rejection; the caller still sees the rejection through `refresh` itself.
  refresh.finally(() => { if (pending.get(key.url) === refresh) pending.delete(key.url); }).catch(() => {});
  return refresh;
}

export async function cachedCommunity(key: Request, cache: Cache, load: () => Promise<Community>, fallback: Community, background?: (task: Promise<unknown>) => void): Promise<Community> {
  const hit = await cache.match(key);
  const entry = hit ? await hit.json() as Entry : undefined;
  if (entry && Date.now() - entry.checkedAt < freshFor) return entry.data;
  const refresh = refreshCommunity(key, cache, load, entry, fallback);
  // Nobody waits on GitHub. An expired entry answers from cache, and a cold one answers from the snapshot this worker shipped with, which a daily workflow keeps within a day of live. Callers without a background hook — the tests, and any caller that has nowhere to park the work — still wait.
  if (background) {
    background(refresh);
    return entry?.data ?? fallback;
  }
  return refresh;
}
