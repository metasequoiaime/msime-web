import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAssets, fetchAllReleases, selectExperimental, selectRelease, selectWindows7, signingState, versionOrder } from './generate-platforms.mjs';
import { downloadSnapshot, downloadStats } from './download-stats.mjs';

const statsRelease = (assets, extra = {}) => ({ draft: false, published_at: '2026-10-21T00:00:00Z', assets, ...extra });
const countedAsset = (id, name, count) => ({ id, name, download_count: count });

test('附件删除或换 ID 后保留历史，同一附件重复读取只更新累计值', () => {
  const repository = 'metasequoiaime/msime';
  const releases = assets => new Map([[repository, [statsRelease(assets)]]]);
  const first = downloadSnapshot(releases([countedAsset(1, 'msime-android.apk', 10)]));
  const second = downloadSnapshot(releases([countedAsset(1, 'msime-android.apk', 15)]), first.downloadHistory);
  assert.equal(second.downloadStats.total, 15);
  const replaced = downloadSnapshot(releases([countedAsset(2, 'msime-android.apk', 3)]), second.downloadHistory);
  assert.equal(replaced.downloadStats.total, 18);
  assert.equal(downloadSnapshot(releases([]), replaced.downloadHistory).downloadStats.total, 18);
  assert.deepEqual(downloadSnapshot(releases([countedAsset(2, 'msime-android.apk', 3)]), replaced.downloadHistory), replaced);
  assert.equal(downloadSnapshot(releases([countedAsset(2, 'msime-android.apk', 1)]), replaced.downloadHistory).downloadStats.total, 18);
  assert.throws(() => downloadSnapshot(releases([]), {}), /Invalid GitHub/);
  assert.throws(() => downloadSnapshot(releases([]), [{ repository, ...countedAsset(1, 'msime-android.apk', -1) }]), /Invalid GitHub/);
});

test('download totals include stable, preview, nightly and archived packages, once per asset', () => {
  const windows = countedAsset(1, 'MetasequoiaIME_Setup_v0.11.1.exe', 1000);
  const stats = downloadStats(new Map([
    ['metasequoiaime/MSIME-Windows', [statsRelease([windows]), statsRelease([windows])]],
    ['metasequoiaime/msime', [
      statsRelease([
        countedAsset(1, 'MetasequoiaIME-Full_Setup_v0.3.0.exe', 5),
        countedAsset(2, 'msime-macos-0.54.0-universal.dmg', 20),
        countedAsset(3, 'msime-macos-pinyin-0.54.0-universal.dmg', 8),
        countedAsset(4, 'msime-linux_0.13.0_amd64.deb', 30),
        countedAsset(5, 'msime-linux-wubi-0.13.0-linux-aarch64.tar.gz', 2),
        countedAsset(6, 'msime-android.apk', 10),
        countedAsset(7, 'msime-client-wubi.apk', 3),
        countedAsset(8, 'MetasequoiaIME-v0.47.2-macos-universal-unsigned.pkg', 4),
        countedAsset(9, 'MetasequoiaIME-v0.47.2-macos-universal.zip', 6),
      ]),
      statsRelease([countedAsset(10, 'msime-macos-0.54.2-universal.dmg', 7)], { prerelease: true }),
      statsRelease([countedAsset(11, 'msime-android-nightly.123.apk', 1)], { tag_name: 'nightly' }),
      statsRelease([countedAsset(12, 'msime-harmony-0.2.0-unsigned-nightly.123.1.hap', 6)], { tag_name: 'nightly' }),
    ]],
    ['metasequoiaime/MSIME-Linux', [statsRelease([countedAsset(1, 'metasequoia-ime-linux_0.8.0_arm64.deb', 40)])]],
  ]));
  assert.deepEqual(stats, { total: 1142, platforms: { windows: 1000, windowsRust: 5, macos: 45, linux: 72, android: 14, harmony: 6 } });
});

