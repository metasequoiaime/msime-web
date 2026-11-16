import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

// Run after deployment: these checks exercise Cloudflare rules, not just repository configuration.
const response = url => {
  const raw = execFileSync('curl', ['--silent', '--show-error', '--max-time', '25', '--output', '/dev/null', '--write-out', '%{http_code}\n%{redirect_url}', url], { encoding: 'utf8' });
  const [status, location] = raw.split('\n');
  return { status: Number(status), location };
};

for (const host of ['www.msime.app', 'metasequoiaime.pages.dev']) {
  test(`${host} redirects root, guides and AI files with paths and queries intact`, () => {
    for (const scheme of ['http', 'https']) for (const path of ['/', '/docs/windows/', '/docs/macos/', '/llms.txt']) {
      const suffix = `${path}?utm_source=seo-check&value=a%2Fb`;
      assert.deepEqual(response(`${scheme}://${host}${suffix}`), { status: 301, location: `https://msime.app${suffix}` });
    }
  });
}

test('canonical host serves pages and retains real 404 responses', () => {
  for (const path of ['/', '/docs/windows/', '/sitemap.xml', '/llms.txt']) assert.equal(response(`https://msime.app${path}`).status, 200);
  assert.equal(response('https://msime.app/seo-check-not-a-real-page/').status, 404);
});
