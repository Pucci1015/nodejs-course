// 練習問題9 用: lag-monitor.mjs の createLagMonitor のテスト
// 使い方: node --test lag-monitor.test.mjs
//   模範解答を試す: MODULE=../solutions/lag-monitor.mjs node --test lag-monitor.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './lag-monitor.mjs');
const moduleUrl = pathToFileURL(modulePath).href;
const { createLagMonitor } = await import(moduleUrl);

const busy = (ms) => {
  const end = performance.now() + ms;
  while (performance.now() < end);
};

test('何も止まっていなければ、onLag は呼ばれない', async () => {
  const lags = [];
  const monitor = createLagMonitor({ intervalMs: 10, thresholdMs: 50, onLag: (info) => lags.push(info) });
  await sleep(200);
  monitor.stop();
  assert.deepEqual(lags, []);
  assert.equal(monitor.stats().count, 0);
  assert.ok(monitor.stats().max < 40, `何もしていないのに最大 ${monitor.stats().max}ms 遅れた`);
});

test('200ms 止めたら、1回だけ onLag が呼ばれ、遅れた時間が分かる', async () => {
  const lags = [];
  const monitor = createLagMonitor({ intervalMs: 10, thresholdMs: 50, onLag: (info) => lags.push(info) });
  await sleep(30);
  busy(200);
  await sleep(50);
  monitor.stop();
  assert.equal(lags.length, 1, `onLag が ${lags.length} 回呼ばれた`);
  assert.ok(lags[0].lagMs >= 150 && lags[0].lagMs <= 260, `lagMs が ${lags[0].lagMs}`);
  assert.ok(Number.isInteger(lags[0].lagMs), 'lagMs は整数（ミリ秒）に丸める');
  assert.ok(lags[0].at instanceof Date);
});

test('stats() は、遅れの最大と、止まった回数を返す', async () => {
  const monitor = createLagMonitor({ intervalMs: 10, thresholdMs: 50 });
  await sleep(30);
  busy(120);
  await sleep(30);
  busy(80);
  await sleep(30);
  monitor.stop();
  const { max, count } = monitor.stats();
  assert.equal(count, 2);
  assert.ok(max >= 90 && max <= 180, `max が ${max}`);
});

test('stop() の後は、止まっても onLag を呼ばない', async () => {
  let calls = 0;
  const monitor = createLagMonitor({ intervalMs: 10, thresholdMs: 50, onLag: () => calls++ });
  await sleep(30);
  monitor.stop();
  busy(150);
  await sleep(50);
  assert.equal(calls, 0);
});

test('見張りがいても、プロセスは終われる（見張りのタイマーがプロセスを引き止めない）', () => {
  const code = `import(${JSON.stringify(moduleUrl)}).then(({ createLagMonitor }) => {
    createLagMonitor();
    setTimeout(() => console.log('done'), 50);
  });`;
  const start = performance.now();
  const result = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.stdout.trim(), 'done');
  assert.equal(result.status, 0, '3秒以内に終わらなかった');
  assert.ok(performance.now() - start < 2000);
});

test('intervalMs と thresholdMs が正の数でなければ RangeError', () => {
  assert.throws(() => createLagMonitor({ intervalMs: 0 }), RangeError);
  assert.throws(() => createLagMonitor({ thresholdMs: -1 }), RangeError);
  assert.throws(() => createLagMonitor({ intervalMs: 'abc' }), RangeError);
});
