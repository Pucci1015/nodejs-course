// 練習問題3 用: stopwatch.mjs（buggy-stopwatch.mjs を直したもの）のテスト
// 使い方: node --test stopwatch.test.mjs
//   直す前のものを試す: MODULE=./buggy-stopwatch.mjs node --test stopwatch.test.mjs
//   模範解答を試す:     MODULE=../solutions/stopwatch.mjs node --test stopwatch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './stopwatch.mjs');
const { Stopwatch } = await import(pathToFileURL(modulePath).href);

test('start すると、100ms ごとに elapsed が増える', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const sw = new Stopwatch('A');
  sw.start();
  t.mock.timers.tick(350);
  assert.equal(sw.elapsed, 300);
  sw.stop();
});

test('stop すると止まり、start し直すと続きから数える', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const sw = new Stopwatch('A');
  sw.start();
  t.mock.timers.tick(200);
  sw.stop();
  t.mock.timers.tick(500);
  assert.equal(sw.elapsed, 200);
  sw.start();
  t.mock.timers.tick(100);
  assert.equal(sw.elapsed, 300);
  sw.stop();
});

test('lap と summary', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const sw = new Stopwatch('計測');
  sw.start();
  t.mock.timers.tick(300);
  sw.lap();
  t.mock.timers.tick(400);
  sw.lap();
  sw.stop();
  assert.deepEqual(sw.laps, [300, 700]);
  assert.deepEqual(sw.summary(), ['計測 1: 300ms', '計測 2: 700ms']);
});

test('bindKeys: l でラップ、q で止まる', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const sw = new Stopwatch('キー');
  const keyboard = new EventEmitter();
  sw.bindKeys(keyboard);
  sw.start();
  t.mock.timers.tick(200);
  keyboard.emit('l');
  t.mock.timers.tick(100);
  keyboard.emit('q');
  t.mock.timers.tick(1000);
  assert.deepEqual(sw.laps, [200]);
  assert.equal(sw.elapsed, 300);
  assert.equal(sw.timer, null);
});

test('2つのストップウォッチは、互いに影響しない', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const a = new Stopwatch('a');
  const b = new Stopwatch('b');
  a.start();
  t.mock.timers.tick(100);
  b.start();
  t.mock.timers.tick(200);
  a.stop();
  b.stop();
  assert.equal(a.elapsed, 300);
  assert.equal(b.elapsed, 200);
});

test('bindKeys した後でも、メソッドはインスタンスごとに独立している', () => {
  const a = new Stopwatch('a');
  const b = new Stopwatch('b');
  const ka = new EventEmitter();
  a.bindKeys(ka);
  ka.emit('l');
  assert.deepEqual(a.laps, [0]);
  assert.deepEqual(b.laps, []);
});
