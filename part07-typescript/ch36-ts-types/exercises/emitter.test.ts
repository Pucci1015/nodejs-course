// 練習問題8 のテスト
// 使い方: node --test emitter.test.ts
//   模範解答を試す: MODULE=../solutions/emitter.ts node --test emitter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './emitter.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('on と emit: 登録した順に呼ばれ、emit は呼んだ数を返す', () => {
  const em = m.createEmitter();
  const calls: string[] = [];
  em.on('created', (t: { title: string }) => calls.push(`a:${t.title}`));
  em.on('created', (t: { title: string }) => calls.push(`b:${t.title}`));
  em.on('deleted', () => calls.push('deleted'));
  assert.equal(em.emit('created', { id: 1, title: '牛乳' }), 2);
  assert.deepEqual(calls, ['a:牛乳', 'b:牛乳']);
  assert.equal(em.emit('nobody', 1), 0, '誰も待っていなければ 0');
});

test('on の戻り値の関数で、登録をやめる（2回呼んでもよい）', () => {
  const em = m.createEmitter();
  const calls: number[] = [];
  const off = em.on('tick', (n: number) => calls.push(n));
  em.emit('tick', 1);
  off();
  off();
  em.emit('tick', 2);
  assert.deepEqual(calls, [1]);
  assert.equal(em.listenerCount('tick'), 0);
});

test('同じ関数を2回 on しても、別々に数える', () => {
  const em = m.createEmitter();
  let count = 0;
  const fn = () => { count += 1; };
  const off1 = em.on('x', fn);
  em.on('x', fn);
  assert.equal(em.listenerCount('x'), 2);
  assert.equal(em.emit('x', undefined), 2);
  assert.equal(count, 2);
  off1();
  assert.equal(em.listenerCount('x'), 1);
});

test('once: 1回だけ呼ばれる。戻り値の関数で、呼ばれる前にやめられる', () => {
  const em = m.createEmitter();
  const calls: number[] = [];
  em.once('tick', (n: number) => calls.push(n));
  const off = em.once('tick', (n: number) => calls.push(n * 100));
  off();
  assert.equal(em.emit('tick', 1), 1);
  assert.equal(em.emit('tick', 2), 0);
  assert.deepEqual(calls, [1]);
});

test('emit の途中で on・off されても、emit を始めたときの一覧で呼ぶ', () => {
  const em = m.createEmitter();
  const calls: string[] = [];
  let offB = () => {};
  em.on('x', () => { calls.push('a'); offB(); em.on('x', () => calls.push('c')); });
  offB = em.on('x', () => calls.push('b'));
  assert.equal(em.emit('x', undefined), 2);
  assert.deepEqual(calls, ['a', 'b']);
});

test('型: tsc のエラーが無い（emitter.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: as と any を使っていない', () => {
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
});
