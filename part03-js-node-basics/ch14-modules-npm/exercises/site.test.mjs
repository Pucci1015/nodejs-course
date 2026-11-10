// 練習問題6 用: packages/site.mjs（tldts を使う版）のテスト
// 使い方（exercises フォルダで）: node --test site.test.mjs
//   site.mjs は、tldts を npm install したフォルダ（packages）に置く。
//   模範解答を試す: cp ../solutions/site.mjs packages/site-answer.mjs && MODULE=./packages/site-answer.mjs node --test site.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const given = process.env.MODULE ?? './packages/site.mjs';
const modulePath = path.resolve(import.meta.dirname, given.replace(/^~(?=\/)/, os.homedir()));
const { registrableDomain, sameSite } = await import(pathToFileURL(modulePath).href);

test('普通のドメイン', () => {
  assert.equal(registrableDomain('https://www.example.com/a'), 'example.com');
  assert.equal(registrableDomain('https://shop.example.co.jp:8443/'), 'example.co.jp');
  assert.equal(registrableDomain('https://EXAMPLE.org'), 'example.org');
});

test('会社が登録した公開の接尾辞（github.io など）も、別の人のサイトとして扱う', () => {
  assert.equal(registrableDomain('https://alice.github.io/'), 'alice.github.io');
  assert.equal(registrableDomain('https://bucket.s3.amazonaws.com/'), 'bucket.s3.amazonaws.com');
  assert.equal(sameSite('https://alice.github.io/', 'https://bob.github.io/'), false);
});

test('ワイルドカードと例外の決まり（*.kawasaki.jp と !city.kawasaki.jp）', () => {
  // Public Suffix List には「*.kawasaki.jp」（その下の名前はすべて公開の接尾辞）と、
  // その例外「!city.kawasaki.jp」（これだけは登録できるドメイン）が書かれている
  assert.equal(registrableDomain('https://www.city.kawasaki.jp/'), 'city.kawasaki.jp');
  assert.equal(registrableDomain('https://shop.foo.kawasaki.jp/'), 'shop.foo.kawasaki.jp');
});

test('IP アドレスと localhost は、ホスト名そのもの', () => {
  assert.equal(registrableDomain('http://127.0.0.1:8080/'), '127.0.0.1');
  assert.equal(registrableDomain('http://[::1]:3000/'), '::1');
  assert.equal(registrableDomain('http://localhost:5010/'), 'localhost');
});

test('sameSite: スキームが違えば別のサイト。ポートとサブドメインは無視する', () => {
  assert.equal(sameSite('https://a.example.com', 'https://b.example.com:8443/x'), true);
  assert.equal(sameSite('http://example.com', 'https://example.com'), false);
  assert.equal(sameSite('https://example.co.jp', 'https://example.jp'), false);
  assert.equal(sameSite('http://localhost:3000', 'http://localhost:5010'), true);
});

test('URL として読めない文字列は TypeError', () => {
  assert.throws(() => registrableDomain('example.com'), TypeError);
});
