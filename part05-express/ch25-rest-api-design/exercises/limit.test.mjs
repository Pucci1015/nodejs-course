// 練習問題3 用: limit.mjs のテスト
// 使い方: node --test limit.test.mjs
//   模範解答を試す: MODULE=../solutions/limit.mjs node --test limit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './limit.mjs')).href);

test('parseLimit: 無ければ 20', () => {
  assert.deepEqual(m.parseLimit(undefined), { ok: true, value: 20 });
});

test('parseLimit: 1〜100 の整数の形なら数にする', () => {
  assert.deepEqual(m.parseLimit('1'), { ok: true, value: 1 });
  assert.deepEqual(m.parseLimit('50'), { ok: true, value: 50 });
  assert.deepEqual(m.parseLimit('100'), { ok: true, value: 100 });
});

test('parseLimit: 範囲の外・形の違うもの・2つ送られたものは ok: false', () => {
  for (const v of ['0', '101', '1000', '', ' 20', '2e1', '0x14', '05', '-1', ['1', '2']]) {
    assert.deepEqual(m.parseLimit(v), { ok: false }, JSON.stringify(v));
  }
});

test('nextLink: 次が無ければ null', () => {
  assert.equal(m.nextLink('/api/tasks', { limit: '20' }, null), null);
});

test('nextLink: 今のクエリを残して cursor を足す', () => {
  assert.equal(m.nextLink('/api/tasks', { status: 'todo', limit: '20' }, 'abc'), '/api/tasks?status=todo&limit=20&cursor=abc');
});

test('nextLink: 前の cursor は新しいものに置き換える。値はエンコードする', () => {
  assert.equal(m.nextLink('/api/tasks', { cursor: 'old', q: 'a b' }, 'x/y='), '/api/tasks?cursor=x%2Fy%3D&q=a+b');
});
