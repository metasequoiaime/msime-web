import { writeFile } from 'node:fs/promises';
import { canonicalGithubUrl } from './github-url.mjs';
import { attachMirrors, mirrorBase } from './mirror-downloads.mjs';

/*
 * public/platforms.json 给下载页提供三个平台各自的最新版本与安装包。
 *
 * 在这之前只有 Windows 有版本信息（来自 public/update.json），macOS 和 Linux 的访客在官网上拿不到版本号、拿不到文件、也拿不到校验值，只能被推去 GitHub 自己翻。三个平台各自在自己的仓库发版，版本号互不相通，所以这里逐个仓库取最新的正式版，另附一个比它更新的预览版（如果有）。
 *
 * update.json 不动：它是 Windows 客户端「检查更新」读的接口，形状是对外承诺，不该为了页面好看去改。
 */
const SOURCES = {
  windows: 'metasequoiaime/MSIME-Windows',
  // 原来叫 MSIME-Apple。改名后 API 回的地址全是新名字，按旧名校验前缀会把 macOS 的产物全部丢掉、整轮同步失败。
  macos: 'metasequoiaime/msime',
  // Linux 也已并入主仓库；旧的 MSIME-Linux 只保留历史发布，当前正式版从这里读取。
  linux: 'metasequoiaime/msime',
};

/** 校验和、构建溯源清单和自动更新用的载荷都不该出现在「下载」按钮上。 */
const isNoise = name =>
  name.endsWith('.sha256') || name === 'product-manifest.json' || name === 'appcast.xml' ||
  name.includes('-update.zip') || name.includes('.xcarchive');

const LINUX_PACKAGES = [
  [/_amd64\.deb$/i, 'Debian / Ubuntu · deb', 'x86_64'],
  [/_arm64\.deb$/i, 'Debian / Ubuntu · deb', 'aarch64'],
  [/\.x86_64\.rpm$/i, 'Fedora / openSUSE · rpm', 'x86_64'],
  [/\.aarch64\.rpm$/i, 'Fedora / openSUSE · rpm', 'aarch64'],
  [/-linux-x86_64\.tar\.gz$/i, '通用压缩包 · tar.gz', 'x86_64'],
  [/-linux-aarch64\.tar\.gz$/i, '通用压缩包 · tar.gz', 'aarch64'],
];

/*
 * 同一个 linux-v 发布里除了水杉输入法本身（msime-linux），还有按版本表 shared/contracts/editions.json 打出的独立版本 msime-linux-<id>。它们的文件名后缀和完整版一样，只按后缀匹配时谁在 API 里排前面谁就成了主推按钮——linux-v0.10.0 的主按钮就这样变成了日语版。完整版只认包名后紧跟版本号的文件，各版本另起一组、标签带上版本名，排在完整版之后；版本表里新增的版本没登记在这里时宁可不展示，也不要冒充完整版。
 */
const LINUX_FULL = '(?:msime|metasequoia-ime)-linux';
const LINUX_EDITIONS = [
  ['pinyin', '水杉拼音'],
  ['wubi', '水杉五笔'],
  ['japanese', '水杉日语'],
  ['vietnamese', '水杉越南语'],
  ['tibetan', '水杉藏文'],
];
/** 包名后面紧跟版本号（deb 用 `_`，rpm 与 tar.gz 用 `-`），`msime-linux` 因此不会匹配到 `msime-linux-wubi_…`。 */
const linuxPackage = (name, suffix) => {
  const prefix = new RegExp(`^${name}[_-]\\d`, 'i');
  return { test: file => prefix.test(file) && suffix.test(file) };
};

/*
 * 每个平台把产物翻译成人看得懂的名字。顺序就是页面上的展示顺序，第一个是主推。
 *
 * 用精确的形状去匹配，不做「含 .deb 就算」的模糊判断：认不出来的产物宁可不展示，也不要在下载按钮上标错架构。
 */
