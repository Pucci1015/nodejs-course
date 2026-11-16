// 練習問題5 のテスト
// 使い方: node --test problem.test.ts
//   模範解答を試す: MODULE=../solutions/problem.ts node --test problem.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './problem.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
import { z } from 'zod';

z.config(z.locales.ja());

test('toPointer', () => {
  assert.equal(m.toPointer([]), '');
  assert.equal(m.toPointer(['title']), '/title');
  assert.equal(m.toPointer(['tags', 1]), '/tags/1');
  assert.equal(m.toPointer(['a/b', 'x~y']), '/a~1b/x~0y');
  assert.equal(m.toPointer(['~1']), '/~01', '~ を先に変える');
});

const NewTask = z.strictObject({ title: z.string().min(1), tags: z.array(z.string().min(1)).default([]) });

test('toProblem: 422。issue ごとに pointer と detail', () => {
  const r = NewTask.safeParse({ title: '', tags: ['a', ''] });
  assert.equal(r.success, false);
  const p = m.toProblem(r.error, 422);
  assert.deepEqual(
    { ...p, errors: undefined },
    { type: 'about:blank', title: 'Unprocessable Content', status: 422, detail: '入力が正しくありません', errors: undefined },
  );
  assert.deepEqual(p.errors.map((e: { pointer: string }) => e.pointer), ['/title', '/tags/1']);
  assert.equal(p.errors[0].detail, r.error.issues[0]?.message, 'detail は issue の message');
});

test('toProblem: 知らない項目は、1つずつその場所を指す。400 の title', () => {
  const r = z.object({ meta: z.strictObject({ a: z.string() }) }).strict().safeParse({ x: 1, meta: { a: 'ok', b: 1, c: 2 } });
  assert.equal(r.success, false);
  const p = m.toProblem(r.error, 400);
  assert.equal(p.title, 'Bad Request');
  assert.equal(p.status, 400);
  assert.deepEqual(p.errors.map((e: { pointer: string }) => e.pointer).toSorted(), ['/meta/b', '/meta/c', '/x']);
  assert.ok(p.errors.every((e: { detail: string }) => e.detail === '知らない項目です'));
});

test('parseOrProblem', () => {
  assert.deepEqual(m.parseOrProblem(NewTask, { title: 'a' }), { ok: true, value: { title: 'a', tags: [] } });
  const bad = m.parseOrProblem(NewTask, null);
  assert.equal(bad.ok, false);
  assert.equal(bad.error.status, 422, '決まりは 422');
  assert.deepEqual(bad.error.errors.map((e: { pointer: string }) => e.pointer), ['']);
  assert.equal(m.parseOrProblem(z.number(), 'x', 400).error.status, 400);
});

test('型: tsc のエラーが無い（problem.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any と as を使っていない', () => {
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
