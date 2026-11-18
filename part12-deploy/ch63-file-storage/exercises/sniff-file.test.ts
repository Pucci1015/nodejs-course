// 練習問題3 のテスト
// 使い方: node --test sniff-file.test.ts
//   模範解答を試す: MODULE=../solutions/sniff-file.ts node --test sniff-file.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './sniff-file.ts');
const { sniffFile }: typeof import('./sniff-file.ts') = await import(pathToFileURL(file).href);

const b = (...parts: (string | number[])[]) =>
  Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));

test('PNG・JPEG', () => {
  assert.deepEqual(sniffFile(b([0x89], 'PNG\r\n\x1a\n', 'IHDR')), { type: 'image/png', ext: '.png' });
  assert.deepEqual(sniffFile(b([0xff, 0xd8, 0xff, 0xe0], 'JFIF')), { type: 'image/jpeg', ext: '.jpg' });
});

test('GIF は GIF87a と GIF89a だけ', () => {
  assert.deepEqual(sniffFile(b('GIF89a', [1, 0])), { type: 'image/gif', ext: '.gif' });
  assert.deepEqual(sniffFile(b('GIF87a')), { type: 'image/gif', ext: '.gif' });
  assert.equal(sniffFile(b('GIF8xa')), undefined);
});

test('WebP は 0 バイト目から RIFF、8 バイト目から WEBP', () => {
  assert.deepEqual(sniffFile(b('RIFF', [0x24, 0, 0, 0], 'WEBPVP8 ')), { type: 'image/webp', ext: '.webp' });
  assert.equal(sniffFile(b('RIFF', [0x24, 0, 0, 0], 'WAVEfmt ')), undefined, 'RIFF でも WAV（音）は受け付けない');
});

test('PDF は %PDF-', () => {
  assert.deepEqual(sniffFile(b('%PDF-1.7\n')), { type: 'application/pdf', ext: '.pdf' });
});

test('SVG・HTML・テキストは受け付けない（中にスクリプトを書けるため）', () => {
  for (const text of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', '<!doctype html><p>', 'hello']) {
    assert.equal(sniffFile(Buffer.from(text)), undefined, text);
  }
});

test('短すぎるデータは、範囲の外を読まずに undefined', () => {
  for (const d of [b(), b([0x89, 0x50]), b('RIFF'), b('RIFF1234WEB')]) {
    assert.equal(sniffFile(d), undefined, d.toString('hex'));
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
