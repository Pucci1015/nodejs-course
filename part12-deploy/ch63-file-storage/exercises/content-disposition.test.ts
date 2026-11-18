// 練習問題2 のテスト
// 使い方: node --test content-disposition.test.ts
//   模範解答を試す: MODULE=../solutions/content-disposition.ts node --test content-disposition.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './content-disposition.ts');
const { contentDisposition }: typeof import('./content-disposition.ts') = await import(pathToFileURL(file).href);

test('ASCII だけの名前', () => {
  assert.equal(contentDisposition('report.pdf'), `attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`);
});

test('日本語は、filename では _ に、filename* では %XX に', () => {
  assert.equal(
    contentDisposition('ねこ.png'),
    `attachment; filename="__.png"; filename*=UTF-8''%E3%81%AD%E3%81%93.png`,
  );
});

test('空白は filename ではそのまま、filename* では %20', () => {
  assert.equal(contentDisposition('my cat.png'), `attachment; filename="my cat.png"; filename*=UTF-8''my%20cat.png`);
});

test(`" と \\ は filename では _、filename* では %XX。' ( ) * も %XX`, () => {
  assert.equal(
    contentDisposition(`a"b\\c'(1)*.txt`),
    `attachment; filename="a_b_c'(1)*.txt"; filename*=UTF-8''a%22b%5Cc%27%281%29%2A.txt`,
  );
});

test('/ と制御文字（改行など）は、どちらでも _ にする', () => {
  assert.equal(
    contentDisposition('../etc/pass\r\nwd.txt'),
    `attachment; filename=".._etc_pass__wd.txt"; filename*=UTF-8''.._etc_pass__wd.txt`,
  );
});

test('空の名前は file', () => {
  assert.equal(contentDisposition(''), `attachment; filename="file"; filename*=UTF-8''file`);
});

test('inline: true なら inline', () => {
  assert.equal(contentDisposition('a.png', { inline: true }), `inline; filename="a.png"; filename*=UTF-8''a.png`);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
