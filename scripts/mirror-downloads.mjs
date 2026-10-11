import { createHash } from 'node:crypto';
import { appendFile, readFile, writeFile } from 'node:fs/promises';

/*
 * 国内镜像：下载页上的每个安装包在 dl.msime.app（Cloudflare R2 前面的 Worker，workers/dl/）上都有一份，页面在 GitHub 按钮旁边给出镜像地址。
 *
 * GitHub 的 release 下载在国内经常只有几十 KB/s，QQ 群文件、夸克和蓝奏云盘又只有 Windows 安装包、而且要人工上传。这里跟着 sync-downloads 的同一轮走：platforms.json 选出哪些包，就镜像哪些包，不需要任何人手动搬运。
 *
 * 镜像里没有的文件由 Worker 在第一次 GET 时从 GitHub 取来存下，所以这里不上传、也不需要任何凭据：对镜像地址发一次 GET 就把文件放了进去，同时从公网地址回读核对大小和校验值。顺序是先预热、后提 PR：generate-platforms.mjs 只负责按固定规则把 mirrorUrl 写进清单，这个脚本把清单里的每个 mirrorUrl 都变成真实可下载的文件，用户点下去不会是那个等 GitHub 的第一次。核对不过的包从清单里去掉 mirrorUrl，页面上只出现确实能下的镜像。
 *
 * 镜像失败不拦发布：同一份清单还带着 Windows 版本号，和客户端检查更新读的 update.json 绑在一起（见 sync-downloads.yml），镜像出故障时让新版本卡在门外，代价远大于暂时少一个镜像按钮。失败的个数写进 step output，workflow 在提完 PR 之后再让这一轮标红。
 */

const GITHUB_DOWNLOAD = /^https:\/\/github\.com\/metasequoiaime\/([\w.-]+)\/releases\/download\/([^/]+)\/([^/]+)$/;

/** R2 对象名：`releases/<仓库>/<tag>/<文件名>`。tag 和文件名一起才唯一，GitHub 上同名文件可能出现在不同 tag 下。 */
export function mirrorKey(url) {
  const match = GITHUB_DOWNLOAD.exec(url);
  if (!match) throw new Error(`Not a project release download: ${url}`);
  const [, repository, tag, name] = match;
  return `releases/${repository}/${decodeURIComponent(tag)}/${decodeURIComponent(name)}`;
}

export const mirrorUrl = (base, url) => `${base}/${mirrorKey(url).split('/').map(encodeURIComponent).join('/')}`;

/** 仓库变量 DOWNLOAD_MIRROR_BASE_URL 是镜像的公网前缀，例如 `https://dl.msime.app`。只收 https，结尾的 `/` 去掉。 */
export function mirrorBase(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.search || url.hash) throw new Error(`DOWNLOAD_MIRROR_BASE_URL must be a plain https URL: ${value}`);
  return url.href.replace(/\/+$/, '');
}

const withMirror = (base, downloads) => downloads.map(entry => ({ ...entry, mirrorUrl: mirrorUrl(base, entry.url) }));

/** 给清单里每个平台的正式版和预览版的每个包补上 mirrorUrl。没有配置镜像时原样返回。 */
export function attachMirrors(platforms, base) {
  if (!base) return platforms;
  return Object.fromEntries(Object.entries(platforms).map(([platform, release]) => [platform, {
    ...release,
    downloads: withMirror(base, release.downloads),
    preview: release.preview ? { ...release.preview, downloads: withMirror(base, release.preview.downloads) } : null,
  }]));
}

/** 清单里所有带 mirrorUrl 的包，按对象名去重（macOS 和 Linux 来自同一个仓库，但不会共用文件；去重只是防御）。 */
export function mirroredDownloads(manifest) {
  const entries = new Map();
  for (const release of Object.values(manifest.platforms)) {
    for (const entry of [...release.downloads, ...(release.preview?.downloads ?? [])]) {
      if (entry.mirrorUrl) entries.set(mirrorKey(entry.url), entry);
    }
  }
  return [...entries].map(([key, entry]) => ({ key, ...entry }));
}

