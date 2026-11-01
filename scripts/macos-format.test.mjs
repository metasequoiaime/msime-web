import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isCurrentMacosPackage, macosFormat, macosInstallBlocks } from '../src/download/macos-format.ts';

const source = readFileSync(new URL('../src/content/download.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const release = (...names) => ({ downloads: names.map(name => ({ name })) });
const macosSection = text => text.slice(text.indexOf('## macOS'), text.indexOf('## Linux'));

const DMG_STEP = '打开下载的 DMG，把 MSIME 拖到「应用程序」。';
const PKG_STEP = '双击下载的 pkg 安装包，按安装器的提示继续。';
const LEGACY_STEP = '安装包直接双击运行；';

test('each macOS package generation is told apart by its full file name', () => {
  assert.equal(macosFormat(release('msime-macos-0.57.0-universal.pkg')), 'pkg');
  assert.equal(macosFormat(release('msime-macos-0.56.1-universal.dmg')), 'dmg');
  assert.equal(macosFormat(release('msime-macos-0.50.0-arm64.dmg', 'msime-macos-0.50.0-x86_64.dmg')), 'dmg');
  assert.equal(macosFormat(release('MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg', 'MetasequoiaIME-v0.50.0-build.9-macos-universal.zip')), 'legacy');
  assert.equal(isCurrentMacosPackage('msime-macos-0.57.0-universal.pkg'), true);
  assert.equal(isCurrentMacosPackage('msime-macos-0.56.1-universal.dmg'), true);
  assert.equal(isCurrentMacosPackage('MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg'), false);
});

test('a pkg download gets the pkg install steps, the Homebrew password note and the pkg troubleshooting items', () => {
  const text = macosSection(macosInstallBlocks(source, release('msime-macos-0.57.0-universal.pkg')));
  assert.ok(text.includes(PKG_STEP));
  assert.ok(text.includes('安装时要输入管理员密码，管理员账户也要输；没有管理员密码的账户装不了。'));
  assert.ok(text.includes('`brew install --cask metasequoiaime/tap/msime`，安装时会要求输入 sudo 密码'));
  assert.ok(text.includes('### 装好后找不到水杉输入法？'));
  assert.ok(text.includes('- **装完 pkg 没有在 MSIME 里完成安装**'));
  assert.ok(text.includes('依次检查：\n\n- **装完 pkg 没有在 MSIME 里完成安装**'), 'no blank line left where the DMG item was');
  assert.ok(!text.includes(DMG_STEP));
  assert.ok(!text.includes('只拖进了「应用程序」'));
  assert.ok(!text.includes('装过旧版 pkg 安装包'));
  assert.ok(!text.includes(LEGACY_STEP));
  assert.ok(!/\{\{[#/]/.test(text), 'every block marker is consumed');
});

test('a DMG download keeps the DMG steps and its troubleshooting items, and is also the fallback', () => {
  for (const macos of [release('msime-macos-0.56.1-universal.dmg'), undefined]) {
    const text = macosSection(macosInstallBlocks(source, macos));
    assert.ok(text.includes(DMG_STEP));
    assert.ok(text.includes('依次检查：\n\n- **只拖进了「应用程序」，没有完成安装**'));
    assert.ok(text.includes('- **装过旧版 pkg 安装包**'));
    assert.ok(!text.includes(PKG_STEP));
    assert.ok(!text.includes('brew install'));
    assert.ok(!text.includes('装完 pkg 没有在 MSIME 里完成安装'));
    assert.ok(!text.includes(LEGACY_STEP));
    assert.ok(!/\{\{[#/]/.test(text));
  }
});

test('a pkg era download keeps only the old instructions', () => {
  const text = macosSection(macosInstallBlocks(source, release('MetasequoiaIME-v0.50.0-build.9-macos-universal.pkg')));
  assert.ok(text.includes(LEGACY_STEP));
  assert.ok(!text.includes(DMG_STEP));
  assert.ok(!text.includes(PKG_STEP));
  assert.ok(!text.includes('装好后找不到水杉输入法'));
  assert.ok(!/\{\{[#/]/.test(text));
});
