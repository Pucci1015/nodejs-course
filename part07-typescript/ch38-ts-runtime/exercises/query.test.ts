// 練習問題3 のテスト
// 使い方: node --test query.test.ts
//   模範解答を試す: MODULE=../solutions/query.ts node --test query.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './query.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Express と同じように、URL のクエリを読む（?a=1&a=2 は配列になる） */
function q(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of new URLSearchParams(text)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : [...(Array.isArray(prev) ? prev : [prev]), v];
  }
  return out;
}

const params = (text: string) => {
  const r = m.parseListQuery(q(text));
  assert.equal(r.ok, false, `${text} は間違いのはず`);
  return r.errors.map((e: { parameter: string; detail: string }) => {
    assert.equal(typeof e.detail, 'string');
    return e.parameter;
  });
};

test('何も無ければ limit 20・offset 0', () => {
  assert.deepEqual(m.parseListQuery({}), { ok: true, value: { limit: 20, offset: 0 } });
});

test('全部を読む。数は数にする', () => {
  assert.deepEqual(m.parseListQuery(q('status=done&dueBefore=2026-12-01&limit=5&offset=10')), {
    ok: true,
    value: { status: 'done', dueBefore: '2026-12-01', limit: 5, offset: 10 },
  });
  assert.deepEqual(m.parseListQuery(q('limit=100&offset=0')), { ok: true, value: { limit: 100, offset: 0 } });
});

test('形の違う値は、その名前の間違い', () => {
  assert.deepEqual(params('status=waiting'), ['status']);
  assert.deepEqual(params('dueBefore=11/11'), ['dueBefore']);
  for (const v of ['0', '101', 'abc', '', ' 5', '1.5', '-1', '1e2']) assert.deepEqual(params(`limit=${encodeURIComponent(v)}`), ['limit'], v);
  assert.deepEqual(params('offset=10001'), ['offset']);
});

test('2回の指定（配列）と知らない名前も間違い。間違いは全部集める', () => {
  assert.deepEqual(params('status=todo&status=done'), ['status']);
  assert.deepEqual(params('sort=id&page=2').toSorted(), ['page', 'sort']);
  assert.deepEqual(params('limit=0&status=x&sort=id').toSorted(), ['limit', 'sort', 'status']);
});

test('型: tsc のエラーが無い（query.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: Zod で確かめる。z.coerce・any・as を使っていない', () => {
  assert.match(code, /from 'zod'/);
  assert.doesNotMatch(code, /z\.coerce/);
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