const RULES = {
  windows: [[/^MetasequoiaIME_Setup_v[\w.-]+\.exe$/i, '安装程序', 'x64']],
  // iOS 的 ipa 也在这个仓库里发，但站点把 iOS 标为开发中，把一个能下的包摆在 macOS 名下只会让人误解。
  // 现行打包是 platforms/macos/package-release.sh 产出的 msime-macos-<版本>-<架构>.dmg（release-macos.yml 以 macos-v<版本> 发布）；架构可以是 universal，也可以分别发布 arm64 / x86_64，Apple 芯片排在前面做主推。pkg / zip 是此前的打包形状，只在还没有 DMG 发布时展示（见 selectRelease）。
  macos: [
    [/^msime-macos-\d+\.\d+\.\d+-universal\.dmg$/i, '通用 · dmg', 'Universal'],
    [/^msime-macos-\d+\.\d+\.\d+-arm64\.dmg$/i, 'Apple 芯片 · dmg', 'arm64'],
    [/^msime-macos-\d+\.\d+\.\d+-x86_64\.dmg$/i, 'Intel · dmg', 'x86_64'],
    [/-macos-universal[\w-]*\.pkg$/i, '安装包 · pkg', 'Universal'],
    [/-macos-universal[\w-]*\.zip$/i, '压缩包 · zip', 'Universal'],
  ],
  linux: [
    ...LINUX_PACKAGES.map(([suffix, label, arch]) => [linuxPackage(LINUX_FULL, suffix), label, arch]),
    ...LINUX_EDITIONS.flatMap(([id, name]) =>
      LINUX_PACKAGES.map(([suffix, label, arch]) => [linuxPackage(`msime-linux-${id}`, suffix), `${name} · ${label}`, arch])),
  ],
};

/*
 * tag 规则：可选的平台前缀（macOS 仓库的 `macos-v…`）、可选的 `v`、三到四段数字，再加一个可选的后缀（`-build.11`、`-beta.1`）。
 *
 * 以前这里只收纯数字 tag，理由是和 update.json 保持一致：上游发过 v0.6.2-beta，update.json 拒掉了，这份却收了，于是同一页上下载按钮说 v0.6.2-beta、正文说 v0.5.4。现在正式版和预览版在页面上分开展示、各自标明，那个矛盾不再出现；而 macOS 仓库已经只发带 `-build.N` 后缀的 tag，连带 Latest 徽章的正式版也是，继续只收纯数字 tag 会让 macOS 永远停在最后一个纯数字版本上。
 *
 * 后缀只允许字母、数字和点：版本号会被拼进 markdown 和按钮文字，不能让它带进别的符号。
 */
const releaseTag = platform => new RegExp(`^(?:${platform}-)?v?(\\d+\\.\\d+\\.\\d+(?:\\.\\d+)?(?:-[0-9A-Za-z.]+)?)$`);

/*
 * 按 semver 的思路比较：先比数字主干，主干相同时不带后缀的排在带后缀的前面，后缀按点分段，纯数字段按数值比（build.11 高于 build.9）。
 *
 * 选最高版本而不是最新发布：补发一个旧版本不该把页面推回去。
 */
const compareSegments = (left, right) => {
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const a = left[i], b = right[i];
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    const numeric = /^\d+$/.test(a) && /^\d+$/.test(b);
    if (numeric ? Number(a) !== Number(b) : a !== b) return numeric ? Number(b) - Number(a) : (b < a ? -1 : 1);
  }
  return 0;
};

export const versionOrder = (left, right) => {
  const [coreA, suffixA] = left.split(/-(.*)/s), [coreB, suffixB] = right.split(/-(.*)/s);
  const a = coreA.split('.').map(Number), b = coreB.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0);
  }
  if (suffixA === undefined || suffixB === undefined) return (suffixA === undefined ? 0 : 1) - (suffixB === undefined ? 0 : 1);
  return compareSegments(suffixA.split('.'), suffixB.split('.'));
};

const sha256Of = asset =>
  typeof asset.digest === 'string' && asset.digest.startsWith('sha256:')
    ? asset.digest.slice('sha256:'.length)
    : null;

