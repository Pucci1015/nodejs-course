// 練習問題1 用: env-values.mjs のテスト
// 使い方: node --test env-values.test.mjs
//   模範解答を試す: MODULE=../solutions/env-values.mjs node --test env-values.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './env-values.mjs')).href);

test('readPort: 無ければ 3000', () => {
  assert.deepEqual(m.readPort(undefined), { ok: true, value: 3000 });
});

test('readPort: 0〜65535 の整数の形なら数にする', () => {
  assert.deepEqual(m.readPort('9337'), { ok: true, value: 9337 });
  assert.deepEqual(m.readPort('0'), { ok: true, value: 0 });
  assert.deepEqual(m.readPort('65535'), { ok: true, value: 65535 });
});

test('readPort: それ以外は ok: false と、値を入れない説明', () => {
  for (const text of ['abc', '', '65536', '99999', '-1', '80.5', ' 80', '123456']) {
    const r = m.readPort(text);
    assert.equal(r.ok, false, text);
    assert.equal(typeof r.error, 'string', text);
    if (text.trim() !== '') assert.ok(!r.error.includes(text), `説明に値（${text}）を書かない`);
  }
});

test('readLogLevel: 無ければ info', () => {
  assert.deepEqual(m.readLogLevel(undefined), { ok: true, value: 'info' });
});

test('readLogLevel: fatal・error・warn・info・debug・trace はそのまま', () => {
  for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) {
    assert.deepEqual(m.readLogLevel(level), { ok: true, value: level });
  }
});

test('readLogLevel: 知らないもの・大文字は ok: false', () => {
  for (const text of ['loud', 'INFO', '', 'information']) {
    const r = m.readLogLevel(text);
    assert.equal(r.ok, false, text);
    assert.equal(typeof r.error, 'string');
  }
});
