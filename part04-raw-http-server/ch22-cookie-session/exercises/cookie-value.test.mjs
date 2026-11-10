// 練習問題1 用: cookie-value.mjs のテスト
// 使い方: node --test cookie-value.test.mjs
//   模範解答を試す: MODULE=../solutions/cookie-value.mjs node --test cookie-value.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './cookie-value.mjs')).href);

test('getCookie: 名前で値を取り出す', () => {
  assert.equal(m.getCookie('a=1; theme=dark; b=2', 'theme'), 'dark');
  assert.equal(m.getCookie('a=1', 'a'), '1');
});

test('getCookie: 無ければ null。ヘッダが無いときも null', () => {
  assert.equal(m.getCookie('a=1; b=2', 'c'), null);
  assert.equal(m.getCookie(undefined, 'a'), null);
  assert.equal(m.getCookie('', 'a'), null);
});

test('getCookie: %xx を文字に戻す。読めないものはそのまま', () => {
  assert.equal(m.getCookie('msg=hello%20world', 'msg'), 'hello world');
  assert.equal(m.getCookie('name=%E3%81%AD%E3%81%93', 'name'), 'ねこ');
  assert.equal(m.getCookie('p=100%', 'p'), '100%');
});

test('getCookie: 同じ名前が2つあれば、最初のもの。名前の一部だけ同じものは違う', () => {
  assert.equal(m.getCookie('sid=x; sid=y', 'sid'), 'x');
  assert.equal(m.getCookie('xsid=1; sid=2', 'sid'), '2');
});

test('cookieLine: 決まった属性を付ける', () => {
  assert.equal(m.cookieLine('visits', '3', 60), 'visits=3; Path=/; Max-Age=60; HttpOnly; SameSite=Lax');
});

test('cookieLine: 値を URL 用にエンコードする', () => {
  assert.equal(m.cookieLine('name', 'ねこ と; いぬ', 0), 'name=%E3%81%AD%E3%81%93%20%E3%81%A8%3B%20%E3%81%84%E3%81%AC; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
});
