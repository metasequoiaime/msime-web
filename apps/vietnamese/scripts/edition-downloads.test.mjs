import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { editionDownloads } from '../src/data/edition.ts';
import { platformsSchema } from '../src/platforms-data.ts';

const BASE = 'https://github.com/metasequoiaime/msime/releases';
const file = (name, extra = {}) => ({ label: '完整版 · 安装包', arch: 'x86_64', name, url: `${BASE}/download/x/${name}`, size: 1024, sha256: 'a'.repeat(64), ...extra });
const release = (tag, names, extra = {}) => ({ version: tag.replace(/^[a-z0-9-]*v(?=\d)/, ''), releaseUrl: `${BASE}/tag/${tag}`, publishedAt: '2026-11-01T00:00:00Z', signed: null, downloads: names.map(name => file(name)), experimental: null, ...extra });

test('selects only this edition by file name, never the full edition or other single-scheme editions', () => {
  const manifest = platformsSchema.parse({
    generatedAt: '2026-11-16T00:00:00Z',
    platforms: {
      linux: release('linux-v0.16.1', [
        'msime-linux_0.16.1_amd64.deb', 'msime-linux-wubi_0.16.1_amd64.deb', 'msime-linux-vietnamese-0.16.1-linux-aarch64.tar.gz',
        'msime-linux-vietnamese_0.16.1_arm64.deb', 'msime-linux-vietnamese-0.16.1-1.x86_64.rpm', 'msime-linux-vietnamese_0.16.1_amd64.deb',
        'msime-linux-legacy_0.16.1_amd64.deb',
      ]),
      android: release('android-v0.7.4', ['msime-android.apk', 'msime-android-vietnamese.apk', 'msime-android-japanese.apk']),
      macos: release('macos-v0.60.0', ['msime-macos-0.60.0-universal.pkg', 'msime-macos-vietnamese-0.60.0-universal.pkg', 'msime-macos-tibetan-0.60.0-universal.pkg']),
      windows: release('v0.13.2', ['MetasequoiaIME_Setup_v0.13.2.exe'], {
        releaseUrl: 'https://github.com/metasequoiaime/MSIME-Windows/releases/tag/v0.13.2',
        experimental: release('windows-v0.4.1', ['MetasequoiaIME-Full_Setup_v0.4.1.exe', 'MetasequoiaIME-Vietnamese_Setup_v0.4.1.exe', 'MetasequoiaIME-Wubi_Setup_v0.4.1.exe']),
      }),
    },
  });
  const downloads = editionDownloads(manifest);
  assert.deepEqual(downloads.linux.release.files.map(f => [f.name, f.format, f.cpu]), [
    ['msime-linux-vietnamese_0.16.1_amd64.deb', 'deb', 'x86_64'],
    ['msime-linux-vietnamese_0.16.1_arm64.deb', 'deb', 'aarch64'],
    ['msime-linux-vietnamese-0.16.1-1.x86_64.rpm', 'rpm', 'x86_64'],
    ['msime-linux-vietnamese-0.16.1-linux-aarch64.tar.gz', 'tar.gz', 'aarch64'],
  ]);
  assert.deepEqual(downloads.android.release.files.map(f => f.name), ['msime-android-vietnamese.apk']);
  assert.deepEqual(downloads.macos.release.files.map(f => f.name), ['msime-macos-vietnamese-0.60.0-universal.pkg']);
  assert.deepEqual(downloads.windows.release.files.map(f => f.name), ['MetasequoiaIME-Vietnamese_Setup_v0.4.1.exe']);
  assert.equal(downloads.windows.release.version, '0.4.1');
});

test('a platform without this edition falls back to its release page instead of an empty list', () => {
  const manifest = platformsSchema.parse({
    generatedAt: '2026-11-16T00:00:00Z',
    platforms: {
      macos: release('macos-v0.60.0', ['msime-macos-0.60.0-universal.pkg']),
      windows: release('v0.13.2', ['MetasequoiaIME_Setup_v0.13.2.exe'], { experimental: release('windows-v0.4.1', ['MetasequoiaIME-Full_Setup_v0.4.1.exe']) }),
    },
  });
  const downloads = editionDownloads(manifest);
  assert.equal(downloads.macos.release, null);
  assert.equal(downloads.macos.fallbackUrl, `${BASE}/tag/macos-v0.60.0`);
  assert.equal(downloads.windows.release, null);
  assert.equal(downloads.windows.fallbackUrl, `${BASE}/tag/windows-v0.4.1`);
  assert.equal(editionDownloads(undefined).linux.fallbackUrl, BASE);
});

test('the manifest copied from apps/web parses and lists this edition for Linux and Android', () => {
  const manifest = platformsSchema.parse(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));
  const downloads = editionDownloads(manifest);
  for (const platform of ['linux', 'android']) {
    assert.ok(downloads[platform].release?.files.length, `${platform} has installers`);
    for (const entry of downloads[platform].release.files) assert.match(entry.name, /vietnamese/);
  }
});

test('a URL outside the project organisation rejects the manifest', () => {
  assert.throws(() => platformsSchema.parse({ generatedAt: 'x', platforms: { android: release('android-v1', ['msime-android-vietnamese.apk'], { releaseUrl: 'https://evil.example/' }) } }));
});
