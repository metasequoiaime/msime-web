import test from 'node:test';
import assert from 'node:assert/strict';
import { describeLinuxPackage, detectArm64, pickPrimary } from '../src/download/linux-primary.ts';

const download = (name, label, arch) => ({ name, label, arch, url: `https://github.com/metasequoiaime/msime/releases/download/linux-v0.12.1/${name}`, size: 1, sha256: null });

// The head of public/platforms.json for linux-v0.12.1, in manifest order.
const linux = [
  download('msime-linux_0.12.1_amd64.deb', 'Debian 12+ / Ubuntu 22.04+ · deb', 'x86_64'),
  download('msime-linux_0.12.1_arm64.deb', 'Debian 12+ / Ubuntu 22.04+ · deb', 'aarch64'),
  download('msime-linux-0.12.1-1.x86_64.rpm', 'Fedora 44 · rpm', 'x86_64'),
  download('msime-linux-legacy_0.12.1_arm64.deb', 'glibc 2.28–2.34（Debian 10/11、Ubuntu 20.04、UOS 20）· 仅 IBus · deb', 'aarch64'),
  download('msime-linux-pinyin_0.12.1_arm64.deb', '水杉拼音 · Debian 12+ / Ubuntu 22.04+ · deb', 'aarch64'),
];

const CHROME_LINUX_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const chromium = hints => ({ userAgent: CHROME_LINUX_UA, userAgentData: { getHighEntropyValues: async () => hints } });

test('the Linux button names the package it downloads', () => {
  assert.equal(describeLinuxPackage(linux[0]), 'deb（Debian 12+ / Ubuntu 22.04+，x86_64）');
  assert.equal(describeLinuxPackage(linux[1]), 'deb（Debian 12+ / Ubuntu 22.04+，aarch64）');
  assert.equal(describeLinuxPackage(linux[2]), 'rpm（Fedora 44，x86_64）');
  assert.equal(describeLinuxPackage({ label: 'deb', arch: 'x86_64' }), 'deb（x86_64）');
});

test('Linux offers the full x86_64 deb unless the machine is arm64, and the rest stay in the other packages list', () => {
  const x86 = pickPrimary('linux', linux, false);
  assert.equal(x86.primary.name, 'msime-linux_0.12.1_amd64.deb');
  assert.deepEqual(x86.others.map(d => d.name), linux.slice(1).map(d => d.name));

  const arm = pickPrimary('linux', linux, true);
  // The full edition's arm64 deb, not the legacy or the 水杉拼音 one that are also aarch64 debs.
  assert.equal(arm.primary.name, 'msime-linux_0.12.1_arm64.deb');
  assert.deepEqual(arm.others.map(d => d.name), linux.filter(d => d !== linux[1]).map(d => d.name));
});

test('an arm64 machine falls back to the x86_64 deb when the release has no arm64 one', () => {
  const x86Only = linux.filter(d => d.arch === 'x86_64');
  assert.equal(pickPrimary('linux', x86Only, true).primary.name, 'msime-linux_0.12.1_amd64.deb');
});

test('other platforms keep the first package whatever the machine', () => {
  const macos = [download('msime-macos-0.53.0-x86_64.dmg', 'dmg', 'x86_64'), download('msime-macos-0.53.0-arm64.dmg', 'dmg', 'aarch64')];
  assert.equal(pickPrimary('macos', macos, true).primary, macos[0]);
  assert.deepEqual(pickPrimary('linux', [], true), { primary: undefined, others: [] });
});

test('arm64 is read from the client hints where Chromium gives them', async () => {
  assert.equal(await detectArm64(chromium({ architecture: 'arm', bitness: '64' })), true);
  assert.equal(await detectArm64(chromium({ architecture: 'x86', bitness: '64' })), false);
  assert.equal(await detectArm64(chromium({ architecture: 'arm', bitness: '32' })), false, 'no package for 32-bit Arm');
  // The hints win over the User-Agent string, which Chromium freezes to x86_64 on every Linux machine.
  assert.equal(await detectArm64({ userAgent: 'Mozilla/5.0 (X11; Linux aarch64)', userAgentData: { getHighEntropyValues: async () => ({ architecture: 'x86', bitness: '64' }) } }), false);
});

test('without client hints, only an explicit aarch64 or arm64 in the User-Agent counts', async () => {
  assert.equal(await detectArm64({ userAgent: 'Mozilla/5.0 (X11; Linux aarch64; rv:140.0) Gecko/20100101 Firefox/140.0' }), true);
  assert.equal(await detectArm64({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0' }), false);
  assert.equal(await detectArm64({ userAgent: 'Mozilla/5.0 (X11; Linux armv7l; rv:140.0) Gecko/20100101 Firefox/140.0' }), false);
  assert.equal(await detectArm64({ userAgent: 'Mozilla/5.0 (X11; Linux armv8l; rv:140.0) Gecko/20100101 Firefox/140.0' }), false, 'a 32-bit userland on a 64-bit kernel');
  assert.equal(await detectArm64(undefined), false);
});

test('hints that are withheld or empty fall back to the User-Agent', async () => {
  const denied = { userAgent: 'Mozilla/5.0 (X11; Linux aarch64)', userAgentData: { getHighEntropyValues: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) } };
  assert.equal(await detectArm64(denied), true);
  assert.equal(await detectArm64({ ...chromium({ architecture: '', bitness: '' }) }), false);
  assert.equal(await detectArm64({ userAgent: CHROME_LINUX_UA, userAgentData: {} }), false);
});