export function classifyAssets(platform, assets) {
  const rules = RULES[platform] ?? [];
  const downloads = [];

  for (const [pattern, label, arch] of rules) {
    for (const asset of assets) {
      if (isNoise(asset.name) || !pattern.test(asset.name)) continue;
      const url = canonicalGithubUrl(SOURCES[platform], asset.browser_download_url);
      if (!url?.startsWith(`https://github.com/${SOURCES[platform]}/releases/download/`)) continue;
      downloads.push({
        label,
        arch,
        name: asset.name,
        url,
        size: asset.size ?? 0,
        sha256: sha256Of(asset),
      });
    }
  }

  return downloads;
}

/*
 * 签名状态：true / false / null（不知道）。
 *
 * 文件名里带 unsigned 一定是没签名，这条对哪个平台都成立。反过来不成立：只有 Windows 安装包和 macOS 旧的 pkg / zip 发布流水线用「没签名就把 unsigned 写进文件名」这个约定，所以名字里没有 unsigned 才能推出已签名。Linux 包不走这个约定，名字里本来就不会有 unsigned，据此判成「已签名」是在页面上说假话 —— 站点自己的下载说明写的是 Linux 未经签名。macOS 的 DMG 也不走：缺少 Developer ID 时 package-release.sh 照样产出同名的 ad-hoc 签名 DMG。
 *
 * 判不出来就返回 null，页面对这种情况什么都不说，而不是猜一个。
 */
const NAME_DECLARES_SIGNING = {
  windows: () => true,
  macos: name => /-macos-universal/i.test(name),
};

export const signingState = (platform, downloads) => {
  if (!downloads.length) return null;
  if (downloads.some(entry => /unsigned/i.test(entry.name))) return false;
  const declares = NAME_DECLARES_SIGNING[platform];
  return declares && downloads.every(entry => declares(entry.name)) ? true : null;
};

const toRelease = (platform, release) => {
  const match = releaseTag(platform).exec(String(release.tag_name ?? ''));
  if (release.draft !== false || !release.published_at || !match) return null;
  const downloads = classifyAssets(platform, release.assets ?? []);
  if (!downloads.length) return null;
  // 产物地址已经按仓库校验过，发布页地址没有理由松一档 —— 页面上「发布说明与校验值」就指向它。
  const releaseUrl = canonicalGithubUrl(SOURCES[platform], release.html_url);
  if (!releaseUrl) return null;
  return {
    version: match[1],
    releaseUrl,
    publishedAt: release.published_at,
    prerelease: release.prerelease === true,
    signed: signingState(platform, downloads),
    downloads,
  };
};

/*
 * 正式版和预览版同时给出。
 *
 * 正式版是最高的非 Pre-release；预览版是比正式版更高的 Pre-release —— 比正式版还旧的预览版没有理由再摆出来。macOS 仓库每次合并都自动发一个 Pre-release，却只把人工挑过的那个标成正式版，只给其中一个，要么让来下载的人拿不到最新改动，要么把没挑过的构建当成正式版推给所有人。
 *
 * 一个正式版都没有的平台（上游只发过 Pre-release）用最高的预览版顶上主位，preview 留空：平台不能从清单里消失。
 *
 * 换了打包形状的平台，一旦出现新形状的发布，旧形状的发布就不再参与挑选：macOS 从 pkg / zip 换成 DMG 后，安装步骤完全不同（DMG 要拖进「应用程序」再打开 MSIME），页面按清单里的格式切换说明，主按钮和预览版若一个是 DMG、一个是 pkg，说明只能对上其中一个。还没有 DMG 发布时照旧展示 pkg / zip。
 */
const SUPERSEDING_FORMAT = { macos: /\.dmg$/i };

export function selectRelease(platform, releases) {
  let eligible = releases.map(release => toRelease(platform, release)).filter(Boolean)
    .sort((left, right) => versionOrder(left.version, right.version));
  const superseding = SUPERSEDING_FORMAT[platform];
  if (superseding && eligible.some(release => release.downloads.some(entry => superseding.test(entry.name)))) {
    eligible = eligible.filter(release => release.downloads.some(entry => superseding.test(entry.name)));
  }
  const stable = eligible.find(release => !release.prerelease);
  if (!stable) return eligible[0] ? { ...eligible[0], preview: null } : null;
  const newer = eligible.find(release => release.prerelease && versionOrder(release.version, stable.version) < 0);
  const preview = newer ? (({ prerelease, ...rest }) => rest)(newer) : null;
  return { ...stable, preview };
}

