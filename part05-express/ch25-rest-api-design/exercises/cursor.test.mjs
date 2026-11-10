// 練習問題7のテスト
// 使い方: node --test cursor.test.mjs
//         MODULE=../solutions/cursor.mjs node --test cursor.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { paginate, CursorError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './cursor.mjs')).href);

const secret = 'test-only-secret-for-cursor-0123456789'; // テストのためだけの値
const at = (min) => new Date(Date.parse('2026-11-05T00:00:00.000Z') + min * 60_000).toISOString();
// createdAt が同じものを含む 7 件（id 3・4・5 が同じ時刻）
const base = () => [
  { id: 1, title: 'c', createdAt: at(1) },
  { id: 2, title: 'a', createdAt: at(2) },
  { id: 3, title: 'b', createdAt: at(3) },
  { id: 4, title: 'b', createdAt: at(3) },
  { id: 5, title: 'e', createdAt: at(3) },
  { id: 6, title: 'd', createdAt: at(4) },
  { id: 7, title: 'f', createdAt: at(5) },
];

/** すべてのページをたどって、id の配列の配列にする */
function walk(items, options) {
  const pages = [];
  let cursor;
  for (let i = 0; i < 20; i++) {
    const r = paginate(items, { ...options, cursor, secret });
    pages.push(r.items.map((x) => x.id));
    if (!r.nextCursor) return pages;
    cursor = r.nextCursor;
  }
  throw new Error('終わらない');
}

test('1. 新しい順（-createdAt）で、同じ時刻は id の大きい順。最後のページの nextCursor は null', () => {
  assert.deepEqual(walk(base(), { sort: '-createdAt', limit: 3 }), [[7, 6, 5], [4, 3, 2], [1]]);
});

test('2. 古い順（createdAt）で、同じ時刻は id の小さい順', () => {
  assert.deepEqual(walk(base(), { sort: 'createdAt', limit: 2 }), [[1, 2], [3, 4], [5, 6], [7]]);
});

test('3. 文字列の項目（title）でも並べられる', () => {
  assert.deepEqual(walk(base(), { sort: 'title', limit: 3 }), [[2, 3, 4], [1, 6, 5], [7]]);
});

test('4. ちょうど割り切れるときは、空のページを作らない（3件ずつで6件なら2ページ）', () => {
  const six = base().slice(0, 6);
  assert.deepEqual(walk(six, { sort: 'createdAt', limit: 3 }), [[1, 2, 3], [4, 5, 6]]);
});

test('5. 1ページ目を読んだ後に新しいものが増えても、2ページ目に重なりも抜けも出ない', () => {
  const items = base();
  const p1 = paginate(items, { sort: '-createdAt', limit: 3, secret });
  items.push({ id: 8, title: 'new', createdAt: at(10) }, { id: 9, title: 'new2', createdAt: at(11) });
  const p2 = paginate(items, { sort: '-createdAt', limit: 3, cursor: p1.nextCursor, secret });
  assert.deepEqual(p2.items.map((x) => x.id), [4, 3, 2]);
});

test('6. カーソルが指していたもの自体が消されても、続きから読める', () => {
  const items = base();
  const p1 = paginate(items, { sort: '-createdAt', limit: 3, secret });
  items.splice(items.findIndex((x) => x.id === 5), 1);
  const p2 = paginate(items, { sort: '-createdAt', limit: 3, cursor: p1.nextCursor, secret });
  assert.deepEqual(p2.items.map((x) => x.id), [4, 3, 2]);
});

test('7. 書き換えたカーソル・別の鍵のカーソル・ただの文字は CursorError', () => {
  const { nextCursor } = paginate(base(), { sort: '-createdAt', limit: 3, secret });
  const tampered = `${nextCursor.slice(0, 5)}${nextCursor[5] === 'A' ? 'B' : 'A'}${nextCursor.slice(6)}`;
  assert.throws(() => paginate(base(), { sort: '-createdAt', cursor: tampered, secret }), CursorError);
  assert.throws(() => paginate(base(), { sort: '-createdAt', cursor: nextCursor, secret: 'another-secret-for-test-0123456789ab' }), CursorError);
  assert.throws(() => paginate(base(), { sort: '-createdAt', cursor: 'abc', secret }), CursorError);
});

test('8. 別の並べ方で作ったカーソルは使えない（CursorError）', () => {
  const { nextCursor } = paginate(base(), { sort: '-createdAt', limit: 3, secret });
  assert.throws(() => paginate(base(), { sort: 'title', cursor: nextCursor, secret }), CursorError);
});

test('9. limit は 1〜100 の整数（それ以外は RangeError）。元の配列は並べ替えない', () => {
  for (const limit of [0, 101, 1.5, '3']) assert.throws(() => paginate(base(), { limit, secret }), RangeError, String(limit));
  const items = base().reverse();
  const before = items.map((x) => x.id);
  paginate(items, { sort: 'createdAt', limit: 3, secret });
  assert.deepEqual(items.map((x) => x.id), before);
});
