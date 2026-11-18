// 練習問題7 のテスト
// 使い方: node --test cookie-rules.test.ts
//   模範解答を試す: MODULE=../solutions/cookie-rules.ts node --test cookie-rules.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './cookie-rules.ts');
const { sessionCookie, cookieProblems, hstsHeader }: typeof import('./cookie-rules.ts') = await import(pathToFileURL(file).href);

const rejected = (err: unknown) => err instanceof Error && !err.message.startsWith('まだ書いていません');

test('sessionCookie: 本番は __Host-sid・Secure・path /・domain なし', () => {
  assert.deepEqual(sessionCookie('production'), {
    name: '__Host-sid',
    options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
  });
});

test('sessionCookie: 開発とテストは sid・Secure なし（http://localhost で使うため）', () => {
  for (const env of ['development', 'test'] as const) {
    assert.deepEqual(sessionCookie(env), { name: 'sid', options: { httpOnly: true, secure: false, sameSite: 'lax', path: '/' } });
  }
});

test('cookieProblems: 決まりどおりなら空の配列', () => {
  const { name, options } = sessionCookie('production');
  assert.deepEqual(cookieProblems(name, options), []);
  assert.deepEqual(cookieProblems('sid', { httpOnly: true, secure: false, sameSite: 'lax' }), []);
});

test('cookieProblems: __Host- は Secure・path / ・domain なし（足りないものを全部）', () => {
  assert.deepEqual(cookieProblems('__Host-sid', { httpOnly: true, secure: false, sameSite: 'lax', path: '/app', domain: 'example.com' }), [
    '__Host- には Secure が要ります',
    '__Host- の path は / だけです',
    '__Host- には domain を付けられません',
  ]);
  assert.deepEqual(cookieProblems('__Host-sid', { httpOnly: true, secure: true, sameSite: 'lax' }), ['__Host- の path は / だけです']);
});

test('cookieProblems: __Secure- は Secure が要る', () => {
  assert.deepEqual(cookieProblems('__Secure-pref', { httpOnly: false, secure: false, sameSite: 'lax' }), ['__Secure- には Secure が要ります']);
  assert.deepEqual(cookieProblems('__Secure-pref', { httpOnly: false, secure: true, sameSite: 'lax', domain: 'example.com' }), []);
});

test('cookieProblems: SameSite=None には Secure が要る', () => {
  assert.deepEqual(cookieProblems('widget', { httpOnly: true, secure: false, sameSite: 'none' }), ['SameSite=None には Secure が要ります']);
});

test('hstsHeader: 本番だけ。日数を秒にする', () => {
  assert.equal(hstsHeader('production', 365), 'max-age=31536000; includeSubDomains');
  assert.equal(hstsHeader('production', 1), 'max-age=86400; includeSubDomains');
  assert.equal(hstsHeader('development', 365), undefined);
  assert.equal(hstsHeader('test', 365), undefined);
});

test('hstsHeader: 日数は 0 以上の整数（0 は「忘れて」の合図）', () => {
  assert.equal(hstsHeader('production', 0), 'max-age=0; includeSubDomains');
  for (const bad of [-1, 1.5, Number.NaN]) assert.throws(() => hstsHeader('production', bad), rejected, String(bad));
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
