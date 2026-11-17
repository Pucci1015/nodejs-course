// 練習問題2 のテスト
// 使い方: node --test smtp-data.test.ts
//   模範解答を試す: MODULE=../solutions/smtp-data.ts node --test smtp-data.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './smtp-data.ts');
const { toSmtpData }: typeof import('./smtp-data.ts') = await import(pathToFileURL(file).href);

test('行の終わりを CRLF にして、最後に . だけの行を足す', () => {
  assert.equal(toSmtpData('Subject: hi\n\nHello'), 'Subject: hi\r\n\r\nHello\r\n.\r\n');
});

test('\\r\\n・\\r・\\n のどれで来ても CRLF になる', () => {
  assert.equal(toSmtpData('a\r\nb\rc\nd'), 'a\r\nb\r\nc\r\nd\r\n.\r\n');
});

test('最後が改行で終わっていても、空の行を足さない', () => {
  assert.equal(toSmtpData('Hello\n'), 'Hello\r\n.\r\n');
  assert.equal(toSmtpData('Hello\r\n'), 'Hello\r\n.\r\n');
});

test('. で始まる行は .. にする（途中の . は変えない）', () => {
  assert.equal(toSmtpData('.\n..a\nb.c\n. end'), '..\r\n...a\r\nb.c\r\n.. end\r\n.\r\n');
});

test('空の本文', () => {
  assert.equal(toSmtpData(''), '.\r\n');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
