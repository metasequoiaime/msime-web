import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { classify, editionReleases, manifestSchema } from '../src/release-data.ts';

const manifest = () => manifestSchema.parse(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));

test('installers are picked by file name for this edition only', () => {
  assert.deepEqual(classify('macos', 'msime-macos-wubi-0.60.0-universal.pkg', '0.60.0'), { arch: 'universal', format: 'pkg' });
  assert.equal(classify('macos', 'msime-macos-0.60.0-universal.pkg', '0.60.0'), null);
  assert.equal(classify('macos', 'msime-macos-pinyin-0.60.0-universal.pkg', '0.60.0'), null);
  assert.deepEqual(classify('android', 'msime-android-wubi.apk', '0.7.4'), { arch: 'arm64', format: 'apk' });
  assert.equal(classify('android', 'msime-android.apk', '0.7.4'), null);
  assert.deepEqual(classify('windows', 'MetasequoiaIME-Wubi_Setup_v0.4.1.exe', '0.4.1'), { arch: 'x86_64', format: 'exe' });
  assert.equal(classify('windows', 'MetasequoiaIME-Full_Setup_v0.4.1.exe', '0.4.1'), null);
  assert.deepEqual(classify('linux', 'msime-linux-wubi_0.16.1_amd64.deb', '0.16.1'), { arch: 'x86_64', format: 'deb' });
  assert.deepEqual(classify('linux', 'msime-linux-wubi_0.16.1_arm64.deb', '0.16.1'), { arch: 'aarch64', format: 'deb' });
  assert.deepEqual(classify('linux', 'msime-linux-wubi-0.16.1-1.aarch64.rpm', '0.16.1'), { arch: 'aarch64', format: 'rpm' });
  assert.deepEqual(classify('linux', 'msime-linux-wubi-0.16.1-linux-x86_64.tar.gz', '0.16.1'), { arch: 'x86_64', format: 'tar.gz' });
  for (const other of ['msime-linux_0.16.1_amd64.deb', 'msime-linux-legacy_0.16.1_amd64.deb', 'msime-linux-pinyin_0.16.1_amd64.deb', 'msime-linux-japanese-0.16.1-1.x86_64.rpm', 'SHA256SUMS']) assert.equal(classify('linux', other, '0.16.1'), null, other);
});

test('the copied manifest yields this edition\'s Linux and Android files', () => {
  const releases = editionReleases(manifest());
  assert.equal(releases.linux.files.length, 6);
  assert.deepEqual(releases.linux.files.map(file => `${file.format}/${file.arch}`), ['deb/x86_64', 'deb/aarch64', 'rpm/x86_64', 'rpm/aarch64', 'tar.gz/x86_64', 'tar.gz/aarch64']);
  assert.deepEqual(releases.android.files.map(file => file.name), ['msime-android-wubi.apk']);
  for (const file of [...releases.linux.files, ...releases.android.files, ...releases.macos.files]) {
    assert.match(file.name, /wubi/i);
    assert.ok(file.url.startsWith('https://github.com/metasequoiaime/'));
    assert.ok(file.size > 0);
  }
  assert.ok(releases.macos.files.every(file => file.name.startsWith('msime-macos-wubi-')));
  assert.ok(releases.windowsStable.version);
});

test('a link outside the project organization rejects the manifest', () => {
  const raw = JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8'));
  raw.platforms.android.downloads[0].url = 'https://example.com/evil.apk';
  assert.throws(() => manifestSchema.parse(raw));
});