test('download counts exclude drafts, unpublished releases, update payloads and non-installer assets', () => {
  const names = [
    'SHA256SUMS', 'msime-android.apk.sha256', 'msime-linux-0.13.0.tar.gz',
    'msime-macos-0.54.0-dsym.zip', 'msime-macos-0.54.0-input-method.zip', 'msime-macos-0.54.0-settings.zip',
    'MetasequoiaIME-v0.47.2-macos-universal-update.zip', 'appcast-full.xml',
    'msime-harmony-0.2.0-unsigned.hap.sha256', 'msime-harmony-0.2.0-symbols.zip',
    'msime-ios-simulator-0.52.0.tar.gz', 'msime-ios-testflight.ipa', 'msime-pinyin.db.gz', 'msime-web-engine-0.4.0.tgz',
  ];
  const stats = downloadStats(new Map([['metasequoiaime/msime', [
    statsRelease(names.map((name, index) => countedAsset(index + 1, name, 100))),
    statsRelease([countedAsset(100, 'msime-android.apk', 100)], { draft: true }),
    statsRelease([countedAsset(101, 'msime-android.apk', 100)], { published_at: null }),
  ]]]));
  assert.deepEqual(stats, { total: 0, platforms: { windows: 0, windowsRust: 0, macos: 0, linux: 0, android: 0, harmony: 0 } });
});

test('Rust Windows counts use the source repository even when old and new installers share a name', () => {
  const name = 'MetasequoiaIME_Setup_v0.2.0.exe';
  const stats = downloadStats(new Map([
    ['metasequoiaime/MSIME-Windows', [statsRelease([countedAsset(1, name, 10)])]],
    ['metasequoiaime/MSIME', [statsRelease([countedAsset(1, name, 15)]), statsRelease([countedAsset(1, name, 15)])]],
  ]));
  assert.equal(stats.platforms.windows, 10);
  assert.equal(stats.platforms.windowsRust, 15);
  assert.equal(stats.total, 25);
});

test('invalid or missing GitHub installer counters fail the sync instead of publishing a false zero', () => {
  for (const count of [-1, 1.5, '12', undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => downloadStats(new Map([['metasequoiaime/msime', [statsRelease([countedAsset(1, 'msime-android.apk', count)])]]])), /Invalid GitHub/);
  }
});

test('release pagination reads the complete history and refuses a partial result after failure', async () => {
  const urls = [];
  const first = Array.from({ length: 100 }, (_, id) => ({ id }));
  const second = [{ id: 100 }];
  const history = await fetchAllReleases('metasequoiaime/msime', {}, async url => {
    urls.push(url);
    return Response.json(url.endsWith('page=1') ? first : second);
  });
  assert.deepEqual(history, [...first, ...second]);
  assert.deepEqual(urls.map(url => new URL(url).searchParams.get('page')), ['1', '2']);
  await assert.rejects(fetchAllReleases('metasequoiaime/msime', {}, async url => url.endsWith('page=1') ? Response.json(first) : new Response(null, { status: 503 })), /HTTP 503/);
});

