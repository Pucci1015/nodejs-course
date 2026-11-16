// 練習問題7 のテスト。動きを確かめ、ESLint のエラーが無いことも確かめる
// 使い方: node --test lint-fix.test.ts
//   模範解答を試す: MODULE=../solutions/lint-fix.ts node --test lint-fix.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './lint-fix.ts');
const m = await import(pathToFileURL(file).href);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('sendAll: 全部を順番に送ってから、送った数を返す', async () => {
  const log: string[] = [];
  const send = async (msg: string) => {
    log.push(`start ${msg}`);
    await sleep(msg === 'a' ? 30 : 5);
    log.push(`end ${msg}`);
  };
  assert.equal(await m.sendAll(['a', 'b'], send), 2);
  assert.deepEqual(log, ['start a', 'end a', 'start b', 'end b'], '1つ目が終わってから2つ目');
});

test('sendAll: 途中で失敗したら、そのエラーで reject する', async () => {
  const send = async (msg: string) => {
    if (msg === 'bad') throw new Error('送れません');
  };
  await assert.rejects(m.sendAll(['ok', 'bad', 'ok'], send), /送れません/);
});

test('loadAll: 結果を ids の順に返す（遅いものがあっても）', async () => {
  const load = async (id: number) => {
    await sleep(id === 1 ? 30 : 5);
    return `#${id}`;
  };
  assert.deepEqual(await m.loadAll([1, 2, 3], load), ['#1', '#2', '#3']);
});

test('every: 失敗は onError に渡り、止める関数で止まる', async () => {
  const errors: unknown[] = [];
  let runs = 0;
  const stop = m.every(10, async () => {
    runs += 1;
    throw new Error(`失敗 ${runs}`);
  }, (err: unknown) => errors.push(err));
  await sleep(55);
  stop();
  const n = runs;
  await sleep(30);
  assert.ok(n >= 2, `何回か動く: ${n}`);
  assert.equal(runs, n, '止めた後は動かない');
  assert.equal(errors.length, n);
  assert.ok(errors[0] instanceof Error);
});

test('valueOf: value が文字列なら返し、そうでなければ null', () => {
  assert.equal(m.valueOf('{"value": "ok"}'), 'ok');
  assert.equal(m.valueOf('{"value": 1}'), null);
  assert.equal(m.valueOf('{}'), null);
  assert.equal(m.valueOf('null'), null);
  assert.equal(m.valueOf('[1]'), null);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ESLint: エラーが無い（無効にするコメントも使わない）', async () => {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /eslint-disable/, 'eslint-disable のコメントで消さない');
  const eslint = new ESLint({ cwd: path.resolve(import.meta.dirname, '..', '..') });
  const [result] = await eslint.lintFiles([file]);
  const messages = (result?.messages ?? []).map((x) => `${x.line}:${x.column} ${x.message} (${x.ruleId})`);
  assert.deepEqual(messages, []);
});
