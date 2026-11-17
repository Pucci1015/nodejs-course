// 練習問題1 のテスト
// 使い方: node --test callback.test.ts
//   模範解答を試す: MODULE=../solutions/callback.ts node --test callback.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './callback.ts');
const { parseCallback }: typeof import('./callback.ts') = await import(pathToFileURL(file).href);

const base = 'http://127.0.0.1:9647/auth/callback';

test('state が合い、code があれば { ok: true, code }', () => {
  assert.deepEqual(parseCallback(`${base}?code=abc-123&state=s1`, 's1'), { ok: true, code: 'abc-123' });
});

test('state が違う・無い・覚えた state が空なら、ほかの値を見ずに state', () => {
  assert.deepEqual(parseCallback(`${base}?code=abc&state=s2`, 's1'), { ok: false, reason: 'state' });
  assert.deepEqual(parseCallback(`${base}?code=abc`, 's1'), { ok: false, reason: 'state' });
  assert.deepEqual(parseCallback(`${base}?error=access_denied&state=s2`, 's1'), { ok: false, reason: 'state' });
  assert.deepEqual(parseCallback(`${base}?code=abc&state=`, ''), { ok: false, reason: 'state' });
});

test('断られた（access_denied）なら denied、ほかの error なら error と、その値', () => {
  assert.deepEqual(parseCallback(`${base}?error=access_denied&state=s1`, 's1'), { ok: false, reason: 'denied', error: 'access_denied' });
  assert.deepEqual(parseCallback(`${base}?error=invalid_scope&error_description=x&state=s1`, 's1'), {
    ok: false,
    reason: 'error',
    error: 'invalid_scope',
  });
});

test('code が無い・空なら missing_code', () => {
  assert.deepEqual(parseCallback(`${base}?state=s1`, 's1'), { ok: false, reason: 'missing_code' });
  assert.deepEqual(parseCallback(`${base}?code=&state=s1`, 's1'), { ok: false, reason: 'missing_code' });
});

test('値は URL の形のまま（%XX）でなく、元に戻して比べる', () => {
  assert.deepEqual(parseCallback(`${base}?code=a%2Bb&state=s%2F1`, 's/1'), { ok: true, code: 'a+b' });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
