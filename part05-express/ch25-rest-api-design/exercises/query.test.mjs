// 練習問題6のテスト
// 使い方: node --test query.test.mjs
//         MODULE=../solutions/query.mjs node --test query.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseListQuery } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './query.mjs')).href);

/** 400 になることと、errors の parameter の一覧を確かめる */
function fails(query, parameters) {
  let err;
  try {
    parseListQuery(query);
  } catch (e) {
    err = e;
  }
  assert.ok(err, `${JSON.stringify(query)} は 400 になるはず`);
  assert.equal(err.status, 400);
  assert.ok(Array.isArray(err.errors), 'errors が配列であること');
  assert.deepEqual(err.errors.map((e) => e.parameter).sort(), [...parameters].sort());
  for (const e of err.errors) assert.equal(typeof e.detail, 'string');
  return err;
}

test('1. 何も無ければ既定の値', () => {
  assert.deepEqual(parseListQuery({}), { status: undefined, sort: { field: 'createdAt', desc: true }, limit: 20, cursor: undefined, dueBefore: undefined });
});

test('2. すべて正しく指定したとき', () => {
  const q = parseListQuery({ status: 'todo,doing,todo', sort: 'dueDate', limit: '100', cursor: 'abc', due_before: '2026-11-30' });
  assert.deepEqual(q, { status: ['todo', 'doing'], sort: { field: 'dueDate', desc: false }, limit: 100, cursor: 'abc', dueBefore: '2026-11-30' });
});

test('3. limit は 1〜100 の、数字だけの文字列', () => {
  for (const limit of ['0', '101', '-1', '1.5', 'abc', '', ' 20', '2e1', '0x14', '020']) fails({ limit }, ['limit']);
  assert.equal(parseListQuery({ limit: '1' }).limit, 1);
});

test('4. sort は決めたものの中からだけ', () => {
  for (const sort of ['id', 'createdAt;DROP', 'password', '+title', '']) fails({ sort }, ['sort']);
  assert.deepEqual(parseListQuery({ sort: '-title' }).sort, { field: 'title', desc: true });
});

test('5. status は todo・doing・done をカンマで区切る', () => {
  fails({ status: 'todo,later' }, ['status']);
  fails({ status: '' }, ['status']);
  fails({ status: 'todo,' }, ['status']);
  assert.deepEqual(parseListQuery({ status: 'done' }).status, ['done']);
});

test('6. due_before は YYYY-MM-DD', () => {
  for (const d of ['2026-13-01', '2026/11/30', '明日', '2026-11-30T00:00:00Z']) fails({ due_before: d }, ['due_before']);
});

test('7. 知らない名前は、名前ごとに 400', () => {
  fails({ page: '2', dueBefore: '2026-11-30' }, ['page', 'dueBefore']);
});

test('8. 同じ名前を2回（配列）は 400', () => {
  fails({ limit: ['1', '2'] }, ['limit']);
  fails({ sort: ['title', '-title'] }, ['sort']);
});

test('9. 間違いはすべて集める', () => {
  const err = fails({ limit: '0', sort: 'id', extra: 'x' }, ['limit', 'sort', 'extra']);
  assert.equal(err.errors.length, 3);
});

test('10. a[b] の形の名前も、ただの知らない名前', () => {
  // Express 5 の既定（simple）のクエリの読み方では、limit[gt] はそういう名前の文字列
  fails({ 'limit[gt]': '5' }, ['limit[gt]']);
});