/*
 * 公网地址本身就能回答「已经镜像过了吗」：Worker 对 HEAD 只报告 R2 里有什么，不会去 GitHub 取。只看公网地址还顺带确认了用户真的下得到。
 *
 * 已经在镜像里的包只核对大小：对象按 tag 和文件名存放，不会被别的版本覆盖，内容是 Worker 从 GitHub 原样取来的；校验值在第一次预热时整份读回来核对过。
 */
async function publiclyServed(entry, request) {
  const response = await request(entry.mirrorUrl, { method: 'HEAD', signal: AbortSignal.timeout(60_000) });
  const length = response.headers.get('content-length');
  return { served: response.ok && Number(length) === entry.size, status: `HTTP ${response.status}, ${length} bytes` };
}

/** 从镜像地址整份读一遍：Worker 借这次 GET 从 GitHub 取来存下。边读边算 sha256，大小和校验值都要和清单对上。 */
async function fetchThroughMirror(entry, request) {
  const response = await request(entry.mirrorUrl, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`${entry.name}: ${entry.mirrorUrl} answered HTTP ${response.status}`);
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of response.body) {
    hash.update(chunk);
    size += chunk.length;
  }
  const sha256 = hash.digest('hex');
  if (size !== entry.size) throw new Error(`${entry.name}: the mirror served ${size} bytes, the manifest says ${entry.size}`);
  if (entry.sha256 && sha256 !== entry.sha256) throw new Error(`${entry.name}: the mirror served sha256 ${sha256}, which does not match the manifest's ${entry.sha256}`);
}

/** 同步一个包，返回 `present`（镜像里已经有）或 `filled`（这一轮让 Worker 从 GitHub 取来存下）；核对不过时抛错。 */
export async function mirrorOne(entry, { request = fetch } = {}) {
  if ((await publiclyServed(entry, request)).served) return 'present';
  await fetchThroughMirror(entry, request);
  const check = await publiclyServed(entry, request);
  if (!check.served) throw new Error(`${entry.name}: fetched through the mirror, but ${entry.mirrorUrl} answered ${check.status}; expected ${entry.size} bytes`);
  return 'filled';
}

/** 去掉没能镜像的包的 mirrorUrl。 */
export function dropMirrors(manifest, failedKeys) {
  const failed = new Set(failedKeys);
  const strip = downloads => downloads.map(entry => {
    if (!entry.mirrorUrl || !failed.has(mirrorKey(entry.url))) return entry;
    const { mirrorUrl: _dropped, ...rest } = entry;
    return rest;
  });
  return {
    ...manifest,
    platforms: Object.fromEntries(Object.entries(manifest.platforms).map(([platform, release]) => [platform, {
      ...release,
      downloads: strip(release.downloads),
      preview: release.preview ? { ...release.preview, downloads: strip(release.preview.downloads) } : null,
    }])),
  };
}

async function main() {
  const file = new URL('../public/platforms.json', import.meta.url);
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  const entries = mirroredDownloads(manifest);
  const failed = [];
  for (const entry of entries) {
    try {
      console.log(`${await mirrorOne(entry)}\t${entry.key}`);
    } catch (error) {
      failed.push(entry.key);
      // fetch 只说 "fetch failed"，DNS、TLS、超时这些真正的原因在 cause 里。
      const cause = error?.cause ? ` (${error.cause.message ?? error.cause})` : '';
      console.log(`::error title=Mirror failed::${entry.key}: ${error instanceof Error ? error.message : error}${cause}`);
    }
  }
  if (failed.length) await writeFile(file, `${JSON.stringify(dropMirrors(manifest, failed), null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `failed=${failed.length}\n`);
  console.log(`${entries.length - failed.length} of ${entries.length} packages mirrored.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
