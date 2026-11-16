import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { canonicalGithubUrl } from './github-url.mjs';

const repository = 'metasequoiaime/MSIME-Windows';

export function metadataFromRelease(release, channel = 'stable') {
  if (release.draft !== false || (release.prerelease !== false && channel !== 'preview') || !release.published_at)
    throw new Error('Release is not published in the selected update channel');
  const tag = release.tag_name;
  if (typeof tag !== 'string' || !/^v?\d+\.\d+\.\d+(?:\.\d+)?$/.test(tag))
    throw new Error('Unsupported Windows release tag');
  const expectedUrl = `https://github.com/${repository}/releases/tag/${tag}`;
  // 仓库名的大小写由 GitHub 那边决定，不由这里断言，见 github-url.mjs。
  if (canonicalGithubUrl(repository, release.html_url) !== expectedUrl)
    throw new Error('Unexpected release repository or URL');
  const downloadPrefix = `https://github.com/${repository}/releases/download/${tag}/`;
  const installerUrl = asset =>
    asset.size > 0 && /^MetasequoiaIME_Setup_v.*\.exe$/i.test(asset.name)
      ? canonicalGithubUrl(repository, asset.browser_download_url)
      : null;
  const installer = release.assets?.find(asset => installerUrl(asset)?.startsWith(downloadPrefix));
  if (!installer) throw new Error('Published release has no Windows installer');
  // The digest is computed by GitHub over the stored asset, so it is not something a release author types into the notes. Publishing it here gives the download page a checksum users can verify, which matters most while the installer is unsigned and a mirror is offered alongside it.
  const digest = typeof installer.digest === 'string' && installer.digest.startsWith('sha256:')
    ? installer.digest.slice('sha256:'.length)
    : null;
  return {
    version: tag.replace(/^v/, ''),
    releaseUrl: expectedUrl,
    installerName: installer.name,
    installerUrl: installerUrl(installer),
    installerSha256: digest,
    signed: !/-unsigned\.exe$/i.test(installer.name),
  };
}

// Windows currently distributes public previews. This explicit policy preserves that channel; switching to stable is a reviewed policy change, not an automatic interpretation of "latest".
const channel = 'preview';

export function selectRelease(releases, selectedChannel) {
  const eligible = releases.flatMap(release => {
    try { return [metadataFromRelease(release, selectedChannel)]; } catch { return []; }
  });
  eligible.sort((left, right) => {
    const a = left.version.split('.').map(Number), b = right.version.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0);
    }
    return 0;
  });
  if (!eligible.length) throw new Error('No published installer in the selected update channel');
  return eligible[0];
}

async function main() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`,
    { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Release lookup failed: HTTP ${response.status}`);
  const metadata = selectRelease(await response.json(), channel);
  // Write only after the release and installer have both passed validation.
  await writeFile(new URL('../public/update.json', import.meta.url), JSON.stringify(metadata, null, 2) + '\n');
  console.log(`Generated update metadata for ${metadata.version}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
