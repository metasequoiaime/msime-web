import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAssets, selectRelease, signingState, versionOrder } from './generate-platforms.mjs';

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
    'Debian / Ubuntu · deb x86_64',
    'Debian / Ubuntu · deb aarch64',
    'Fedora / openSUSE · rpm x86_64',
    '通用压缩包 · tar.gz x86_64',
  ]);
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
    'msime-linux_0.10.0_amd64.deb | Debian / Ubuntu · deb',
    'msime-linux-0.10.0-1.x86_64.rpm | Fedora / openSUSE · rpm',
    'msime-linux-0.10.0-linux-x86_64.tar.gz | 通用压缩包 · tar.gz',
    'msime-linux-wubi_0.10.0_amd64.deb | 水杉五笔 · Debian / Ubuntu · deb',
    'msime-linux-wubi-0.10.0-1.x86_64.rpm | 水杉五笔 · Fedora / openSUSE · rpm',
    'msime-linux-japanese_0.10.0_amd64.deb | 水杉日语 · Debian / Ubuntu · deb',
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
