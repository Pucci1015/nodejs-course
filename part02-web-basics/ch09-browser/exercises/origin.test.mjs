// 練習問題6 用: origin.mjs の sameOrigin と sameSite のテスト
// 使い方（~/dev/ch09/exercises で）: node --test origin.test.mjs
//   模範解答を試す: MODULE=../solutions/origin.mjs node --test origin.test.mjs
//
// sameOrigin(a, b)  2つの URL（文字列）が同じオリジンなら true
// sameSite(a, b)    2つの URL が同じサイトなら true
//   サイト = スキーム + 登録できるドメイン（ポートとサブドメインは無視）。
//   登録できるドメインは、下の PUBLIC_SUFFIXES（本物の Public Suffix List のごく一部）を使って求める。
//   IP アドレスは、その IP アドレスそのものがサイトになる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './origin.mjs');
const { sameOrigin, sameSite, PUBLIC_SUFFIXES } = await import(pathToFileURL(modulePath).href);

test('PUBLIC_SUFFIXES を export している', () => {
  for (const s of ['com', 'jp', 'co.jp', 'github.io']) assert.ok(PUBLIC_SUFFIXES.includes(s), s);
});

const originCases = [
  ['http://localhost:8300/a', 'http://localhost:8300/b?x=1#y', true],
  ['http://localhost:8300/', 'http://localhost:8301/', false],
  ['http://localhost/', 'http://localhost:80/', true], // 80 は http の既定のポート
  ['https://example.com/', 'https://example.com:443/x', true],
  ['http://example.com/', 'https://example.com/', false],
  ['https://example.com/', 'https://www.example.com/', false],
  ['https://EXAMPLE.com/', 'https://example.COM/', true], // ホスト名は大文字・小文字を区別しない
  ['http://127.0.0.1:8300/', 'http://localhost:8300/', false],
];
for (const [a, b, expected] of originCases) {
  test(`sameOrigin(${a}, ${b}) → ${expected}`, () => assert.equal(sameOrigin(a, b), expected));
}

const siteCases = [
  ['https://www.example.com/', 'https://api.example.com/', true],
  ['https://example.com/', 'https://a.b.example.com:8443/', true],
  ['http://localhost:8300/', 'http://localhost:8301/', true],
  ['https://example.com/', 'https://example.co.jp/', false],
  ['https://shop.example.co.jp/', 'https://www.example.co.jp/', true], // co.jp は公開の接尾辞
  ['https://a.co.jp/', 'https://b.co.jp/', false],
  ['http://example.com/', 'https://example.com/', false], // スキームが違えば別のサイト
  ['https://alice.github.io/', 'https://bob.github.io/', false], // github.io は公開の接尾辞
  ['https://alice.github.io/a', 'https://www.alice.github.io/b', true],
  ['http://127.0.0.1:8300/', 'http://127.0.0.1:9000/', true],
  ['http://127.0.0.1/', 'http://localhost/', false],
  ['https://example.jp/', 'https://www.example.jp/', true],
];
for (const [a, b, expected] of siteCases) {
  test(`sameSite(${a}, ${b}) → ${expected}`, () => assert.equal(sameSite(a, b), expected));
}

test('URL として読めないものはエラー（TypeError）', () => {
  assert.throws(() => sameOrigin('not a url', 'https://example.com/'), TypeError);
  assert.throws(() => sameSite('https://example.com/', '::::'), TypeError);
});
