// 練習問題2 のテスト
// 使い方: node --test rotation.test.ts
//   模範解答を試す: MODULE=../solutions/rotation.ts node --test rotation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './rotation.ts');
const { sign, unsign, needsResign, mac }: typeof import('./rotation.ts') = await import(pathToFileURL(file).href);

const OLD = 'dev-only-old-key-0123456789abcdef0123';
const NEW = 'dev-only-new-key-0123456789abcdef0123';
const rejected = (err: unknown) => err instanceof Error && !err.message.startsWith('まだ書いていません');

test('sign: 最初の鍵で「値.署名」を作る', () => {
  assert.equal(sign('user:42', [NEW, OLD]), `user:42.${mac('user:42', NEW)}`);
});

test('sign: 鍵が無ければ例外', () => {
  assert.throws(() => sign('user:42', []), rejected);
});

test('unsign: 今の鍵で合えば keyIndex 0', () => {
  assert.deepEqual(unsign(sign('user:42', [NEW]), [NEW, OLD]), { value: 'user:42', keyIndex: 0 });
});

test('unsign: 古い鍵で合えば keyIndex 1', () => {
  assert.deepEqual(unsign(sign('user:42', [OLD]), [NEW, OLD]), { value: 'user:42', keyIndex: 1 });
});

test('unsign: 値に . が入っていても、最後の . で分ける', () => {
  assert.deepEqual(unsign(sign('a.b.c', [NEW]), [NEW]), { value: 'a.b.c', keyIndex: 0 });
});

test('unsign: どの鍵でも合わない・形が違うものは undefined', () => {
  const s = sign('user:42', [OLD]);
  assert.equal(unsign(s, [NEW]), undefined);
  assert.equal(unsign(s.replace('user:42', 'user:43'), [OLD]), undefined);
  assert.equal(unsign('user:42', [OLD]), undefined);
  assert.equal(unsign(`${s}x`, [OLD]), undefined);
  assert.equal(unsign('', [OLD]), undefined);
});

test('needsResign: 古い鍵で合ったときだけ true（付け直して、次から今の鍵の値を配る）', () => {
  assert.equal(needsResign(sign('v', [OLD]), [NEW, OLD]), true);
  assert.equal(needsResign(sign('v', [NEW]), [NEW, OLD]), false);
  assert.equal(needsResign('v.bad', [NEW, OLD]), false);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
