// 練習問題6 のテスト: 本文 7.2節の契約テストを、メモリの偽物に当てる
// 使い方: node --test memory-blob-store.test.ts
//   模範解答を試す: MODULE=../solutions/memory-blob-store.ts node --test memory-blob-store.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blobStoreContract } from '../samples/blob-contract.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './memory-blob-store.ts');
const { createMemoryBlobStore }: typeof import('./memory-blob-store.ts') = await import(pathToFileURL(file).href);

blobStoreContract('メモリ', async () => createMemoryBlobStore());

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
