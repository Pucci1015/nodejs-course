// 練習問題7・12 用: cookie.mjs のテスト（node:test を使う。本文8節）
// 使い方（~/dev/ch07/exercises で）: node --test cookie.test.mjs   問題7は --test-name-pattern=parseCookie を付ける
//   模範解答を試す: MODULE=../solutions/cookie.mjs node --test cookie.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './cookie.mjs');
const { parseCookie, serializeCookie } = await import(pathToFileURL(modulePath).href);

test('parseCookie: 複数の Cookie を分ける', () => {
  assert.deepEqual(parseCookie('a=1; b=2'), { a: '1', b: '2' });
});

test('parseCookie: 余分な空白や空の部分があっても読める', () => {
  assert.deepEqual(parseCookie('  a=1 ;b=2;;  c = 3 '), { a: '1', b: '2', c: '3' });
});

test('parseCookie: 値に = が含まれていてもよい（最初の = で分ける）', () => {
  assert.deepEqual(parseCookie('token=abc==; x=1'), { token: 'abc==', x: '1' });
});

test('parseCookie: パーセントエンコードされた値を元に戻す', () => {
  assert.deepEqual(parseCookie('name=%E3%81%AD%E3%81%93'), { name: 'ねこ' });
});

test('parseCookie: 元に戻せない値はそのまま返す（例外にしない）', () => {
  assert.deepEqual(parseCookie('bad=%E5%B1'), { bad: '%E5%B1' });
});

test('parseCookie: 同じ名前が複数あれば最初のものを使う', () => {
  assert.deepEqual(parseCookie('a=1; a=2'), { a: '1' });
});

test('parseCookie: ヘッダが無い（undefined）なら空のオブジェクト', () => {
  assert.deepEqual(parseCookie(undefined), {});
});

test('parseCookie: 値のダブルクォートを外す', () => {
  assert.deepEqual(parseCookie('q="hello"'), { q: 'hello' });
});

test('serializeCookie: 名前と値だけ', () => {
  assert.equal(serializeCookie('visits', '3'), 'visits=3');
});

test('serializeCookie: 値をパーセントエンコードする', () => {
  assert.equal(serializeCookie('name', 'ねこ いぬ;'), 'name=%E3%81%AD%E3%81%93%20%E3%81%84%E3%81%AC%3B');
});

test('serializeCookie: 属性を決まった順に付ける', () => {
  assert.equal(
    serializeCookie('sid', 'abc', {
      maxAge: 3600,
      path: '/',
      domain: 'example.com',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }),
    'sid=abc; Max-Age=3600; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax',
  );
});

test('serializeCookie: expires は Date を受け取り、HTTP の日付の形式にする', () => {
  const expires = new Date(Date.UTC(2026, 10, 4, 12, 0, 0));
  assert.equal(serializeCookie('a', '1', { expires }), 'a=1; Expires=Wed, 04 Nov 2026 12:00:00 GMT');
});

test('serializeCookie: maxAge は 0 でも付ける（Cookie を消すときに使う）', () => {
  assert.equal(serializeCookie('a', '', { maxAge: 0, path: '/' }), 'a=; Max-Age=0; Path=/');
});

test('serializeCookie: maxAge が整数でなければエラー', () => {
  assert.throws(() => serializeCookie('a', '1', { maxAge: 1.5 }), TypeError);
  assert.throws(() => serializeCookie('a', '1', { maxAge: '60' }), TypeError);
});

test('serializeCookie: 名前に使えない文字があればエラー', () => {
  for (const name of ['', 'a b', 'a;b', 'a=b', 'セッション']) {
    assert.throws(() => serializeCookie(name, '1'), TypeError, `名前 ${JSON.stringify(name)}`);
  }
});

test('serializeCookie: sameSite は Strict / Lax / None だけ（大文字・小文字は問わない）', () => {
  assert.equal(serializeCookie('a', '1', { sameSite: 'strict' }), 'a=1; SameSite=Strict');
  assert.throws(() => serializeCookie('a', '1', { sameSite: 'Loose' }), TypeError);
});

test('serializeCookie: SameSite=None は Secure が無ければエラー（ブラウザが拒否するため）', () => {
  assert.throws(() => serializeCookie('a', '1', { sameSite: 'None' }), TypeError);
  assert.equal(serializeCookie('a', '1', { sameSite: 'None', secure: true }), 'a=1; Secure; SameSite=None');
});

test('往復: serializeCookie した値を、読み直すと元に戻る', () => {
  const value = 'こんにちは; 世界=1,2';
  const header = serializeCookie('msg', value).split(';')[0]; // ブラウザが送り返すのは「名前=値」の部分だけ
  assert.deepEqual(parseCookie(header), { msg: value });
});