/*
 * 取全部 release，而不是第一页。
 *
 * macOS 仓库每次合并都自动发一个 Pre-release，正式版很快就被挤出第一页：取 30 条的时候，带 Latest 徽章的那个排在第 25 条，再过几天就看不到了，页面会把预览版当成正式版。
 */
async function fetchAllReleases(repository, headers) {
  const releases = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
      { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${repository} releases failed: HTTP ${response.status}`);
    const batch = await response.json();
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
}

/*
 * 词库单独发布，三个平台共用同一份（各自的 product-manifest.json 里记的 dictionary.tag 是同一个）。
 * 这也是「一套引擎」最硬的佐证：同一个 tag、同一批哈希。
 */
const DICTIONARY_REPOSITORY = 'metasequoiaime/MSIME-Engine';

const DICTIONARY_FILES = {
  'msime.db': '全拼与五笔主词库',
  'others.db': '扩展词库',
  'english.db': '英文词库',
  'dict_japanese.dat': '日文词典（源自 Mozc）',
};

export function selectDictionary(release) {
  if (release?.draft !== false || !release.published_at) return null;
  const releaseUrl = canonicalGithubUrl(DICTIONARY_REPOSITORY, release.html_url);
  if (!releaseUrl) return null;
  const files = (release.assets ?? [])
    .filter(asset => asset.name in DICTIONARY_FILES)
    .map(asset => ({
      name: asset.name,
      label: DICTIONARY_FILES[asset.name],
      size: asset.size ?? 0,
      sha256: sha256Of(asset),
    }))
    .sort((left, right) => right.size - left.size);

  if (!files.length) return null;
  return { repository: DICTIONARY_REPOSITORY, tag: release.tag_name, releaseUrl, publishedAt: release.published_at, files };
}

async function main() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;

  const platforms = {};
  for (const [platform, repository] of Object.entries(SOURCES)) {
    const selected = selectRelease(platform, await fetchAllReleases(repository, headers));
    if (selected) platforms[platform] = { repository, ...selected };
  }

  // 每个平台都是下载页的固定桌面分支。上游暂时没有可识别产物时，不能把该键静默删掉：
  // 这会让自动化 PR 通过生成步骤，却在站点 schema 校验阶段才失败，并把已有下载信息变成
  // 「前往发布页」。宁可让同步任务失败，等上游产物恢复后再生成。
  const missingPlatforms = Object.keys(SOURCES).filter(platform => !platforms[platform]);
  if (missingPlatforms.length) {
    throw new Error(`Refusing to write an incomplete platform manifest: missing ${missingPlatforms.join(', ')}`);
  }

  const dictionaryResponse = await fetch(`https://api.github.com/repos/${DICTIONARY_REPOSITORY}/releases?per_page=30`,
    { headers, signal: AbortSignal.timeout(30000) });
  if (!dictionaryResponse.ok) throw new Error(`dictionary releases failed: HTTP ${dictionaryResponse.status}`);
  const dictionary = (await dictionaryResponse.json())
    .filter(release => String(release.tag_name ?? '').startsWith('dict-'))
    .map(selectDictionary)
    .find(Boolean) ?? null;

  // 配置了国内镜像时，每个包都带上 OSS 地址；文件由紧接着运行的 mirror-downloads.mjs 上传，上传失败这一轮就不会提 PR。
  const mirrored = attachMirrors(platforms, mirrorBase(process.env.DOWNLOAD_MIRROR_BASE_URL));
  await writeFile(new URL('../public/platforms.json', import.meta.url),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), platforms: mirrored, dictionary }, null, 2)}\n`);
  console.log(Object.entries(platforms).map(([k, v]) => `${k} v${v.version} (${v.downloads.length} 个产物)${v.preview ? ` + 预览版 v${v.preview.version}` : ''}`).join(', '),
    dictionary ? `| 词库 ${dictionary.tag} (${dictionary.files.length} 个文件)` : '| 词库 未取到');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
