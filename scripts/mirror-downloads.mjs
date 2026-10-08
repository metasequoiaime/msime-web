import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/*
 * 国内镜像：把下载页上的每个安装包从 GitHub Release 复制一份到阿里云 OSS（香港），页面在 GitHub 按钮旁边给出镜像地址。
 *
 * GitHub 的 release 下载在国内经常只有几十 KB/s，QQ 群文件、夸克和蓝奏云盘又只有 Windows 安装包、而且要人工上传。这里跟着 sync-downloads 的同一轮走：platforms.json 选出哪些包，就镜像哪些包，不需要任何人手动搬运。
 *
 * 顺序是先上传、后提 PR：generate-platforms.mjs 只负责按固定规则把 mirrorUrl 写进清单，这个脚本把清单里的每个 mirrorUrl 都变成真实可下载的文件，并从公网地址回读核对大小和校验值。核对不过的包从清单里去掉 mirrorUrl，页面上只出现确实能下的镜像。
 *
 * 镜像失败不拦发布：同一份清单还带着 Windows 版本号，和客户端检查更新读的 update.json 绑在一起（见 sync-downloads.yml），OSS 出故障时让新版本卡在门外，代价远大于暂时少一个镜像按钮。失败的个数写进 step output，workflow 在提完 PR 之后再让这一轮标红。
 */

const GITHUB_DOWNLOAD = /^https:\/\/github\.com\/metasequoiaime\/([\w.-]+)\/releases\/download\/([^/]+)\/([^/]+)$/;

/** OSS 对象名：`releases/<仓库>/<tag>/<文件名>`。tag 和文件名一起才唯一，GitHub 上同名文件可能出现在不同 tag 下。 */
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
 * 公网地址本身就能回答「已经镜像过了吗」：OSS 把上传时写的 x-oss-meta-sha256 原样带在响应头里。只看公网地址还顺带确认了用户真的下得到 —— bucket 没开公共读、域名没绑好时，上传本身是成功的，但用户点下去是 403。
 *
 * 清单没有校验值（上游没给 digest）时只核对大小：对象按 tag 和文件名存放，不会被别的版本覆盖。
 */
async function publiclyServed(entry, request) {
  const response = await request(entry.mirrorUrl, { method: 'HEAD', signal: AbortSignal.timeout(60_000) });
  const length = response.headers.get('content-length');
  const sha256 = response.headers.get('x-oss-meta-sha256');
  const served = response.ok && Number(length) === entry.size && (!entry.sha256 || sha256 === entry.sha256);
  return { served, status: `HTTP ${response.status}, ${length} bytes, sha256 ${sha256}` };
}

/** 下载到临时文件，边写边算 sha256，大小和校验值都要和清单对上，否则不上传。 */
async function download(entry, file, request) {
  const response = await request(entry.url, { redirect: 'follow', signal: AbortSignal.timeout(10 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`${entry.name}: GitHub download failed: HTTP ${response.status}`);
  const hash = createHash('sha256');
  let size = 0;
  const measure = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      size += chunk.length;
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), measure, createWriteStream(file));
  const sha256 = hash.digest('hex');
  if (size !== entry.size) throw new Error(`${entry.name}: downloaded ${size} bytes, the manifest says ${entry.size}`);
  if (entry.sha256 && sha256 !== entry.sha256) throw new Error(`${entry.name}: sha256 ${sha256} does not match the manifest's ${entry.sha256}`);
  return sha256;
}

/** 同步一个包，返回 `present` 或 `uploaded`；上传后公网地址仍核对不过时抛错。`client` 是取 OSS 客户端的函数，只有真要上传时才调用：已经镜像过的包用不着凭据。 */
export async function mirrorOne(entry, { client, request = fetch, workdir }) {
  if ((await publiclyServed(entry, request)).served) return 'present';
  const file = join(workdir, entry.name);
  try {
    const sha256 = await download(entry, file, request);
    await (await client()).multipartUpload(entry.key, file, {
      partSize: 16 * 1024 * 1024,
      parallel: 4,
      mime: 'application/octet-stream',
      meta: { sha256 },
      headers: {
        // 对象按 tag 和文件名存放，内容不会再变，CDN 和浏览器都可以一直缓存。
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `attachment; filename="${entry.name}"`,
      },
    });
  } finally {
    await rm(file, { force: true });
  }
  const check = await publiclyServed(entry, request);
  if (!check.served) throw new Error(`${entry.name}: uploaded, but ${entry.mirrorUrl} answered ${check.status}; expected ${entry.size} bytes, sha256 ${entry.sha256}`);
  return 'uploaded';
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

async function ossClient() {
  const { default: OSS } = await import('ali-oss');
  const env = name => {
    if (!process.env[name]) throw new Error(`${name} is required to mirror downloads`);
    return process.env[name];
  };
  return new OSS({
    region: env('ALIYUN_OSS_REGION'),
    bucket: env('ALIYUN_OSS_BUCKET'),
    // 由 aliyun/configure-aliyun-credentials-action 用 GitHub OIDC 换来的临时凭据，不存长期密钥。
    accessKeyId: env('ALIBABA_CLOUD_ACCESS_KEY_ID'),
    accessKeySecret: env('ALIBABA_CLOUD_ACCESS_KEY_SECRET'),
    stsToken: env('ALIBABA_CLOUD_SECURITY_TOKEN'),
    secure: true,
    timeout: 10 * 60_000,
  });
}

async function main() {
  const file = new URL('../public/platforms.json', import.meta.url);
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  const entries = mirroredDownloads(manifest);
  let pending;
  // 凭据出问题（OIDC 换不到临时密钥）时，已经镜像过的包照样可用，只有需要上传的包会失败。
  const client = () => (pending ??= ossClient());
  const workdir = await mkdtemp(join(tmpdir(), 'msime-mirror-'));
  const failed = [];
  try {
    for (const entry of entries) {
      try {
        console.log(`${await mirrorOne(entry, { client, workdir })}\t${entry.key}`);
      } catch (error) {
        failed.push(entry.key);
        // fetch 只说 "fetch failed"，DNS、TLS、超时这些真正的原因在 cause 里。
        const cause = error?.cause ? ` (${error.cause.message ?? error.cause})` : '';
        console.log(`::error title=Mirror failed::${entry.key}: ${error instanceof Error ? error.message : error}${cause}`);
      }
    }
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
  if (failed.length) await writeFile(file, `${JSON.stringify(dropMirrors(manifest, failed), null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `failed=${failed.length}\n`);
  console.log(`${entries.length - failed.length} of ${entries.length} packages mirrored.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
