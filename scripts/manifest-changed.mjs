import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Decide whether a regenerated manifest is worth proposing.
 *
 * `generatedAt` moves on every run, so a manifest rebuilt from upstream data that has not changed
 * still looks different to `git diff`. Nineteen of the twenty commits on main before this landed were
 * exactly that: a pull request, a full CI run and a production deploy, to move one timestamp forward.
 * At a daily cron that is merely noise; at the half-hourly one the community snapshot now runs on it
 * would be forty-eight empty commits a day.
 *
 * The timestamp still ships. It just stops being a reason to deploy on its own, which means the
 * displayed 数据获取时间 is when the published numbers were actually read, not when they were last
 * confirmed unchanged.
 */
export function differsBeyondTimestamp(previous, next) {
  const strip = (value) => {
    const { generatedAt, ...rest } = JSON.parse(value);
    // 统计查询时间也会每轮改变，只有计数变化才需要发布新的下载清单。
    if (rest.mirrorDownloadStats) delete rest.mirrorDownloadStats.generatedAt;
    if (rest.pgyerDownloadStats) delete rest.pgyerDownloadStats.generatedAt;
    return JSON.stringify(rest);
  };
  // A missing or unparseable side is a change worth proposing, not a reason to swallow the run.
  try {
    return strip(previous) !== strip(next);
  } catch {
    return true;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: manifest-changed.mjs <path>');
  // The answer goes to stdout rather than the exit code, so that a crash here -- an unwritten
  // manifest, a broken checkout -- fails the step instead of being read as "nothing changed" and
  // quietly skipping the deploy.
  const next = readFileSync(file, 'utf8');
  let previous = '';
  // Not tracked in HEAD yet: that is a new manifest, so it counts as changed.
  try { previous = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }); } catch { previous = ''; }
  process.stdout.write(differsBeyondTimestamp(previous, next) ? 'true' : 'false');
}
