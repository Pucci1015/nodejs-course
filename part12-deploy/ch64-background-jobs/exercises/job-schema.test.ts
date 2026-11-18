// 練習問題2 のテスト
// 使い方: node --test job-schema.test.ts
//   模範解答を試す: MODULE=../solutions/job-schema.ts node --test job-schema.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './job-schema.ts');
const { parseJob }: typeof import('./job-schema.ts') = await import(pathToFileURL(file).href);

test('send-mail: to・subject・text', () => {
  const r = parseJob('send-mail', { to: 'alice@example.com', subject: 'ようこそ', text: '本文' });
  assert.deepEqual(r, { ok: true, job: { name: 'send-mail', to: 'alice@example.com', subject: 'ようこそ', text: '本文' } });
});

test('delete-file: key は files/ で始まる', () => {
  assert.deepEqual(parseJob('delete-file', { key: 'files/abc' }), { ok: true, job: { name: 'delete-file', key: 'files/abc' } });
  const bad = parseJob('delete-file', { key: 'users/1/x' });
  assert.equal(bad.ok, false);
});

test('daily-digest: day は YYYY-MM-DD', () => {
  assert.deepEqual(parseJob('daily-digest', { day: '2026-11-18' }), { ok: true, job: { name: 'daily-digest', day: '2026-11-18' } });
  assert.equal(parseJob('daily-digest', { day: '2026/11/18' }).ok, false);
});

test('知らない name は失敗。error に name と書く', () => {
  const r = parseJob('drop-everything', {});
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /name/);
});

test('項目が違えば失敗。error に、違う項目の名前が入る', () => {
  const r = parseJob('send-mail', { to: 'not-an-email', subject: 'a', text: 'b' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /^to: /);
  const r2 = parseJob('send-mail', { to: 'alice@example.com', subject: '', text: 'b' });
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.match(r2.error, /^subject: /);
});

test('知らない項目があれば失敗（書き間違いに気づく）', () => {
  const r = parseJob('delete-file', { key: 'files/abc', bucket: 'other' });
  assert.equal(r.ok, false);
});

test('data がオブジェクトでなくても、例外にしない', () => {
  for (const data of [null, 'x', 42, undefined]) assert.equal(parseJob('send-mail', data).ok, false, String(data));
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
