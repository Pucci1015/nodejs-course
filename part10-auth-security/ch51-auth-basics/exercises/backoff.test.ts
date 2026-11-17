// 練習問題6 のテスト
// 使い方: node --test backoff.test.ts
//   模範解答を試す: MODULE=../solutions/backoff.ts node --test backoff.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './backoff.ts');
const { createBackoff }: typeof import('./backoff.ts') = await import(pathToFileURL(file).href);

/** 時計を自分で進められるようにする */
function clock() {
  let t = 1_000_000;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

test('最初の free 回（既定 3）の失敗までは待たない', () => {
  const c = clock();
  const b = createBackoff({ now: c.now });
  assert.equal(b.wait('alice'), 0);
  b.fail('alice');
  b.fail('alice');
  b.fail('alice');
  assert.equal(b.wait('alice'), 0);
});

test('その後は 1, 2, 4, 8 … 秒', () => {
  const c = clock();
  const b = createBackoff({ now: c.now });
  for (let i = 0; i < 3; i++) b.fail('alice');
  const waits: number[] = [];
  for (let i = 0; i < 4; i++) {
    b.fail('alice');
    waits.push(b.wait('alice'));
    c.advance(b.wait('alice') * 1000); // 待ってから、また失敗する
  }
  assert.deepEqual(waits, [1, 2, 4, 8]);
});

test('時間がたてば、待つ時間は減る（切り上げの秒）', () => {
  const c = clock();
  const b = createBackoff({ now: c.now, free: 0, baseSeconds: 10 });
  b.fail('alice');
  assert.equal(b.wait('alice'), 10);
  c.advance(2500);
  assert.equal(b.wait('alice'), 8);
  c.advance(7500);
  assert.equal(b.wait('alice'), 0);
});

test('maxSeconds より長くは待たせない', () => {
  const c = clock();
  const b = createBackoff({ now: c.now, free: 0, maxSeconds: 5 });
  for (let i = 0; i < 10; i++) b.fail('alice');
  assert.equal(b.wait('alice'), 5);
});

test('成功したら数え直し。キーごとに別に数える', () => {
  const c = clock();
  const b = createBackoff({ now: c.now, free: 0 });
  b.fail('alice');
  assert.equal(b.wait('bob'), 0);
  b.succeed('alice');
  assert.equal(b.wait('alice'), 0);
  b.fail('alice');
  assert.equal(b.wait('alice'), 1);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
