// 練習問題1 のテスト
// 使い方: node --test reset-mail.test.ts
//   模範解答を試す: MODULE=../solutions/reset-mail.ts node --test reset-mail.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './reset-mail.ts');
const { buildResetMail }: typeof import('./reset-mail.ts') = await import(pathToFileURL(file).href);

const link = 'http://127.0.0.1:9637/reset?token=abc_DEF-123&lang=ja';

test('宛先と件名', () => {
  const mail = buildResetMail('alice@example.com', link, 30);
  assert.equal(mail.to, 'alice@example.com');
  assert.equal(mail.subject, 'パスワードの再設定');
});

test('テキストには、リンクがそのまま1行で入り、有効な分数と「心当たりが無ければ」が入る', () => {
  const { text } = buildResetMail('alice@example.com', link, 30);
  assert.ok(text.split('\n').includes(link), 'リンクだけの行がありません');
  assert.match(text, /30分/);
  assert.match(text, /心当たりが無ければ/);
});

test('HTML のリンクは href に入り、& は &amp; になる', () => {
  const { html } = buildResetMail('alice@example.com', link, 15);
  assert.ok(html !== undefined, 'html がありません');
  assert.ok(html.includes('href="http://127.0.0.1:9637/reset?token=abc_DEF-123&amp;lang=ja"'), html);
  assert.match(html, /15分/);
  assert.doesNotMatch(html, /&lang/);
});

test('http・https 以外のリンクは例外', () => {
  assert.throws(() => buildResetMail('alice@example.com', 'javascript:void(0)', 30));
  assert.throws(() => buildResetMail('alice@example.com', 'ftp://example.test/x', 30));
  assert.doesNotThrow(() => buildResetMail('alice@example.com', 'https://tasks.example.test/reset?token=x', 30));
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
