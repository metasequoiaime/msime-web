import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differsBeyondTimestamp } from './manifest-changed.mjs';

const manifest = (generatedAt, stars) => JSON.stringify({ generatedAt, totalStars: stars, repoCount: 14 });

test('a manifest that moved only its timestamp is not a change', () => {
  assert.equal(differsBeyondTimestamp(manifest('2026-09-20T00:00:00.000Z', 1554), manifest('2026-09-20T00:30:00.000Z', 1554)), false);
});

test('a real difference is still a change, timestamp or not', () => {
  assert.equal(differsBeyondTimestamp(manifest('2026-09-20T00:00:00.000Z', 1554), manifest('2026-09-20T00:30:00.000Z', 1555)), true);
  assert.equal(differsBeyondTimestamp(manifest('2026-09-20T00:00:00.000Z', 1554), manifest('2026-09-20T00:00:00.000Z', 1555)), true);
});

test('key order and nesting are compared, not just the fields this file knows about', () => {
  const before = JSON.stringify({ generatedAt: 'a', contributors: [{ login: 'houko', contributions: 2119 }] });
  const after = JSON.stringify({ generatedAt: 'b', contributors: [{ login: 'houko', contributions: 2120 }] });
  assert.equal(differsBeyondTimestamp(before, after), true);
  const reordered = JSON.stringify({ generatedAt: 'b', contributors: [{ contributions: 2119, login: 'houko' }] });
  assert.equal(differsBeyondTimestamp(before, reordered), true, 'a generator that reorders its output has changed it');
});

test('a missing or unreadable previous manifest proposes the change rather than swallowing it', () => {
  assert.equal(differsBeyondTimestamp('', manifest('2026-09-20T00:00:00.000Z', 1554)), true);
  assert.equal(differsBeyondTimestamp('not json', manifest('2026-09-20T00:00:00.000Z', 1554)), true);
  assert.equal(differsBeyondTimestamp(manifest('2026-09-20T00:00:00.000Z', 1554), 'truncated {'), true);
});

test('镜像统计只有获取时间变化时不创建空 PR，计数变化仍发布', () => {
  const before = { generatedAt: 'old', mirrorDownloadStats: { generatedAt: 'old', total: 2, platforms: { windows: 2 } } };
  const next = { ...before, generatedAt: 'new', mirrorDownloadStats: { ...before.mirrorDownloadStats, generatedAt: 'new' } };
  assert.equal(differsBeyondTimestamp(JSON.stringify(before), JSON.stringify(next)), false);
  assert.equal(differsBeyondTimestamp(JSON.stringify(before), JSON.stringify({ ...next, mirrorDownloadStats: { ...next.mirrorDownloadStats, total: 3, platforms: { windows: 3 } } })), true);
});
