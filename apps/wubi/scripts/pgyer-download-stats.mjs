import { createHash } from 'node:crypto';
import { pgyerDownloadStatsSchema } from '../shared/pgyer-download-stats.ts';

const integer = value => {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Invalid Pgyer counter');
  return number;
};

/** 按版本保留已知最高值，版本删除、计数回退和重复同步都不抹去已经读取的历史。 */
export function pgyerSnapshot(builds, previous, generatedAt = new Date().toISOString()) {
  const history = new Map(pgyerDownloadStatsSchema.optional().parse(previous)?.builds.map(build => [build.id, build.downloads]));
  for (const build of builds) {
    if (String(build.buildType) !== '2' || typeof build.buildKey !== 'string' || !build.buildKey) throw new Error('Invalid Pgyer Android build');
    const id = createHash('sha256').update(build.buildKey).digest('hex');
    const downloads = integer(build.buildDownloadCount);
    history.set(id, Math.max(history.get(id) ?? 0, downloads));
  }
  const saved = [...history].sort(([a], [b]) => a.localeCompare(b)).map(([id, downloads]) => ({ id, downloads }));
  return pgyerDownloadStatsSchema.parse({ generatedAt, total: saved.reduce((sum, build) => sum + build.downloads, 0), builds: saved });
}

/** 只访问官方只读接口；错误不附带响应正文，避免应用详情或凭据进入日志。 */
export async function loadPgyerDownloadStats(apiKey, previous, request = fetch) {
  if (!apiKey) throw new Error('Missing Pgyer API key');
  const call = async (route, params) => {
    const response = await request(`https://www.pgyer.com/apiv2/app/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _api_key: apiKey, ...params }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Pgyer unavailable: HTTP ${response.status}`);
    const value = await response.json();
    if (value.code !== 0 || !value.data) throw new Error('Pgyer rejected statistics request');
    return value.data;
  };
  const shortcut = await call('getByShortcut', { buildShortcutUrl: 'msime' });
  if (shortcut.buildShortcutUrl !== 'msime' || String(shortcut.buildType) !== '2' || !shortcut.buildKey) throw new Error('Unexpected Pgyer app');
  let appKey;
  for (let page = 1; ; page += 1) {
    const data = await call('listMy', { page: String(page) });
    if (!Array.isArray(data.list) || integer(data.page) !== page || integer(data.pageCount) < page) throw new Error('Invalid Pgyer app pagination');
    appKey = data.list.find(app => app.buildKey === shortcut.buildKey && String(app.buildType) === '2')?.appKey;
    if (appKey || page === integer(data.pageCount)) break;
  }
  if (typeof appKey !== 'string' || !appKey) throw new Error('Pgyer Android app not found');
  const builds = [];
  for (let page = 1; ; page += 1) {
    const data = await call('builds', { appKey, page: String(page) });
    if (!Array.isArray(data.list) || integer(data.currentPage) !== page || integer(data.pageCount) < page) throw new Error('Invalid Pgyer build pagination');
    builds.push(...data.list);
    if (page === integer(data.pageCount)) break;
  }
  if (!builds.length) throw new Error('Missing Pgyer build statistics');
  return pgyerSnapshot(builds, previous);
}
