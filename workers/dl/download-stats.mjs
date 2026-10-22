import { installerPlatform } from '../../scripts/download-stats.mjs';

const TELEMETRY_URL = 'https://api.msime.app/v1/telemetry/events';
export const DOWNLOAD_OUTBOX = 'download-events/pending/';

/** 只记录安装包成功发出的起始响应；探测、预热和续传分片不增加累计。 */
export function downloadEvent(request, response, origin) {
  if (request.method !== 'GET' || ![200, 206].includes(response.status) || request.headers.get('x-msime-mirror-check') === '1') return null;
  if (response.status === 206 && !/^bytes 0-\d+\/\d+$/.test(response.headers.get('content-range') ?? '')) return null;
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/([^/]+)\/([^/]+)$/.exec(origin);
  if (!match) return null;
  let repository, version, artifact;
  try { [repository, version, artifact] = match.slice(1).map(decodeURIComponent); }
  catch { return null; }
  const platform = installerPlatform(repository, artifact);
  if (!platform) return null;
  // 既有遥测协议限制版本与附件字段为 64 个字符，不附带访问者、地址或请求头。
  return { id: `mirror-${crypto.randomUUID()}`, kind: 'download', platform: platform === 'windowsRust' ? 'windows-rust' : platform, version: [...version].slice(0, 64).join(''), artifact: [...artifact].slice(0, 64).join(''), channel: 'cn-mirror' };
}

/** 先把匿名事件保存到现有 R2 发件箱，后端不可用时仍保留记录等待下一轮。 */
export async function recordDownload(request, response, origin, env) {
  const event = downloadEvent(request, response, origin);
  if (!event) return response;
  const headers = new Headers(response.headers);
  // 安装包不能绕过 Worker 从浏览器长期缓存返回，否则后续下载不会留下服务器记录。
  headers.set('cache-control', 'no-store');
  try { await env.BUCKET.put(`${DOWNLOAD_OUTBOX}${event.id}.json`, JSON.stringify(event), { httpMetadata: { contentType: 'application/json' } }); }
  catch { console.error('download_count_persist_failed'); }
  return new Response(response.body, { status: response.status, headers });
}

/** 同一事件重试使用同一 ID，确认成功后才删除；并发定时任务也不会重复累计。 */
export async function flushDownloads(env, request = fetch) {
  const pending = await env.BUCKET.list({ prefix: DOWNLOAD_OUTBOX, limit: 100 });
  const deliver = async object => {
    try {
      const saved = await env.BUCKET.get(object.key);
      if (!saved) return;
      const event = await saved.json();
      const response = await request(TELEMETRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(8_000),
      });
      await response.body?.cancel();
      if (response.status === 202) await env.BUCKET.delete(object.key);
    } catch { /* 发件箱保留原事件，下一分钟继续投递。 */ }
  };
  for (let index = 0; index < pending.objects.length; index += 10) {
    await Promise.all(pending.objects.slice(index, index + 10).map(deliver));
  }
}
