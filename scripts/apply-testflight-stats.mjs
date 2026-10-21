import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseTestFlightStats } from '../shared/testflight-stats.ts';

/** 失败、重复和迟到事件都不覆盖现有数字；只比较有意义的汇总内容。 */
export function nextSnapshot(event, previous, now = Date.now()) {
  if (event.action !== 'testflight-stats-v1') throw new Error('Unexpected TestFlight event');
  const next = parseTestFlightStats(event.client_payload);
  if (!next || Date.parse(next.generatedAt) > now + 300000) throw new Error('Invalid TestFlight event timestamp');
  const old = parseTestFlightStats(previous);
  if (old && Date.parse(next.generatedAt) <= Date.parse(old.generatedAt)) return old;
  if (old && ['installs', 'buildCount', 'periodStart', 'periodEnd'].every(key => next[key] === old[key])) return old;
  return next;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = new URL('../public/testflight-stats.json', import.meta.url);
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const previous = JSON.parse(await readFile(path, 'utf8'));
  const next = nextSnapshot(event, previous);
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
}
