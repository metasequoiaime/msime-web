import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { editionDownloads, linuxPackages, macosPackages, windowsPackages } from '../src/download/editions.ts';
import { platformsSchema } from '../src/platforms-data.ts';

// The copy scripts/sync-release-data.mjs makes of the official site's manifest; `pnpm test` runs the sync first.
const manifest = platformsSchema.parse(JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8')));
const raw = JSON.parse(readFileSync(new URL('../public/platforms.json', import.meta.url), 'utf8'));
const allNames = Object.values(raw.platforms).flatMap(release => [release, release?.experimental, release?.preview, release?.windows7].filter(Boolean).flatMap(entry => entry.downloads.map(download => download.name)));

test('the copied manifest parses with every platform the page reads', () => {
  for (const platform of ['windows', 'macos', 'linux', 'android']) assert.ok(manifest.platforms[platform], `${platform} release missing or rejected`);
});

test('only this edition\'s files are selected, by file name', () => {
  const editions = editionDownloads(manifest);
  const selected = [...editions.macos.files, ...editions.linux.files.map(item => item.download), ...editions.android.files, ...editions.windows.files];
  assert.ok(selected.length > 0);
  for (const download of selected) assert.match(download.name, /japanese/i, `${download.name} is not a 水杉日语 file`);
});

test('every Japanese Linux and Android file in the manifest is offered', () => {
  const editions = editionDownloads(manifest);
  const linux = raw.platforms.linux.downloads.map(download => download.name).filter(name => name.startsWith('msime-linux-japanese'));
  assert.deepEqual(editions.linux.files.map(item => item.download.name).sort(), linux.sort());
  assert.equal(linux.length, 6, 'deb, rpm and tar.gz for x86_64 and aarch64');
  assert.deepEqual(new Set(editions.linux.files.map(item => `${item.format}/${item.arch}`)), new Set(['deb/x86_64', 'deb/aarch64', 'rpm/x86_64', 'rpm/aarch64', 'tar/x86_64', 'tar/aarch64']));
  assert.deepEqual(editions.android.files.map(download => download.name), ['msime-android-japanese.apk']);
});

test('no other edition or the full product slips through', () => {
  const others = allNames.filter(name => !/japanese/i.test(name));
  const release = names => ({ version: '1.0.0', releaseUrl: 'https://github.com/metasequoiaime/msime/releases/tag/x', publishedAt: '', downloads: names.map(name => ({ name, url: `https://github.com/metasequoiaime/msime/releases/download/x/${name}`, size: 1, sha256: null })) });
  assert.deepEqual(macosPackages(release(others)), []);
  assert.deepEqual(linuxPackages(release(others)), []);
  assert.deepEqual(windowsPackages(release(others)), []);
});

test('file names the release workflows produce are recognised', () => {
  const release = names => ({ version: '1.0.0', releaseUrl: 'https://github.com/metasequoiaime/msime/releases/tag/x', publishedAt: '', downloads: names.map(name => ({ name, url: `https://github.com/metasequoiaime/msime/releases/download/x/${name}`, size: 1, sha256: null })) });
  assert.deepEqual(macosPackages(release(['msime-macos-japanese-0.60.0-universal.pkg', 'msime-macos-0.60.0-universal.pkg', 'msime-macos-wubi-0.60.0-universal.pkg'])).map(download => download.name), ['msime-macos-japanese-0.60.0-universal.pkg']);
  assert.deepEqual(windowsPackages(release(['MetasequoiaIME-Japanese_Setup_v0.5.0.exe', 'MetasequoiaIME-Full_Setup_v0.5.0.exe', 'MetasequoiaIME-Japanese_Setup_v0.5.0.exe.sha256'])).map(download => download.name), ['MetasequoiaIME-Japanese_Setup_v0.5.0.exe']);
});
