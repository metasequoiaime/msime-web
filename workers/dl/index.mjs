/*
 * dl.msime.app：下载镜像，Cloudflare R2（bucket `msime`）前面的一个 Worker。见 README「国内镜像」。
 *
 * 两种地址，对象名就是去掉开头 `/` 的路径：
 * - `gh/<GitHub 原地址>`：客户端的资源包、语音模型、应用更新和官方词库包，前缀加原地址即可。
 * - `releases/<仓库>/<tag>/<文件名>`：下载页的安装包（scripts/mirror-downloads.mjs），对应 metasequoiaime/<仓库> 的 release 资产。
 *
 * R2 里没有的对象由 Worker 从 GitHub 取一次存下，之后都从 R2 读。缓存不会重新校验，所以只放行内容不再变化的地址：发布资产，以及钉在提交上的 raw 文件；客户端按锁文件或校验值核对，镜像出错时退回原地址。名单之外一律 403，客户端照样按换源规则落回原地址。
 *
 * 之前是阿里云 OSS 香港 + 镜像回源规则，按外网流出计费，上线一天就是 118 GB、85 元。R2 不收流出费用。
 */

/** 放行的 GitHub 地址前缀，和之前 OSS 的 bucket policy 与回源规则逐条对应。 */
export const ALLOWED_ORIGINS = [
  'https://github.com/metasequoiaime/msime-dictionary/releases/download/',
  'https://github.com/metasequoiaime/chinese-ime-lm/releases/download/',
  'https://github.com/metasequoiaime/msime/releases/download/',
  'https://github.com/metasequoiaime/MSIME-Windows/releases/download/',
  'https://github.com/metasequoiaime/msime-plugins/releases/download/',
  'https://github.com/k2-fsa/sherpa-onnx/releases/download/',
  'https://raw.githubusercontent.com/metasequoiaime/msime-engine/',
  'https://raw.githubusercontent.com/metasequoiaime/msime-dictionary/',
];

/** 没有 Content-Length 的回源响应（raw.githubusercontent.com 压缩传输时）只能整个读进内存再存，超过这个大小就不缓存、直接转给客户端。Worker 内存上限是 128 MB。 */
export const BUFFER_LIMIT = 64 * 1024 * 1024;

const RELEASE_KEY = /^releases\/([\w.-]+)\/([^/]+)\/([^/]+)$/;

/** 请求路径对应的对象名：逐段解码。带 `.`、`..`、空段或反斜线的路径不认，免得拼回 GitHub 地址后跳出放行的前缀。 */
export function objectKey(pathname) {
  const segments = pathname.replace(/^\//, '').split('/');
  let decoded;
  try {
    decoded = segments.map(decodeURIComponent);
  } catch {
    return null;
  }
  // `gh/https://github.com/...` 在 `https:` 后面本来就有一个空段。
  const unsafe = decoded.some((part, index) => part === '.' || part === '..' || part.includes('\\') || (part === '' && !(decoded[0] === 'gh' && index === 2)));
  return unsafe || decoded.length < 2 ? null : decoded.join('/');
}

/** 对象名对应的 GitHub 原地址；不在放行名单里返回 null。 */
export function originFor(key) {
  if (!key) return null;
  if (key.startsWith('gh/')) {
    const url = key.slice('gh/'.length);
    return ALLOWED_ORIGINS.some(prefix => url.startsWith(prefix) && url.length > prefix.length) ? url : null;
  }
  const release = RELEASE_KEY.exec(key);
  if (!release) return null;
  const [, repository, tag, name] = release;
  const url = `https://github.com/metasequoiaime/${repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
  return ALLOWED_ORIGINS.some(prefix => url.startsWith(prefix)) ? url : null;
}

const fileName = key => key.slice(key.lastIndexOf('/') + 1);

/** 存进 R2 的 HTTP 元数据。对象按 tag、文件名或提交存放，内容不会再变，可以一直缓存。 */
export function storedMetadata(key, origin) {
  return {
    contentType: origin.headers.get('content-type') || 'application/octet-stream',
    contentDisposition: `attachment; filename="${fileName(key).replace(/["\\]/g, '_')}"`,
    cacheControl: 'public, max-age=31536000, immutable',
  };
}

/** 从 GitHub 取一次存进 R2。返回 `stored`、`missing`（GitHub 上也没有）或一个不缓存、直接转给客户端的响应。 */
async function fill(env, key, url) {
  const origin = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'msime-dl-mirror' } });
  if (origin.status === 404) return 'missing';
  if (!origin.ok || !origin.body) return new Response(`Upstream answered HTTP ${origin.status}`, { status: 502 });
  const httpMetadata = storedMetadata(key, origin);
  const length = origin.headers.get('content-length');
  if (length !== null) {
    await env.BUCKET.put(key, origin.body, { httpMetadata });
    return 'stored';
  }
  const body = await origin.arrayBuffer();
  if (body.byteLength > BUFFER_LIMIT) return new Response(body, { headers: { 'content-type': httpMetadata.contentType } });
  await env.BUCKET.put(key, body, { httpMetadata });
  return 'stored';
}

function objectHeaders(object) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('access-control-allow-origin', '*');
  return headers;
}

/** R2 的 range 结果换成 Content-Range。 */
function rangeHeader(range, size) {
  if (!range) return null;
  // R2 的 range 对象里三个字段都可能在，没用到的是 undefined，不能用 `in` 判断。
  if (range.suffix !== undefined) return `bytes ${size - range.suffix}-${size - 1}/${size}`;
  const offset = range.offset ?? 0;
  const end = range.length === undefined ? size - 1 : offset + range.length - 1;
  return `bytes ${offset}-${end}/${size}`;
}

async function serve(env, key, request) {
  const object = await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return null;
  const headers = objectHeaders(object);
  if (!('body' in object)) return new Response(null, { status: request.headers.has('if-none-match') ? 304 : 412, headers });
  const contentRange = request.headers.has('range') ? rangeHeader(object.range, object.size) : null;
  if (contentRange) headers.set('content-range', contentRange);
  return new Response(object.body, { status: contentRange ? 206 : 200, headers });
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    const key = objectKey(new URL(request.url).pathname);
    const url = originFor(key);
    if (!url) return new Response('Forbidden', { status: 403 });

    // 和之前 OSS 的回源规则一样，HEAD 不触发回源：sync-downloads 靠 HEAD 判断「已经镜像过了吗」。
    if (request.method === 'HEAD') {
      const object = await env.BUCKET.head(key);
      if (!object) return new Response(null, { status: 404 });
      const headers = objectHeaders(object);
      headers.set('content-length', String(object.size));
      return new Response(null, { headers });
    }

    const cached = await serve(env, key, request);
    if (cached) return cached;
    const filled = await fill(env, key, url);
    if (filled === 'missing') return new Response('Not found', { status: 404 });
    if (filled instanceof Response) return filled;
    return (await serve(env, key, request)) ?? new Response('Not found', { status: 404 });
  },
};