const asset = (name, extra = {}) => ({
  name,
  size: 1024,
  digest: `sha256:${'a'.repeat(64)}`,
  browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/v0.9.1/${name}`,
  ...extra,
});

const linuxAssets = [
  asset('metasequoia-ime-linux_0.9.1_amd64.deb'),
  asset('metasequoia-ime-linux_0.9.1_arm64.deb'),
  asset('metasequoia-ime-linux-0.9.1-1.x86_64.rpm'),
  asset('metasequoia-ime-linux-0.9.1-linux-x86_64.tar.gz'),
  asset('metasequoia-ime-linux-0.9.1.tar.gz'),
  asset('metasequoia-ime-linux_0.9.1_amd64.deb.sha256'),
  asset('product-manifest.json'),
];

test('each package is labelled with the distribution family and the architecture it is for', () => {
  const downloads = classifyAssets('linux', linuxAssets);
  assert.deepEqual(downloads.map(d => `${d.label} ${d.arch}`), [
    'Debian 12+ / Ubuntu 22.04+ · deb x86_64',
    'Debian 12+ / Ubuntu 22.04+ · deb aarch64',
    'Fedora 44 · rpm x86_64',
    'Debian 12+ / Ubuntu 22.04+ · 不经 apt 解压 · tar.gz x86_64',
  ]);
});

// linux-v0.12.1 真实发生过：rpm 标成「Fedora / openSUSE」，tar.gz 标成「通用压缩包」，可 rpm 只在 Fedora 44 上构建和验证过，tar.gz 是 Debian 多架构目录布局、Arch 与 Fedora 的 Fcitx5 加载不到它的插件；给 glibc 2.28 到 2.34 用的 legacy deb 则因为文件名对不上而根本不在页面上。
test('Linux packages are labelled with the systems they install on, and the legacy deb is listed after the full edition', () => {
  const names = [
    'msime-linux_0.12.1_amd64.deb',
    'msime-linux_0.12.1_arm64.deb',
    'msime-linux-0.12.1-1.x86_64.rpm',
    'msime-linux-0.12.1-1.aarch64.rpm',
    'msime-linux-0.12.1-linux-x86_64.tar.gz',
    'msime-linux-0.12.1-linux-aarch64.tar.gz',
    'msime-linux-legacy_0.12.1_amd64.deb',
    'msime-linux-legacy_0.12.1_arm64.deb',
    'msime-linux-pinyin_0.12.1_amd64.deb',
    'msime-linux-pinyin-0.12.1-linux-x86_64.tar.gz',
  ];
  const downloads = classifyAssets('linux', names.map(name => asset(name)));
  assert.deepEqual(downloads.map(d => `${d.name} | ${d.label} | ${d.arch}`), [
    'msime-linux_0.12.1_amd64.deb | Debian 12+ / Ubuntu 22.04+ · deb | x86_64',
    'msime-linux_0.12.1_arm64.deb | Debian 12+ / Ubuntu 22.04+ · deb | aarch64',
    'msime-linux-0.12.1-1.x86_64.rpm | Fedora 44 · rpm | x86_64',
    'msime-linux-0.12.1-1.aarch64.rpm | Fedora 44 · rpm | aarch64',
    'msime-linux-0.12.1-linux-x86_64.tar.gz | Debian 12+ / Ubuntu 22.04+ · 不经 apt 解压 · tar.gz | x86_64',
    'msime-linux-0.12.1-linux-aarch64.tar.gz | Debian 12+ / Ubuntu 22.04+ · 不经 apt 解压 · tar.gz | aarch64',
    'msime-linux-legacy_0.12.1_amd64.deb | glibc 2.28–2.34（Debian 10/11、Ubuntu 20.04、UOS 20）· 仅 IBus · deb | x86_64',
    'msime-linux-legacy_0.12.1_arm64.deb | glibc 2.28–2.34（Debian 10/11、Ubuntu 20.04、UOS 20）· 仅 IBus · deb | aarch64',
    'msime-linux-pinyin_0.12.1_amd64.deb | 水杉拼音 · Debian 12+ / Ubuntu 22.04+ · deb | x86_64',
    'msime-linux-pinyin-0.12.1-linux-x86_64.tar.gz | 水杉拼音 · Debian 12+ / Ubuntu 22.04+ · 不经 apt 解压 · tar.gz | x86_64',
  ]);
  // 主下载按钮仍是完整版的 x86_64 deb，legacy 包不会顶上去。
  assert.equal(downloads[0].name, 'msime-linux_0.12.1_amd64.deb');
});

test('checksums, build manifests and the bare source archive stay out of the download list', () => {
  const names = classifyAssets('linux', linuxAssets).map(d => d.name);
  assert.ok(!names.some(n => n.endsWith('.sha256')));
  assert.ok(!names.includes('product-manifest.json'));
  // 那个不带架构的 tar.gz 不知道是给谁的，标不出架构就不展示
  assert.ok(!names.includes('metasequoia-ime-linux-0.9.1.tar.gz'));
});

test('the merged msime repository Linux release is selected as stable', () => {
  const names = [
    'msime-linux_0.9.1_amd64.deb',
    'msime-linux-0.9.1-1.x86_64.rpm',
    'msime-linux-0.9.1-linux-x86_64.tar.gz',
  ];
  const assets = names.map(name => asset(name, {
    browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/linux-v0.9.1/${name}`,
  }));
  const chosen = selectRelease('linux', [{
    tag_name: 'linux-v0.9.1', draft: false, prerelease: false,
    published_at: '2026-10-02T16:40:49Z',
    html_url: 'https://github.com/metasequoiaime/msime/releases/tag/linux-v0.9.1',
    assets,
  }]);
  assert.equal(chosen.version, '0.9.1');
  assert.equal(chosen.releaseUrl, 'https://github.com/metasequoiaime/msime/releases/tag/linux-v0.9.1');
  assert.deepEqual(chosen.downloads.map(download => download.name), names);
});

