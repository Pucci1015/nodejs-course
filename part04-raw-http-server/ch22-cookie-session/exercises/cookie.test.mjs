// 練習問題5のテスト
// 使い方: node --test cookie.test.mjs
//         MODULE=../solutions/cookie.mjs node --test cookie.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseCookies, serializeCookie, clearCookie } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './cookie.mjs')).href);

test('parseCookies: ふつうの Cookie ヘッダ。%xx を戻す', () => {
  assert.deepEqual(parseCookies('a=1; b=hello%20world; c=%E6%97%A5%E6%9C%AC'), { a: '1', b: 'hello world', c: '日本' });
});

test('parseCookies: ; の後の空白が無くても、多くても読む。値の中の = はそのまま', () => {
  assert.deepEqual(parseCookies('a=1;b=2;   c = 3 '), { a: '1', b: '2', c: '3' });
  assert.deepEqual(parseCookies('token=abc==; x=a=b'), { token: 'abc==', x: 'a=b' });
});

test('parseCookies: 同じ名前は最初のもの。= の無いもの・名前として正しくないものは無視', () => {
  assert.deepEqual(parseCookies('sid=first; sid=second'), { sid: 'first' });
  assert.deepEqual(parseCookies('flag; =novalue; a b=1; ok=1'), { ok: '1' });
});

test('parseCookies: "…" は外す。%xx として読めない値は、例外にせずそのまま', () => {
  assert.deepEqual(parseCookies('q="quoted"; p=100%; r=%E3%81'), { q: 'quoted', p: '100%', r: '%E3%81' });
});

test('parseCookies: ヘッダが無いとき・空のとき', () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies(''), {});
});

test('serializeCookie: 既定は Path=/、HttpOnly、SameSite=Lax。値はエンコードする', () => {
  assert.equal(serializeCookie('msg', 'a; b=日本'), 'msg=a%3B%20b%3D%E6%97%A5%E6%9C%AC; Path=/; HttpOnly; SameSite=Lax');
});

test('serializeCookie: Max-Age・Expires・Domain・Secure。Max-Age=0 も書く', () => {
  assert.equal(
    serializeCookie('sid', 'x', { maxAge: 3600, expires: new Date(Date.UTC(2030, 0, 2, 3, 4, 5)), domain: 'example.com', secure: true, sameSite: 'strict' }),
    'sid=x; Max-Age=3600; Expires=Wed, 02 Jan 2030 03:04:05 GMT; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Strict',
  );
  assert.equal(serializeCookie('sid', '', { maxAge: 0, httpOnly: false, sameSite: null }), 'sid=; Max-Age=0; Path=/');
});

test('serializeCookie: 名前・Max-Age・SameSite・Path がおかしいときは例外', () => {
  for (const bad of ['a b', 'a;b', 'a=b', '', 'セッション']) assert.throws(() => serializeCookie(bad, 'x'), TypeError, JSON.stringify(bad));
  assert.throws(() => serializeCookie('a', 'x', { maxAge: 1.5 }), RangeError);
  assert.throws(() => serializeCookie('a', 'x', { maxAge: -1 }), RangeError);
  assert.throws(() => serializeCookie('a', 'x', { sameSite: 'Loose' }), TypeError);
  assert.throws(() => serializeCookie('a', 'x', { path: 'admin' }), TypeError);
  assert.throws(() => serializeCookie('a', 'x', { path: '/a; Domain=other' }), TypeError);
});

test('serializeCookie: SameSite=None には Secure が要る', () => {
  assert.throws(() => serializeCookie('a', 'x', { sameSite: 'None' }), TypeError);
  assert.equal(serializeCookie('a', 'x', { sameSite: 'None', secure: true }), 'a=x; Path=/; HttpOnly; Secure; SameSite=None');
});

test('serializeCookie: __Secure- と __Host- の決まり', () => {
  assert.throws(() => serializeCookie('__Secure-sid', 'x'), TypeError);
  assert.doesNotThrow(() => serializeCookie('__Secure-sid', 'x', { secure: true }));
  assert.throws(() => serializeCookie('__Host-sid', 'x', { secure: true, path: '/app' }), TypeError);
  assert.throws(() => serializeCookie('__Host-sid', 'x', { secure: true, domain: 'example.com' }), TypeError);
  assert.equal(serializeCookie('__Host-sid', 'x', { secure: true }), '__Host-sid=x; Path=/; HttpOnly; Secure; SameSite=Lax');
});

test('clearCookie: Max-Age=0 と 1970年の Expires。path を合わせる', () => {
  assert.equal(clearCookie('sid', { path: '/app' }), 'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/app; HttpOnly; SameSite=Lax');
});
