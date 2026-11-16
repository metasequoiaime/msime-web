import assert from 'node:assert/strict';
import test from 'node:test';
import { metadataFromRelease, selectRelease } from './generate-update.mjs';

const release = {
  draft: false, prerelease: false, published_at: '2026-09-05T00:00:00Z', tag_name: '0.0.9.2',
  html_url: 'https://github.com/metasequoiaime/MSIME-Windows/releases/tag/0.0.9.2',
  assets: [{ name: 'MetasequoiaIME_Setup_v0.0.9.2-unsigned.exe', size: 100,
    digest: 'sha256:' + 'a'.repeat(64),
    browser_download_url: 'https://github.com/metasequoiaime/MSIME-Windows/releases/download/0.0.9.2/setup.exe' }],
};

const expected = {
  version: '0.0.9.2',
  releaseUrl: release.html_url,
  installerName: release.assets[0].name,
  installerUrl: release.assets[0].browser_download_url,
  installerSha256: 'a'.repeat(64),
  signed: false,
};
test('published Windows installer produces the existing update API', () => {
  assert.deepEqual(metadataFromRelease(release), expected);
});

// The download page renders its security note from these two fields, so getting them wrong is how a page ends up telling users to verify a signature that is not there.
test('the installer digest and signing state come from the asset, not from prose', () => {
  const signed = {...release, assets: [{...release.assets[0], name: 'MetasequoiaIME_Setup_v0.0.9.2.exe'}]};
  assert.equal(metadataFromRelease(signed).signed, true);
  assert.equal(metadataFromRelease(release).signed, false);

  const noDigest = {...release, assets: [{...release.assets[0], digest: undefined}]};
  assert.equal(metadataFromRelease(noDigest).installerSha256, null);

  const md5 = {...release, assets: [{...release.assets[0], digest: 'md5:' + 'b'.repeat(32)}]};
  assert.equal(metadataFromRelease(md5).installerSha256, null);
});
test('drafts, prereleases, absent installers and foreign URLs cannot advertise an update', () => {
  for (const change of [{draft: true}, {prerelease: true}, {published_at: null}, {assets: []},
    {html_url: 'https://example.com/release'}, {tag_name: '../main'}]) {
    assert.throws(() => metadataFromRelease({...release, ...change}));
  }
});

// GitHub 回的仓库名大小写不稳定（见 github-url.mjs）。按字面比较的话，回小写的那一轮会被判成「不是我们的仓库」，整轮同步抛错失败；而放行之后如果把原样地址写进去，大小写每翻一次就是一份新清单、一个 PR 和一次部署。
test('a lowercased repository in the returned URLs is accepted and written back in canonical form', () => {
  const lowercased = {
    ...release,
    html_url: 'https://github.com/metasequoiaime/msime-windows/releases/tag/0.0.9.2',
    assets: [{ ...release.assets[0],
      browser_download_url: 'https://github.com/metasequoiaime/msime-windows/releases/download/0.0.9.2/setup.exe' }],
  };
  assert.deepEqual(metadataFromRelease(lowercased), expected);
  // 另一个仓库还是另一个仓库，不是大小写问题
  assert.throws(() => metadataFromRelease({ ...lowercased,
    html_url: 'https://github.com/metasequoiaime/msime-windows-mirror/releases/tag/0.0.9.2' }));
});

test('preview policy accepts published previews but excludes newer drafts and missing installers', () => {
  const preview = {...release, prerelease: true};
  assert.deepEqual(selectRelease([{...preview, draft: true}, {...preview, assets: []}, preview], 'preview'),
    expected);
  assert.throws(() => selectRelease([preview], 'stable'));
});
