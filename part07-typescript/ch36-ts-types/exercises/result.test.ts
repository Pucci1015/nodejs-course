// 練習問題7 のテスト
// 使い方: node --test result.test.ts
//   模範解答を試す: MODULE=../solutions/result.ts node --test result.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './result.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('ok と err', () => {
  assert.deepEqual(m.ok(1), { ok: true, value: 1 });
  assert.deepEqual(m.err('だめ'), { ok: false, error: 'だめ' });
});

test('parseLimit: 無ければ 20。1〜100 の整数だけ', () => {
  assert.deepEqual(m.parseLimit(undefined), { ok: true, value: 20 });
  assert.deepEqual(m.parseLimit('50'), { ok: true, value: 50 });
  assert.deepEqual(m.parseLimit('abc'), { ok: false, error: 'limit は整数です' });
  assert.deepEqual(m.parseLimit('2.5'), { ok: false, error: 'limit は整数です' });
  assert.deepEqual(m.parseLimit(''), { ok: false, error: 'limit は整数です' }, '空の文字列は 0 ではなく、整数ではないとする');
  assert.deepEqual(m.parseLimit('0'), { ok: false, error: 'limit は 1〜100 です' });
  assert.deepEqual(m.parseLimit('101'), { ok: false, error: 'limit は 1〜100 です' });
});

test('parseDueDate: YYYY-MM-DD の形で、本当にある日付だけ', () => {
  assert.deepEqual(m.parseDueDate('2026-11-20'), { ok: true, value: '2026-11-20' });
  assert.deepEqual(m.parseDueDate('2028-02-29'), { ok: true, value: '2028-02-29' }, 'うるう年');
  assert.deepEqual(m.parseDueDate('2026/11/20'), { ok: false, error: '締め切りは YYYY-MM-DD の形です' });
  assert.deepEqual(m.parseDueDate('2026-1-5'), { ok: false, error: '締め切りは YYYY-MM-DD の形です' });
  assert.deepEqual(m.parseDueDate('2026-02-30'), { ok: false, error: '2026-02-30 という日はありません' });
  assert.deepEqual(m.parseDueDate('2026-13-01'), { ok: false, error: '2026-13-01 という日はありません' });
});

test('parseNewTask: 正しければ ok。題名は前後の空白を除く', () => {
  assert.deepEqual(m.parseNewTask({ title: ' 牛乳を買う ', dueDate: '2026-11-20' }), { ok: true, value: { title: '牛乳を買う', dueDate: '2026-11-20' } });
  assert.deepEqual(m.parseNewTask({ title: '掃除' }), { ok: true, value: { title: '掃除', dueDate: null } });
});

test('parseNewTask: 間違いを全部集めて返す', () => {
  assert.deepEqual(m.parseNewTask({}), { ok: false, error: ['題名は必須です'] });
  assert.deepEqual(m.parseNewTask({ title: '   ', dueDate: '2026-02-30' }), { ok: false, error: ['題名は必須です', '2026-02-30 という日はありません'] });
  assert.deepEqual(m.parseNewTask({ title: 'あ'.repeat(101) }), { ok: false, error: ['題名は100文字までです'] });
});

test('unwrapOr: ok なら値、そうでなければ fallback', () => {
  assert.equal(m.unwrapOr(m.ok(5), 20), 5);
  assert.equal(m.unwrapOr(m.err('x'), 20), 20);
});

test('型: tsc のエラーが無い（result.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: as・any・throw を使っていない', () => {
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bthrow\b/);
});