// linux-v0.10.0 真实发生过：各版本的包与完整版同在一个发布里，API 把日语版排在前面，主下载按钮就成了日语版。
test('the full Linux package leads and the other editions are labelled by name', () => {
  const names = [
    'msime-linux-japanese_0.10.0_amd64.deb',
    'msime-linux-wubi_0.10.0_amd64.deb',
    'msime-linux_0.10.0_amd64.deb',
    'msime-linux-wubi-0.10.0-1.x86_64.rpm',
    'msime-linux-0.10.0-1.x86_64.rpm',
    'msime-linux-0.10.0-linux-x86_64.tar.gz',
    'msime-linux-korean_0.10.0_amd64.deb',
  ];
  const downloads = classifyAssets('linux', names.map(name => asset(name)));
  assert.deepEqual(downloads.map(d => `${d.name} | ${d.label}`), [
    'msime-linux_0.10.0_amd64.deb | Debian 12+ / Ubuntu 22.04+ · deb',
    'msime-linux-0.10.0-1.x86_64.rpm | Fedora 44 · rpm',
    'msime-linux-0.10.0-linux-x86_64.tar.gz | Debian 12+ / Ubuntu 22.04+ · 不经 apt 解压 · tar.gz',
    'msime-linux-wubi_0.10.0_amd64.deb | 水杉五笔 · Debian 12+ / Ubuntu 22.04+ · deb',
    'msime-linux-wubi-0.10.0-1.x86_64.rpm | 水杉五笔 · Fedora 44 · rpm',
    'msime-linux-japanese_0.10.0_amd64.deb | 水杉日语 · Debian 12+ / Ubuntu 22.04+ · deb',
  ]);
});

test('an asset hosted somewhere other than this repository is refused', () => {
  const foreign = [asset('metasequoia-ime-linux_0.9.1_amd64.deb', {
    browser_download_url: 'https://example.invalid/metasequoia-ime-linux_0.9.1_amd64.deb',
  })];
  assert.deepEqual(classifyAssets('linux', foreign), []);
});

// 真实发生过：匿名取 Linux releases 时，GitHub 回的仓库地址可能改成小写，区分大小写的前缀比较会把所有包丢掉，六个 Linux 包一个不剩，整个平台从清单里消失 —— 页面上只剩「前往发布页」，没有任何报错。
test('a repository name returned in a different case is still this repository', () => {
  const lowercased = [asset('metasequoia-ime-linux_0.9.1_amd64.deb', {
    browser_download_url: 'https://github.com/metasequoiaime/MSIME/releases/download/v0.9.1/metasequoia-ime-linux_0.9.1_amd64.deb',
  })];
  // 写进清单的是配置里那个拼法：大小写翻来翻去不该产生一份新清单
  assert.deepEqual(classifyAssets('linux', lowercased).map(d => d.url), [
    'https://github.com/metasequoiaime/msime/releases/download/v0.9.1/metasequoia-ime-linux_0.9.1_amd64.deb',
  ]);
  const chosen = selectRelease('linux', [{ tag_name: 'v0.9.1', draft: false, published_at: '2026-09-06T00:00:00Z',
    html_url: 'https://github.com/metasequoiaime/MSIME/releases/tag/v0.9.1', assets: lowercased }]);
  assert.equal(chosen.releaseUrl, 'https://github.com/metasequoiaime/msime/releases/tag/v0.9.1');
});

test('a release page hosted somewhere other than this repository is refused', () => {
  assert.equal(selectRelease('linux', [{ tag_name: 'v0.9.1', draft: false, published_at: '2026-09-06T00:00:00Z',
    html_url: 'https://example.invalid/releases/tag/v0.9.1', assets: linuxAssets }]), null);
});

