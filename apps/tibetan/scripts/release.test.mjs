import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { selectEdition } from '../src/release.ts';

const BASE = 'https://github.com/metasequoiaime/msime/releases/download';
const file = (tag, name, extra = {}) => ({ label: '水杉藏文', arch: 'x64', name, url: `${BASE}/${tag}/${name}`, size: 1024 * 1024, sha256: 'a'.repeat(64), ...extra });
const release = (tag, version, names) => ({ version, releaseUrl: `https://github.com/metasequoiaime/msime/releases/tag/${tag}`, publishedAt: '2026-11-01T00:00:00Z', signed: null, prerelease: false, preview: null, downloads: names.map(name => file(tag, name)) });

const fixture = () => ({
  generatedAt: '2026-11-16T00:00:00Z',
  platforms: {
    windows: {
      ...release('v0.13.2', '0.13.2', ['MetasequoiaIME_Setup_v0.13.2.exe']),
      experimental: release('windows-v0.4.2', '0.4.2', ['MetasequoiaIME-Full_Setup_v0.4.2.exe', 'MetasequoiaIME-Tibetan_Setup_v0.4.2.exe', 'MetasequoiaIME-Wubi_Setup_v0.4.2.exe', 'MetasequoiaIME-Tibetan_Setup_v0.4.2_win7_x64.exe']),
    },
    macos: release('macos-v0.61.0', '0.61.0', ['msime-macos-0.61.0-universal.pkg', 'msime-macos-tibetan-0.61.0-universal.pkg', 'msime-macos-japanese-0.61.0-universal.pkg']),
    linux: release('linux-v0.17.0', '0.17.0', [
      'msime-linux_0.17.0_amd64.deb',
      'msime-linux-tibetan_0.17.0_amd64.deb',
      'msime-linux-tibetan_0.17.0_arm64.deb',
      'msime-linux-tibetan-0.17.0-1.x86_64.rpm',
      'msime-linux-tibetan-0.17.0-1.aarch64.rpm',
      'msime-linux-tibetan-0.17.0-linux-x86_64.tar.gz',
      'msime-linux-tibetan-0.17.0-linux-aarch64.tar.gz',
      'msime-linux-tibetan-legacy_0.17.0_amd64.deb',
      'msime-linux-vietnamese_0.17.0_amd64.deb',
      'msime-linux-japanese-0.17.0-1.x86_64.rpm',
    ]),
    android: release('android-v0.8.0', '0.8.0', ['msime-android.apk', 'msime-android-tibetan.apk', 'msime-android-wubi.apk']),
    harmony: release('harmony-v0.4.1', '0.4.1', ['msime-harmony.hap']),
  },
});

test('picks only the Tibetan edition by file name', () => {
  const selected = selectEdition(fixture());
  assert.deepEqual(selected.macos.downloads.map(download => download.name), ['msime-macos-tibetan-0.61.0-universal.pkg']);
  assert.deepEqual(selected.android.downloads.map(download => download.name), ['msime-android-tibetan.apk']);
  assert.deepEqual(selected.windowsPreview.downloads.map(download => download.name), ['MetasequoiaIME-Tibetan_Setup_v0.4.2.exe']);
  assert.deepEqual(selected.linux.downloads.map(download => `${download.format} ${download.arch} ${download.name}`), [
    'deb aarch64 msime-linux-tibetan_0.17.0_arm64.deb',
    'deb x86_64 msime-linux-tibetan_0.17.0_amd64.deb',
    'rpm aarch64 msime-linux-tibetan-0.17.0-1.aarch64.rpm',
    'rpm x86_64 msime-linux-tibetan-0.17.0-1.x86_64.rpm',
    'tar.gz aarch64 msime-linux-tibetan-0.17.0-linux-aarch64.tar.gz',
    'tar.gz x86_64 msime-linux-tibetan-0.17.0-linux-x86_64.tar.gz',
  ]);
});

test('a release without the edition yields an empty list, not another edition', () => {
  const manifest = fixture();
  manifest.platforms.macos = release('macos-v0.60.0', '0.60.0', ['msime-macos-0.60.0-universal.pkg']);
  manifest.platforms.windows.experimental = release('windows-v0.4.1', '0.4.1', ['MetasequoiaIME-Full_Setup_v0.4.1.exe']);
  const selected = selectEdition(manifest);
  assert.deepEqual(selected.macos.downloads, []);
  assert.equal(selected.macos.releaseUrl, 'https://github.com/metasequoiaime/msime/releases/tag/macos-v0.60.0');
  assert.deepEqual(selected.windowsPreview.downloads, []);
  delete manifest.platforms.windows.experimental;
  assert.equal(selectEdition(manifest).windowsPreview, null);
});

test('rejects a manifest that links outside the project organisation', () => {
  const manifest = fixture();
  manifest.platforms.android.downloads[1].url = 'https://example.com/msime-android-tibetan.apk';
  assert.throws(() => selectEdition(manifest));
});

test('keeps the mirror only when it is an https URL', () => {
  const manifest = fixture();
  manifest.platforms.android.downloads[1].mirrorUrl = 'javascript:alert(1)';
  assert.equal(selectEdition(manifest).android.downloads[0].mirrorUrl, undefined);
  manifest.platforms.android.downloads[1].mirrorUrl = 'https://dl.msime.app/releases/msime/android-v0.8.0/msime-android-tibetan.apk';
  assert.equal(selectEdition(manifest).android.downloads[0].mirrorUrl, 'https://dl.msime.app/releases/msime/android-v0.8.0/msime-android-tibetan.apk');
});

test('the copied official manifest parses and offers Tibetan Linux and Android packages', () => {
  const selected = selectEdition(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));
  const names = [...selected.macos.downloads, ...selected.linux.downloads, ...selected.android.downloads, ...(selected.windowsPreview?.downloads ?? [])].map(download => download.name);
  for (const name of names) assert.match(name, /tibetan/i);
  assert.equal(selected.linux.downloads.length, 6);
  assert.equal(selected.android.downloads.length, 1);
});
