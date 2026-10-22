import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPgyerDownloadStats, pgyerSnapshot } from './pgyer-download-stats.mjs';

const date = '2026-10-22T00:00:00.000Z';
const build = (buildKey, buildDownloadCount) => ({ buildKey, buildDownloadCount, buildType: '2' });

test('蒲公英累计保留各版本最高计数，删除、重复分页和回退不丢历史', () => {
  const first = pgyerSnapshot([build('synthetic-a', '12'), build('synthetic-b', 3), build('synthetic-a', 12)], undefined, date);
  assert.equal(first.total, 15);
  assert.equal(first.builds.length, 2);
  assert.doesNotMatch(JSON.stringify(first), /synthetic-|buildKey|_api_key/);
  const next = pgyerSnapshot([build('synthetic-b', 2), build('synthetic-c', 4)], first, date);
  assert.equal(next.total, 19);
  assert.deepEqual(pgyerSnapshot([], next, date), next);
  assert.deepEqual(pgyerSnapshot([build('synthetic-c', 4)], next, date), next);
  assert.equal(pgyerSnapshot([build('synthetic-zero', 0)], undefined, date).total, 0);
  for (const count of [undefined, -1, 'bad', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => pgyerSnapshot([build('synthetic-invalid', count)], undefined, date));
  }
  assert.throws(() => pgyerSnapshot([{ ...build('synthetic-ios', 1), buildType: '1' }], undefined, date));
});

function fakeApi(transform = (_route, _page, data) => data) {
  const calls = [];
  const request = async (url, init) => {
    const route = url.split('/').at(-1);
    assert.equal(new URL(url).origin, 'https://www.pgyer.com');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.get('_api_key'), 'synthetic-api-key');
    const page = Number(init.body.get('page'));
    calls.push([route, page]);
    const data = route === 'getByShortcut' ? { buildShortcutUrl: 'msime', buildKey: 'synthetic-latest', buildType: '2' }
      : route === 'listMy' ? { page, pageCount: 2, list: page === 2 ? [{ buildKey: 'synthetic-latest', buildType: '2', appKey: 'synthetic-app' }] : [] }
      : { currentPage: page, pageCount: 2, list: page === 1 ? [build('synthetic-old', 5)] : [build('synthetic-latest', 7), build('synthetic-old', 5)] };
    return Response.json({ code: 0, data: transform(route, page, data) });
  };
  return { calls, request };
}

test('蒲公英按短链接定位 Android 应用并读取全部版本页，历史累计不使用今日数', async () => {
  const { request, calls } = fakeApi();
  const snapshot = await loadPgyerDownloadStats('synthetic-api-key', undefined, request);
  assert.equal(snapshot.total, 12);
  assert.equal(snapshot.builds.length, 2);
  assert.deepEqual(calls, [['getByShortcut', 0], ['listMy', 1], ['listMy', 2], ['builds', 1], ['builds', 2]]);
});

test('蒲公英鉴权、分页或累计字段失效时拒绝产生不完整快照，异常不回显凭据', async () => {
  for (const transform of [
    (route, _page, data) => route === 'getByShortcut' ? { ...data, buildType: '1' } : data,
    (route, _page, data) => route === 'builds' ? { ...data, currentPage: 99 } : data,
    (route, _page, data) => route === 'builds' ? { ...data, list: [build('synthetic-bad', undefined)] } : data,
  ]) await assert.rejects(loadPgyerDownloadStats('synthetic-api-key', undefined, fakeApi(transform).request));
  await assert.rejects(loadPgyerDownloadStats('synthetic-api-key', undefined, async () => Response.json({ code: 1002, message: 'synthetic-secret-error' })), error => !error.message.includes('synthetic-secret-error'));
  await assert.rejects(loadPgyerDownloadStats('synthetic-api-key', undefined, async () => new Response(null, { status: 503 })));
});
