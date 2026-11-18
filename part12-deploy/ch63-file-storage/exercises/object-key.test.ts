// 練習問題1 のテスト
// 使い方: node --test object-key.test.ts
//   模範解答を試す: MODULE=../solutions/object-key.ts node --test object-key.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './object-key.ts');
const { objectKey }: typeof import('./object-key.ts') = await import(pathToFileURL(file).href);

const id = '0b6e2f0e-6a4f-4c7e-9a51-6a3b8d1c2e4f';
const now = new Date('2026-11-18T14:00:00Z');

test('users/ユーザー/年/月/ID.拡張子', () => {
  assert.equal(objectKey({ userId: 42, fileName: 'cat.png', id, now }), `users/42/2026/11/${id}.png`);
});

test('月は2けた。年と月は UTC で決める', () => {
  assert.equal(objectKey({ userId: 1, fileName: 'a.png', id, now: new Date('2027-03-01T00:30:00Z') }), `users/1/2027/03/${id}.png`);
  // 日本の時刻では 2027-01-01 09:00 だが、UTC では 2026 年 12 月
  assert.equal(objectKey({ userId: 1, fileName: 'a.png', id, now: new Date('2026-12-31T23:59:59Z') }), `users/1/2026/12/${id}.png`);
});

test('拡張子は小文字にする。.jpeg は .jpg にそろえる', () => {
  assert.equal(objectKey({ userId: 1, fileName: 'IMG_0001.JPEG', id, now }), `users/1/2026/11/${id}.jpg`);
  assert.equal(objectKey({ userId: 1, fileName: 'scan.PDF', id, now }), `users/1/2026/11/${id}.pdf`);
  assert.equal(objectKey({ userId: 1, fileName: 'a.b.webp', id, now }), `users/1/2026/11/${id}.webp`);
});

test('知らない拡張子・拡張子が無い名前は、拡張子を付けない', () => {
  for (const fileName of ['memo.html', 'run.sh', 'README', '.png', 'photo.png.exe', '']) {
    const key = objectKey({ userId: 1, fileName, id, now });
    assert.equal(key, `users/1/2026/11/${id}`, fileName);
  }
});

test('利用者の名前の中の / や .. は、キーに入らない', () => {
  const key = objectKey({ userId: 1, fileName: '../../users/2/secret.png', id, now });
  assert.equal(key, `users/1/2026/11/${id}.png`);
});

test('userId は 1 以上の整数でなければ例外', () => {
  for (const userId of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => objectKey({ userId, fileName: 'a.png', id, now }), /userId/, String(userId));
  }
});

test('id は UUID の形（小文字の 16 進と -）でなければ例外', () => {
  for (const bad of ['', 'abc', `${id}/x`, id.toUpperCase(), `../${id}`]) {
    assert.throws(() => objectKey({ userId: 1, fileName: 'a.png', id: bad, now }), /id/, bad);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
