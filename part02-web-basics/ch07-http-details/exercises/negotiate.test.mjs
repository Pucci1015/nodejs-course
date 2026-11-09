// 練習問題11 用: negotiate.mjs の chooseEncoding のテスト
// 使い方（~/dev/ch07/exercises で）: node --test negotiate.test.mjs
//   模範解答を試す: MODULE=../solutions/negotiate.mjs node --test negotiate.test.mjs
//
// chooseEncoding(acceptEncoding, available) は、
//   acceptEncoding: リクエストの Accept-Encoding ヘッダの値（無ければ undefined）
//   available:      サーバが使える圧縮方式。サーバが好む順（既定 ['br', 'gzip']）
// を受け取り、使う方式の名前（'br'、'gzip' など）、圧縮しないなら 'identity'、
// どれも受け入れられないなら null（サーバは 406 を返す）を返す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './negotiate.mjs');
const { chooseEncoding } = await import(pathToFileURL(modulePath).href);

const cases = [
  // [Accept-Encoding, 期待する結果, 説明]
  [undefined, 'identity', 'ヘッダが無ければ圧縮しない'],
  ['', 'identity', '空なら圧縮しない'],
  ['gzip', 'gzip', '1つだけ'],
  ['gzip, deflate, br, zstd', 'br', 'q が同じなら、サーバが好む順（available の順）'],
  ['gzip;q=1.0, br;q=0.5', 'gzip', 'q が大きい方'],
  ['br;q=0, gzip', 'gzip', 'q=0 は「受け入れない」'],
  ['GZIP', 'gzip', '大文字・小文字を区別しない'],
  ['gzip ; q=0.8 , br ; q=0.9', 'br', '空白があってもよい'],
  ['deflate', 'identity', '知らない方式しか無ければ圧縮しない'],
  ['*', 'br', '* は何でもよい'],
  ['gzip;q=0.5, *;q=0.8', 'br', '* の q は、明示されていない方式に当てはまる'],
  ['*;q=0, gzip', 'gzip', '* は受け入れないが、gzip は明示されている'],
  ['identity;q=0, gzip;q=0', null, '圧縮なしも gzip も受け入れない → null'],
  ['*;q=0', null, 'すべて受け入れない（identity も） → null'],
  ['*;q=0, identity', 'identity', 'identity だけ受け入れる'],
  ['br;q=0.3, identity;q=0.5', 'identity', 'identity の方が q が大きい'],
];

for (const [header, expected, description] of cases) {
  test(`${description}: ${JSON.stringify(header)} → ${expected}`, () => {
    assert.equal(chooseEncoding(header), expected);
  });
}

test('available を指定できる: gzip しか使えないサーバ', () => {
  assert.equal(chooseEncoding('br, gzip;q=0.5', ['gzip']), 'gzip');
  assert.equal(chooseEncoding('br', ['gzip']), 'identity');
});
