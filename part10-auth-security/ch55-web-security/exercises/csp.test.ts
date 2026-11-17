// 練習問題1 のテスト
// 使い方: node --test csp.test.ts
//   模範解答を試す: MODULE=../solutions/csp.ts node --test csp.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './csp.ts');
const { buildCsp }: typeof import('./csp.ts') = await import(pathToFileURL(file).href);

/** 書いた関数が投げた例外か（「まだ書いていません」ではない） */
const rejected = (err: unknown) => err instanceof Error && !err.message.startsWith('まだ書いていません');

/** 「名前 値 値; 名前 値」を、名前 → 値の配列 の Map にする */
function parse(csp: string) {
  return new Map(
    csp.split(';').map((part) => {
      const [name = '', ...values] = part.trim().split(/\s+/);
      return [name, values] as const;
    }),
  );
}

test('何も指定しないとき: 9つの指示を「; 」でつなぐ', () => {
  const csp = buildCsp();
  assert.equal(
    csp,
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test('nonce を script-src に入れる', () => {
  const d = parse(buildCsp({ nonce: 'kWO39XSZKHL6QCvrxf+8bQ==' }));
  assert.deepEqual(d.get('script-src'), ["'self'", "'nonce-kWO39XSZKHL6QCvrxf+8bQ=='"]);
  assert.deepEqual(d.get('default-src'), ["'self'"]);
});

test('connectSrc のオリジンを connect-src に足す', () => {
  const d = parse(buildCsp({ connectSrc: ['https://api.example.com', 'https://upload.example.com'] }));
  assert.deepEqual(d.get('connect-src'), ["'self'", 'https://api.example.com', 'https://upload.example.com']);
});

test('nonce に base64 でない文字（; 空白 \' など）があれば例外', () => {
  for (const bad of ['abc;', 'a b', "a'", '', 'あ']) {
    assert.throws(() => buildCsp({ nonce: bad }), rejected, bad);
  }
});

test('connectSrc がオリジンでなければ例外（http・パス付き・最後の /・URL でない・; を含む）', () => {
  for (const bad of ['http://api.example.com', 'https://api.example.com/v1', 'https://api.example.com/', 'api.example.com', "https://a.example; script-src 'self'"]) {
    assert.throws(() => buildCsp({ connectSrc: [bad] }), rejected, bad);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
