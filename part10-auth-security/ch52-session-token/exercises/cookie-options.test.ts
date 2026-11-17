// 練習問題1 のテスト
// 使い方: node --test cookie-options.test.ts
//   模範解答を試す: MODULE=../solutions/cookie-options.ts node --test cookie-options.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './cookie-options.ts');
const { cookieOptions }: typeof import('./cookie-options.ts') = await import(pathToFileURL(file).href);

const DAY = 24 * 60 * 60 * 1000;

test('開発（NODE_ENV が無い）: 名前は sid、Secure なし、7日', () => {
  assert.deepEqual(cookieOptions({}), {
    name: 'sid',
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 7 * DAY },
  });
});

test('本番: 名前は __Host-sid、Secure あり', () => {
  const { name, cookie } = cookieOptions({ NODE_ENV: 'production' });
  assert.equal(name, '__Host-sid');
  assert.equal(cookie.secure, true);
  assert.equal(cookie.path, '/');
  assert.equal(cookie.httpOnly, true);
});

test('NODE_ENV が production 以外（test・development）なら開発と同じ', () => {
  assert.equal(cookieOptions({ NODE_ENV: 'test' }).name, 'sid');
  assert.equal(cookieOptions({ NODE_ENV: 'development' }).cookie.secure, false);
});

test('SESSION_DAYS で日数を変えられる（1〜30）', () => {
  assert.equal(cookieOptions({ SESSION_DAYS: '1' }).cookie.maxAge, DAY);
  assert.equal(cookieOptions({ SESSION_DAYS: '30' }).cookie.maxAge, 30 * DAY);
});

test('SESSION_DAYS が 1〜30 の整数でなければ例外', () => {
  for (const v of ['0', '31', '', ' 3', '1.5', '1e1', '-2', 'seven']) {
    assert.throws(() => cookieOptions({ SESSION_DAYS: v }), /SESSION_DAYS/, `SESSION_DAYS=${JSON.stringify(v)}`);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
