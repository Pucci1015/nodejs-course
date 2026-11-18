// 練習問題1のテスト（書き換えなくてよい）: node --test lint-me.test.ts
// 動き（関数の結果）と、ESLint の指摘が0個であること、eslint-disable で止めていないことを確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './lint-me/lint-me.ts');
const mod: typeof import('./lint-me/lint-me.ts') = await import(pathToFileURL(file).href);

test('isTag: 決まった形だけ true', () => {
  assert.equal(mod.isTag('node-24'), true);
  assert.equal(mod.isTag('react-19'), true);
  assert.equal(mod.isTag('node'), false);
  assert.equal(mod.isTag('-24'), false);
  assert.equal(mod.isTag('Node-24'), false);
});

test('isTag: 合わない長い文字列でも、すぐ答える', () => {
  const started = performance.now();
  assert.equal(mod.isTag(`${'a'.repeat(28)}!`), false);
  assert.ok(performance.now() - started < 100, '100ms 以上かかりました（ReDoS）');
});

test('ageLabel: null なら「年齢なし」。0 歳は 0 歳', () => {
  assert.equal(mod.ageLabel({ name: 'alice', email: 'alice@example.com', age: null }), '年齢なし');
  assert.equal(mod.ageLabel({ name: 'bob', email: 'bob@example.com', age: 0 }), '0 歳');
});

test('parseMembers: 形の合わない JSON は例外', () => {
  const ok = mod.parseMembers('[{"name":"alice","email":"alice@example.com","age":30}]');
  assert.deepEqual(ok, [{ name: 'alice', email: 'alice@example.com', age: 30 }]);
  assert.throws(() => mod.parseMembers('[{"name":"alice"}]'));
});

test('sendMember: 送り終わるまで待ち、失敗は呼んだ側に届く', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => Promise.reject(new Error('つながりません')));
  await assert.rejects(mod.sendMember({ name: 'alice', email: 'alice@example.com', age: null }), /つながりません/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('ESLint の指摘が0個で、eslint-disable を使っていない', async () => {
  const eslint = new ESLint({ cwd: path.dirname(file) });
  const [result] = await eslint.lintFiles([file]);
  const messages = (result?.messages ?? []).map((m) => `${m.line}:${m.column} ${m.ruleId ?? ''} ${m.message}`);
  assert.deepEqual(messages, []);
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /eslint-disable/);
});
