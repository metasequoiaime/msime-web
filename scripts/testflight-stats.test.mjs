import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTestFlightStats } from '../shared/testflight-stats.ts';
import { nextSnapshot } from './apply-testflight-stats.mjs';

const stats = { schemaVersion: 1, generatedAt: '2026-10-21T10:00:00.000Z', installs: 20, buildCount: 2, periodStart: '2026-10-01', periodEnd: '2026-10-21' };
const event = value => ({ action: 'testflight-stats-v1', client_payload: value });
const now = Date.parse('2026-10-21T12:00:00.000Z');

test('snapshot accepts a real zero, has an explicit unavailable state and strips unrelated fields', () => {
  assert.equal(parseTestFlightStats(null), null);
  assert.deepEqual(parseTestFlightStats({ ...stats, installs: 0, raw: { syntheticTester: true } }), { ...stats, installs: 0 });
});

test('snapshot rejects invalid protocol, count and calendar values', () => {
  for (const value of [undefined, {}, { ...stats, schemaVersion: 2 }, { ...stats, installs: -1 }, { ...stats, installs: '20' }, { ...stats, installs: Number.MAX_SAFE_INTEGER + 1 }, { ...stats, buildCount: 0 }, { ...stats, generatedAt: 'invalid' }, { ...stats, periodStart: '2026-02-30' }, { ...stats, periodEnd: '2026-09-01' }]) {
    assert.throws(() => parseTestFlightStats(value), /Invalid TestFlight/);
  }
});

test('late, duplicate and unchanged events preserve the published snapshot', () => {
  assert.deepEqual(nextSnapshot(event({ ...stats, generatedAt: '2026-10-21T09:00:00.000Z', installs: 1 }), stats, now), stats);
  assert.deepEqual(nextSnapshot(event(stats), stats, now), stats);
  assert.deepEqual(nextSnapshot(event({ ...stats, generatedAt: '2026-10-21T11:00:00.000Z' }), stats, now), stats);
});

test('new count and Apple corrections update independently of the GitHub download total', () => {
  assert.deepEqual(nextSnapshot(event(stats), null, now), stats);
  const corrected = { ...stats, generatedAt: '2026-10-21T11:00:00.000Z', installs: 15 };
  assert.deepEqual(nextSnapshot(event(corrected), stats, now), corrected);
  assert.throws(() => nextSnapshot(event(null), stats, now));
  assert.throws(() => nextSnapshot({ action: 'unrelated', client_payload: stats }, null, now));
  assert.throws(() => nextSnapshot(event({ ...stats, generatedAt: '2026-10-22T10:00:00.000Z' }), stats, now));
});
