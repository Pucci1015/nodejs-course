// 練習問題3 用: lines.mjs の createLineSplitter のテスト
// 使い方: node --test lines.test.mjs
//   模範解答を試す: MODULE=../solutions/lines.mjs node --test lines.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './lines.mjs');
const { createLineSplitter } = await import(pathToFileURL(modulePath).href);

/** chunks（Buffer の配列）を流し込み、出てきた行を配列で返す */
async function run(chunks, options) {
  const lines = [];
  const splitter = createLineSplitter(options);
  await pipeline(Readable.from(chunks, { objectMode: false }), splitter, async function (source) {
    for await (const line of source) lines.push(line);
  });
  return lines;
}
/** 文字列を、size バイトずつの Buffer に切る */
const slice = (text, size) => {
  const buf = Buffer.from(text);
  return Array.from({ length: Math.ceil(buf.length / size) }, (_, i) => buf.subarray(i * size, (i + 1) * size));
};

test('改行で区切った行を、改行を除いた文字列で出す', async () => {
  assert.deepEqual(await run([Buffer.from('a\nbb\nccc\n')]), ['a', 'bb', 'ccc']);
});

test('行がチャンクをまたいでも、つなげて1行にする', async () => {
  assert.deepEqual(await run([Buffer.from('he'), Buffer.from('llo\nwor'), Buffer.from('ld\n')]), ['hello', 'world']);
});

test('UTF-8 の文字がチャンクの途中で切れても、壊さない（1バイトずつ流しても同じ）', async () => {
  const text = 'こんにちは\n😀絵文字\n日本語の行\n';
  assert.deepEqual(await run(slice(text, 1)), ['こんにちは', '😀絵文字', '日本語の行']);
  assert.deepEqual(await run(slice(text, 4)), ['こんにちは', '😀絵文字', '日本語の行']);
});

test('CRLF の改行も扱う（\\r を残さない）。\\r と \\n がチャンクで分かれても同じ', async () => {
  assert.deepEqual(await run([Buffer.from('a\r\nb\r'), Buffer.from('\nc\r\n')]), ['a', 'b', 'c']);
});

test('最後の行が改行で終わっていなくても、1行として出す', async () => {
  assert.deepEqual(await run([Buffer.from('a\nlast')]), ['a', 'last']);
});

test('空の行は空文字列として出す。空の入力なら何も出さない', async () => {
  assert.deepEqual(await run([Buffer.from('a\n\nb\n')]), ['a', '', 'b']);
  assert.deepEqual(await run([]), []);
});

test('1行が maxLineLength を超えたら、エラーにする（改行の無い巨大なデータでメモリを使い果たさない）', async () => {
  await assert.rejects(run([Buffer.from('short\n'), Buffer.from('x'.repeat(100))], { maxLineLength: 50 }), RangeError);
  // 改行が来なくても、溜まった時点で気付く
  const endless = (function* () {
    for (let i = 0; i < 1000; i++) yield Buffer.from('y'.repeat(100));
  })();
  await assert.rejects(run(endless, { maxLineLength: 1000 }), RangeError);
});

test('UTF-8 として正しくないバイトがあれば、エラーにする', async () => {
  await assert.rejects(run([Buffer.from([0x61, 0x0a, 0xff, 0xfe, 0x0a])]));
  await assert.rejects(run([Buffer.from([0xe3, 0x81])]), undefined, '文字の途中で入力が終わった');
});

test('読む側は1行ずつの文字列（objectMode）', async () => {
  const splitter = createLineSplitter();
  assert.equal(splitter.readableObjectMode, true);
  assert.equal(splitter.writableObjectMode, false);
});
