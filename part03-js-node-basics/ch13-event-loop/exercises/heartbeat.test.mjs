// 練習問題3 用: heartbeat.mjs のテスト
// 使い方: node --test heartbeat.test.mjs
//   模範解答を試す: MODULE=../solutions/heartbeat.mjs node --test heartbeat.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './heartbeat.mjs');
const moduleUrl = pathToFileURL(modulePath).href;
const { startHeartbeat } = await import(moduleUrl);

test('intervalMs ごとに onBeat を呼び、回数を 1, 2, 3 と渡す', async () => {
  const beats = [];
  const stop = startHeartbeat(50, (n) => beats.push(n));
  await sleep(180);
  stop();
  assert.deepEqual(beats, [1, 2, 3]);
});

test('戻り値は関数で、呼ぶと止まる', async () => {
  const beats = [];
  const stop = startHeartbeat(30, (n) => beats.push(n));
  assert.equal(typeof stop, 'function', '止める関数を返していません');
  await sleep(100);
  stop();
  const before = beats.length;
  await sleep(100);
  assert.equal(beats.length, before, '止めた後も onBeat が呼ばれました');
});

test('心拍は、プロセスを引き止めない', async () => {
  // 心拍を始めただけのプログラムを、別のプロセスで動かす。すぐに終われば合格
  const code = `const { startHeartbeat } = await import(${JSON.stringify(moduleUrl)}); startHeartbeat(50, () => {}); console.log('最後の行');`;
  const start = Date.now();
  const result = await new Promise((resolve) => {
    execFile(process.execPath, ['--input-type=module', '-e', code], { timeout: 2000 }, (err, stdout) =>
      resolve({ killed: err?.killed ?? false, stdout }),
    );
  });
  assert.equal(result.stdout.trim(), '最後の行');
  assert.equal(result.killed, false, `心拍のせいで、プロセスが ${Date.now() - start}ms たっても終わりませんでした（unref を忘れていませんか）`);
});
