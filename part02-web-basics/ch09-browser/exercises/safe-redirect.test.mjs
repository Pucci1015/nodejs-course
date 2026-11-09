// 練習問題8 用: safe-redirect.mjs の safeRedirectPath のテスト
// 使い方（~/dev/ch09/exercises で）: node --test safe-redirect.test.mjs
//   模範解答を試す: MODULE=../solutions/safe-redirect.mjs node --test safe-redirect.test.mjs
//
// safeRedirectPath(next, fallback = '/')
//   ログインの後などに「元のページに戻す」ための ?next=... の値を受け取り、
//   同じサイトの中のパス（'/' で始まる文字列）なら、それを返す。
//   よそのサイトへ飛ばされる可能性があるものは、すべて fallback を返す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './safe-redirect.mjs');
const { safeRedirectPath } = await import(pathToFileURL(modulePath).href);

const allowed = [
  ['/tasks', '/tasks'],
  ['/tasks?page=2#top', '/tasks?page=2#top'],
  ['/a/../b', '/b'], // 正規化した形を返す
  ['/検索?q=日本語', '/%E6%A4%9C%E7%B4%A2?q=%E6%97%A5%E6%9C%AC%E8%AA%9E'], // エンコードした形を返す
  ['/%2F%2Fevil.example', '/%2F%2Fevil.example'], // エンコードされた / はただの文字なので安全
];
for (const [input, expected] of allowed) {
  test(`許可: ${JSON.stringify(input)} → ${expected}`, () => assert.equal(safeRedirectPath(input), expected));
}

const rejected = [
  'https://evil.example/',
  'http://evil.example/login',
  '//evil.example/', // スキーム相対 URL。別のホストになる
  '///evil.example/',
  '/\\evil.example/', // ブラウザは \ を / として扱う
  '\\\\evil.example',
  '/\t/evil.example', // タブや改行は URL の解析で取り除かれる
  ' //evil.example', // 前の空白も取り除かれる
  'javascript:void(0)',
  'JaVaScRiPt:void(0)',
  'data:text/plain,hello',
  'evil.example', // '/' で始まらない（相対パス）ものも断る
  'tasks',
  '',
  undefined,
  null,
  ['/tasks'], // クエリの ?next=a&next=b は配列になることがある
];
for (const input of rejected) {
  test(`拒否: ${JSON.stringify(input)} → '/'`, () => assert.equal(safeRedirectPath(input), '/'));
}

test('fallback を指定できる', () => {
  assert.equal(safeRedirectPath('https://evil.example/', '/home'), '/home');
});
