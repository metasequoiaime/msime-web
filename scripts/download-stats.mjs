// 只统计可安装的产品包：源码、词库、符号和自动更新载荷不属于手动下载安装包。
const INSTALLERS = [
  ['windows', /^MetasequoiaIME(?:-[\w]+)?_Setup_v[\w.-]+\.exe$/i],
  ['macos', /^msime-macos-(?:[a-z]+-)?\d[\w.-]*\.dmg$/i],
  ['macos', /^MetasequoiaIME-[\w.-]+-macos-universal[\w-]*\.pkg$/i],
  ['macos', /^MetasequoiaIME-[\w.-]+-macos-universal(?:-unsigned)?\.zip$/i],
  ['linux', /^(?:msime|metasequoia-ime)-linux[\w.-]*\.(?:deb|rpm|appimage)$/i],
  ['linux', /^(?:msime|metasequoia-ime)-linux[\w.-]*-linux-(?:x86_64|aarch64)\.tar\.gz$/i],
  ['android', /^msime-(?:android|client)[\w.-]*\.apk$/i],
];

export const DOWNLOAD_STATS_REPOSITORIES = [
  'metasequoiaime/MSIME-Windows',
  'metasequoiaime/msime',
  'metasequoiaime/MSIME-Linux',
];

/** 汇总所有现存发行版（含预发布与 nightly）的安装包下载次数；分页重叠的资产按仓库和资产 ID 去重。 */
export function downloadStats(repositories) {
  const platforms = { windows: 0, macos: 0, linux: 0, android: 0 };
  const seen = new Set();
  for (const [repository, releases] of repositories) {
    for (const release of releases) {
      if (release.draft || !release.published_at) continue;
      for (const asset of release.assets ?? []) {
        const platform = INSTALLERS.find(([, pattern]) => pattern.test(asset.name))?.[0];
        if (!platform) continue;
        const key = `${repository.toLowerCase()}/${asset.id}`;
        if (seen.has(key)) continue;
        if (!Number.isSafeInteger(asset.id) || asset.id <= 0 || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
          throw new Error(`Invalid GitHub download counter (${repository})`);
        }
        seen.add(key);
        platforms[platform] += asset.download_count;
      }
    }
  }
  const total = Object.values(platforms).reduce((sum, count) => sum + count, 0);
  if (!Number.isSafeInteger(total)) throw new Error('GitHub download counter overflow');
  return { total, platforms };
}