test('macOS keeps the installer and archive but never the iOS build', () => {
  const macos = ['MetasequoiaIME-v0.47.2-macos-universal-unsigned.pkg',
                 'MetasequoiaIME-v0.47.2-macos-universal-unsigned.zip',
                 'MetasequoiaIME-v0.47.2-macos-universal-unsigned-update.zip',
                 'MetasequoiaIME-v0.47.2-ios-unsigned.ipa'].map(n => asset(n, {
    browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/v0.47.2/${n}`,
  }));
  const labels = classifyAssets('macos', macos).map(d => d.label);
  assert.deepEqual(labels, ['安装包 · pkg', '压缩包 · zip']);
});

test('signing is only claimed where the filenames actually declare it', () => {
  // Windows 和 macOS 的流水线把 unsigned 写进文件名，所以没有它就是签过
  assert.equal(signingState('windows', [{ name: 'MetasequoiaIME_Setup_v0.5.4.exe' }]), true);
  assert.equal(signingState('macos', [{ name: 'MetasequoiaIME-v0.47.2-macos-universal-unsigned.pkg' }]), false);
  // Linux 不走这个约定：名字里没有 unsigned 不代表签过，只能是「不知道」
  assert.equal(signingState('linux', [{ name: 'metasequoia-ime-linux_0.9.1_amd64.deb' }]), null);
  assert.equal(signingState('linux', []), null);
});

test('drafts and releases without a recognisable package are skipped', () => {
  const chosen = selectRelease('linux', [
    { tag_name: 'v0.9.3', draft: true, published_at: null, html_url: 'x', assets: linuxAssets },
    { tag_name: 'v0.9.2', draft: false, published_at: '2026-09-06T00:00:00Z', html_url: 'x', assets: [asset('notes.txt')] },
    { tag_name: 'v0.9.1', draft: false, prerelease: true, published_at: '2026-09-06T00:00:00Z',
      html_url: 'https://github.com/metasequoiaime/msime/releases/tag/v0.9.1', assets: linuxAssets },
  ]);
  assert.equal(chosen.version, '0.9.1');
  assert.equal(chosen.prerelease, true);
  assert.equal(chosen.downloads.length, 4);
});

test('nothing is returned when no release qualifies, so the page can fall back', () => {
  assert.equal(selectRelease('linux', [{ tag_name: 'v1', draft: true, assets: linuxAssets }]), null);
});

test('tags carry an optional platform prefix and build suffix, anything else is refused', () => {
  const withAssets = tag => ({
    tag_name: tag, draft: false, published_at: '2026-09-07T00:00:00Z',
    html_url: `https://github.com/metasequoiaime/msime/releases/tag/${tag}`, assets: linuxAssets,
  });
  assert.equal(selectRelease('linux', [withAssets('nightly')]), null);
  // 后缀只收字母、数字和点：版本号要拼进 markdown 和按钮文字
  assert.equal(selectRelease('linux', [withAssets('v0.9.1-[x](y)')]), null);
  // 前缀只认自己平台的，iOS 的 tag 不会被当成 Linux 或 macOS 的版本
  assert.equal(selectRelease('linux', [withAssets('ios-v0.9.1')]), null);
  assert.equal(selectRelease('linux', [withAssets('linux-v0.9.1-build.3')]).version, '0.9.1-build.3');
  assert.equal(selectRelease('linux', [withAssets('v0.6.2-beta')]).version, '0.6.2-beta');
  assert.equal(selectRelease('linux', [withAssets('v0.9.1')]).version, '0.9.1');
  assert.equal(selectRelease('linux', [withAssets('v0.9.1.2')]).version, '0.9.1.2');
});

test('versions order by numeric core, then a bare version above its suffixed builds, then build numbers numerically', () => {
  const sorted = ['0.50.0-build.9', '0.48.6', '0.50.0-build.11', '0.50.0', '0.48.6-build.1002.61.1', '0.10.0']
    .sort(versionOrder);
  assert.deepEqual(sorted, ['0.50.0', '0.50.0-build.11', '0.50.0-build.9', '0.48.6', '0.48.6-build.1002.61.1', '0.10.0']);
});

const release = (tag, prerelease, published = '2026-09-10T00:00:00Z') => ({
  tag_name: tag, draft: false, prerelease, published_at: published,
  html_url: `https://github.com/metasequoiaime/msime/releases/tag/${tag}`, assets: linuxAssets,
});

test('the stable release takes the main slot and a newer pre-release rides along as the preview', () => {
  // 取自 macOS 仓库的真实形状：每次合并自动发一个 Pre-release，人工挑过的那个才是正式版
  const chosen = selectRelease('linux', [
    release('v0.50.0-build.11', true), release('v0.50.0-build.9', true),
    release('v0.48.6-build.1002.61.1', false), release('v0.48.6', true), release('v0.46.0', false),
  ]);
  assert.equal(chosen.version, '0.48.6-build.1002.61.1');
  assert.equal(chosen.prerelease, false);
  assert.equal(chosen.preview.version, '0.50.0-build.11');
  assert.equal(chosen.preview.releaseUrl, 'https://github.com/metasequoiaime/msime/releases/tag/v0.50.0-build.11');
  assert.equal(chosen.preview.downloads.length, 4);
  assert.equal('prerelease' in chosen.preview, false);
});

test('a pre-release no newer than the stable release is not offered', () => {
  const chosen = selectRelease('linux', [release('v0.8.0', false), release('v0.6.8-beta.1', true), release('v0.8.0-rc.1', true)]);
  assert.equal(chosen.version, '0.8.0');
  assert.equal(chosen.preview, null);
});

test('without any stable release the newest pre-release keeps the platform on the page', () => {
  const chosen = selectRelease('linux', [release('v0.9.1', true), release('v0.9.0', true)]);
  assert.equal(chosen.version, '0.9.1');
  assert.equal(chosen.prerelease, true);
  assert.equal(chosen.preview, null);
});

test('the highest version wins, not the most recently published', () => {
  const at = (tag, when) => ({
    tag_name: tag, draft: false, published_at: when,
    html_url: `https://github.com/metasequoiaime/msime/releases/tag/${tag}`, assets: linuxAssets,
  });
  // 补发一个旧版本不该把页面推回去
  const chosen = selectRelease('linux', [at('v0.8.9', '2026-09-07T00:00:00Z'), at('v0.9.1', '2026-09-01T00:00:00Z')]);
  assert.equal(chosen.version, '0.9.1');
  assert.equal(selectRelease('linux', [at('v0.10.0', '2026-09-01T00:00:00Z'), at('v0.9.9', '2026-09-02T00:00:00Z')]).version, '0.10.0');
});

const macosAsset = (tag, name) => asset(name, { browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/${tag}/${name}` });
const macosRelease = (tag, names, prerelease = false) => ({
  tag_name: tag, draft: false, prerelease, published_at: '2026-10-01T00:00:00Z',
  html_url: `https://github.com/metasequoiaime/msime/releases/tag/${tag}`, assets: names.map(name => macosAsset(tag, name)),
});
const legacyMacos = tag => macosRelease(tag, [`MetasequoiaIME-${tag}-macos-universal.pkg`, `MetasequoiaIME-${tag}-macos-universal.zip`, 'appcast.xml']);

// release-macos.yml 发布的形状：macos-v<版本> 下只有 msime-macos-<版本>-<架构>.dmg 和 SHA256SUMS
test('macOS DMGs are listed per architecture, Apple silicon first, without the checksum list', () => {
  const downloads = classifyAssets('macos', ['SHA256SUMS', 'msime-macos-0.50.0-x86_64.dmg', 'msime-macos-0.50.0-arm64.dmg']
    .map(name => macosAsset('macos-v0.50.0', name)));
  assert.deepEqual(downloads.map(d => `${d.label} ${d.arch}`), ['Apple 芯片 · dmg arm64', 'Intel · dmg x86_64']);
});

test('macOS universal DMGs are listed from the current release format', () => {
  const downloads = classifyAssets('macos', ['SHA256SUMS', 'msime-macos-0.51.1-universal.dmg']
    .map(name => macosAsset('macos-v0.51.1', name)));
  assert.deepEqual(downloads.map(d => `${d.label} ${d.arch}`), ['通用 · dmg Universal']);
});

test('once a DMG release exists the pkg era releases are no longer offered', () => {
  const chosen = selectRelease('macos', [
    legacyMacos('v0.50.0-build.11'), legacyMacos('v0.50.0-build.9'),
    macosRelease('macos-v0.50.0', ['msime-macos-0.50.0-arm64.dmg', 'SHA256SUMS']),
  ]);
  assert.equal(chosen.version, '0.50.0');
  assert.deepEqual(chosen.downloads.map(d => d.name), ['msime-macos-0.50.0-arm64.dmg']);
  assert.equal(chosen.preview, null);

  // 只有预览版 DMG 时，它顶上主位，而不是让 pkg 占主按钮、DMG 屈居预览版
  const previewOnly = selectRelease('macos', [legacyMacos('v0.50.0-build.9'), macosRelease('macos-v0.50.1', ['msime-macos-0.50.1-arm64.dmg'], true)]);
  assert.equal(previewOnly.version, '0.50.1');
  assert.equal(previewOnly.downloads[0].name, 'msime-macos-0.50.1-arm64.dmg');
});

test('the universal DMG release supersedes the legacy pkg release', () => {
  const chosen = selectRelease('macos', [
    legacyMacos('v0.50.0-build.9'),
    macosRelease('macos-v0.51.1', ['msime-macos-0.51.1-universal.dmg']),
  ]);
  assert.equal(chosen.version, '0.51.1');
  assert.deepEqual(chosen.downloads.map(d => d.name), ['msime-macos-0.51.1-universal.dmg']);
  assert.equal(chosen.preview, null);
});

test('without any DMG release the pkg and zip stay on the page', () => {
  const chosen = selectRelease('macos', [legacyMacos('v0.50.0-build.9')]);
  assert.equal(chosen.version, '0.50.0-build.9');
  assert.deepEqual(chosen.downloads.map(d => d.label), ['安装包 · pkg', '压缩包 · zip']);
  assert.equal(chosen.signed, true);
});

test('a DMG name says nothing about its signature', () => {
  // 没有 Developer ID 时 package-release.sh 产出同名的 ad-hoc DMG，所以名字里没有 unsigned 推不出已签名
  assert.equal(signingState('macos', [{ name: 'msime-macos-0.50.0-arm64.dmg' }]), null);
  assert.equal(signingState('macos', [{ name: 'MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg' }]), true);
});

test('android releases offer the full APK first and each edition after it, checksums excluded', () => {
  const names = [
    'msime-android-wubi.apk',
    'msime-android.apk',
    'msime-android.apk.sha256',
    'msime-android-pinyin.apk',
    'msime-android-unknown.apk',
  ];
  const assets = names.map(name => asset(name, {
    browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/android-v0.3.1/${name}`,
  }));
  const chosen = selectRelease('android', [{
    tag_name: 'android-v0.3.1', draft: false, prerelease: false,
    published_at: '2026-10-08T08:23:22Z',
    html_url: 'https://github.com/metasequoiaime/msime/releases/tag/android-v0.3.1',
    assets,
  }]);
  assert.equal(chosen.version, '0.3.1');
  assert.deepEqual(chosen.downloads.map(d => `${d.name} ${d.label} ${d.arch}`), [
    'msime-android.apk 完整版 · apk arm64',
    'msime-android-pinyin.apk 水杉拼音 · apk arm64',
    'msime-android-wubi.apk 水杉五笔 · apk arm64',
  ]);
  assert.equal(chosen.signed, null, 'APK signing is not inferred from the file name');
});

test('HarmonyOS releases offer the HAP and exclude the checksum list', () => {
  const names = ['msime-harmony-0.2.0.hap', 'SHA256SUMS', 'msime-harmony-0.2.0.hap.sha256'];
  const assets = names.map(name => asset(name, {
    browser_download_url: `https://github.com/metasequoiaime/msime/releases/download/harmony-v0.2.0/${name}`,
  }));
  const chosen = selectRelease('harmony', [{
    tag_name: 'harmony-v0.2.0', draft: false, prerelease: false,
    published_at: '2026-10-25T14:48:25Z',
    html_url: 'https://github.com/metasequoiaime/msime/releases/tag/harmony-v0.2.0',
    assets,
  }]);
  assert.equal(chosen.version, '0.2.0');
  assert.equal(chosen.releaseUrl, 'https://github.com/metasequoiaime/msime/releases/tag/harmony-v0.2.0');
  assert.deepEqual(chosen.downloads.map(d => `${d.name} ${d.label} ${d.arch}`), [
    'msime-harmony-0.2.0.hap HarmonyOS · HAP arm64-v8a',
  ]);
  assert.equal(chosen.signed, null, 'HAP signing is not inferred from the file name');
});

test('the Rust Windows build from the main repository is the experimental release, never the main slot', () => {
  const base = 'https://github.com/metasequoiaime/msime/releases';
  const rust = (tag, prerelease, editions) => ({
    tag_name: tag, draft: false, prerelease, published_at: '2026-10-08T15:29:08Z', html_url: `${base}/tag/${tag}`,
    assets: editions.flatMap(id => [`MetasequoiaIME-${id}_Setup_v${tag.slice('windows-v'.length)}.exe`, `MetasequoiaIME-${id}_Setup_v${tag.slice('windows-v'.length)}.exe.sha256`])
      .map(name => ({ name, size: 1, browser_download_url: `${base}/download/${tag}/${name}` })),
  });
  const releases = [
    rust('windows-v0.2.0', true, ['Full']),
    rust('windows-v0.2.1', true, ['Wubi', 'Full', 'Pinyin']),
    { tag_name: 'macos-v0.54.1', draft: false, prerelease: false, published_at: '2026-10-19T00:00:00Z', html_url: `${base}/tag/macos-v0.54.1`,
      assets: [{ name: 'msime-macos-0.54.1-universal.dmg', size: 1, browser_download_url: `${base}/download/macos-v0.54.1/msime-macos-0.54.1-universal.dmg` }] },
  ];

  const chosen = selectExperimental('windows', releases);
  assert.equal(chosen.version, '0.2.1');
  assert.equal(chosen.signed, null);
  assert.equal(chosen.prerelease, undefined);
  assert.deepEqual(chosen.downloads.map(d => d.label), ['完整版 · 安装程序', '水杉拼音 · 安装程序', '水杉五笔 · 安装程序']);
  assert.equal(selectExperimental('macos', releases), null);
  assert.equal(selectExperimental('windows', []), null);
  assert.equal(selectExperimental('windows', [{ ...releases[1], draft: true }]), null);
  assert.equal(selectExperimental('windows', [{ ...releases[1], assets: [] }]), null);
  assert.equal(selectExperimental('windows', [...releases, rust('windows-v0.2.2', false, ['Full'])]).version, '0.2.2');
  // MSIME-Windows 的规则认不出主仓库的安装包，它们不会混进正式版。
  assert.deepEqual(classifyAssets('windows', releases[1].assets), []);
});

test('Windows 7 只选择版本一致的专用正式包，现代包、预发布与其他仓库不能混入', () => {
  const base = 'https://github.com/metasequoiaime/msime/releases';
  const win7 = (version, names = ['Full', 'Wubi'].flatMap(edition => ['x86', 'x64'].map(arch => `MetasequoiaIME-${edition}_Setup_v${version}_win7_${arch}.exe`))) => ({
    tag_name: `windows7-v${version}`, draft: false, prerelease: false,
    published_at: '2026-10-26T00:00:00Z', html_url: `${base}/tag/windows7-v${version}`,
    assets: names.map(name => asset(name, { browser_download_url: `${base}/download/windows7-v${version}/${name}` })),
  });
  const current = win7('1.2.0');
  for (const releases of [[win7('1.1.0'), current], [current, win7('1.1.0')]]) {
    const selected = selectWindows7(releases);
    assert.equal(selected.version, '1.2.0');
    assert.deepEqual(selected.downloads.map(item => item.arch), ['x64', 'x86', 'x64', 'x86']);
    assert.match(selected.downloads[0].name, /-Full_/);
    assert.equal(selected.signed, null);
    assert.equal(selectExperimental('windows', releases), null);
  }
  for (const releases of [[], [{ ...current, draft: true }], [{ ...current, prerelease: true }],
    [{ ...current, tag_name: 'windows-v1.2.0' }],
    [win7('1.2.0', ['MetasequoiaIME-Full_Setup_v1.2.0.exe'])],
    [win7('1.2.0', ['MetasequoiaIME-Full_Setup_v1.1.0_win7_x64.exe'])],
    [{ ...current, assets: current.assets.map(item => ({ ...item, browser_download_url: item.browser_download_url.replace('/download/windows7-v1.2.0/', '/download/windows-v1.2.0/') })) }],
    [{ ...current, assets: current.assets.map(item => ({ ...item, browser_download_url: item.browser_download_url.replace('/msime/', '/MSIME-Windows/') })) }],
  ]) assert.equal(selectWindows7(releases), null);
});
