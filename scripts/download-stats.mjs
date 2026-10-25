// 只统计可安装的产品包：源码、词库、符号和自动更新载荷不属于手动下载安装包。
const INSTALLERS = [
  ['windows7', /^MetasequoiaIME-[\w]+_Setup_v[\w.-]+_win7_(?:x86|x64)\.exe$/i],
  ['windows', /^MetasequoiaIME(?:-[\w]+)?_Setup_v[\w.-]+\.exe$/i],
  ['macos', /^msime-macos-(?:[a-z]+-)?\d[\w.-]*\.dmg$/i],
  ['macos', /^MetasequoiaIME-[\w.-]+-macos-universal[\w-]*\.pkg$/i],
  ['macos', /^MetasequoiaIME-[\w.-]+-macos-universal(?:-unsigned)?\.zip$/i],
  ['linux', /^(?:msime|metasequoia-ime)-linux[\w.-]*\.(?:deb|rpm|appimage)$/i],
  ['linux', /^(?:msime|metasequoia-ime)-linux[\w.-]*-linux-(?:x86_64|aarch64)\.tar\.gz$/i],
  ['android', /^msime-(?:android|client)[\w.-]*\.apk$/i],
  ['harmony', /^msime-harmony-[\w.-]+\.hap$/i],
];

export const DOWNLOAD_STATS_REPOSITORIES = [
  'metasequoiaime/MSIME-Windows',
  'metasequoiaime/msime',
  'metasequoiaime/MSIME-Linux',
];

/** 官网与镜像共用产品包分类，资源、源码和符号不计入安装包累计。 */
export function installerPlatform(repository, name) {
  if (!DOWNLOAD_STATS_REPOSITORIES.some(value => value.toLowerCase() === repository.toLowerCase())) return null;
  const platform = INSTALLERS.find(([, pattern]) => pattern.test(name))?.[0];
  if (platform === 'windows7') return repository.toLowerCase() === 'metasequoiaime/msime' ? platform : null;
  return platform === 'windows' && repository.toLowerCase() === 'metasequoiaime/msime' ? 'windowsRust' : platform ?? null;
}

/** 汇总所有现存发行版（含预发布与 nightly）的安装包下载次数；分页重叠的资产按仓库和资产 ID 去重。 */
export function downloadSnapshot(repositories, history = []) {
  const platforms = { windows: 0, windowsRust: 0, windows7: 0, macos: 0, linux: 0, android: 0, harmony: 0 };
  if (!Array.isArray(history)) throw new Error('Invalid GitHub download history');
  const seen = new Map();
  const keep = (repository, asset) => {
    if (typeof repository !== 'string' || typeof asset.name !== 'string') throw new Error('Invalid GitHub download history');
    const platform = installerPlatform(repository, asset.name);
    if (!platform) return;
    if (!Number.isSafeInteger(asset.id) || asset.id <= 0 || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
      throw new Error(`Invalid GitHub download counter (${repository})`);
    }
    const key = `${repository.toLowerCase()}/${asset.id}`;
    const previous = seen.get(key);
    if (!previous || previous.download_count < asset.download_count) seen.set(key, { repository: repository.toLowerCase(), id: asset.id, name: asset.name, download_count: asset.download_count });
  };
  for (const entry of history) keep(entry.repository, entry);
  for (const [repository, releases] of repositories) {
    for (const release of releases) {
      if (release.draft || !release.published_at) continue;
      for (const asset of release.assets ?? []) {
        keep(repository, asset);
      }
    }
  }
  const downloadHistory = [...seen.values()].sort((a, b) => a.repository.localeCompare(b.repository) || a.id - b.id);
  for (const asset of downloadHistory) platforms[installerPlatform(asset.repository, asset.name)] += asset.download_count;
  const total = Object.values(platforms).reduce((sum, count) => sum + count, 0);
  if (!Number.isSafeInteger(total)) throw new Error('GitHub download counter overflow');
  return { downloadStats: { total, platforms }, downloadHistory };
}

/** 保留原调用方接口，清单生成器另外保存附件历史。 */
export const downloadStats = repositories => downloadSnapshot(repositories).downloadStats;
