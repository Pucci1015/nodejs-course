// 練習問題7 のテスト
// 使い方: node --test upload-router.test.ts
//   模範解答を試す: MODULE=../solutions/upload-router.ts node --test upload-router.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import type { BlobStore } from '../samples/blob-store.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './upload-router.ts');
const { createUploadRouter }: typeof import('./upload-router.ts') = await import(pathToFileURL(file).href);

// テストのための小さな BlobStore（Map に置くだけ）。置いたキーを覚えておく
const blobs = new Map<string, { body: Buffer; contentType: string }>();
const store: BlobStore = {
  async put(key, body, contentType) {
    blobs.set(key, { body: Buffer.from(body), contentType });
  },
  async get(key) {
    return blobs.get(key);
  },
  async head(key) {
    const b = blobs.get(key);
    return b && { key, size: b.body.length, contentType: b.contentType };
  },
  async delete(key) {
    blobs.delete(key);
  },
  async list() {
    return [];
  },
};

let n = 0;
let server: Server;
let base = '';
before(async () => {
  const app = express();
  app.use(createUploadRouter({ store, maxBytes: 100, newId: () => `id-${++n}` }));
  await new Promise<void>((r) => {
    server = app.listen(0, '127.0.0.1', () => r());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const call = (p: string, init: RequestInit = {}) => fetch(`${base}${p}`, { ...init, signal: AbortSignal.timeout(3000) });

test('POST /files: 201、Location、JSON。キーは files/ID で、利用者の名前を使わない', async () => {
  const res = await call(`/files?name=${encodeURIComponent('../ねこ.png')}`, { method: 'POST', body: png });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/files/id-1');
  assert.deepEqual(await res.json(), { id: 'id-1', name: '../ねこ.png', type: 'image/png', size: 11 });
  assert.deepEqual([...blobs.keys()], ['files/id-1']);
  assert.equal(blobs.get('files/id-1')?.contentType, 'image/png');
});

test('種類は中身で決める（送られた Content-Type は使わない）', async () => {
  const res = await call('/files?name=a.txt', { method: 'POST', body: png, headers: { 'content-type': 'text/html' } });
  assert.equal(res.status, 201);
  assert.equal(((await res.json()) as { type: string }).type, 'image/png');
});

test('知らない種類は 415、空は 400、大きすぎは 413（どれも JSON の error。置かない）', async () => {
  const before = blobs.size;
  const r415 = await call('/files', { method: 'POST', body: '<svg></svg>' });
  assert.equal(r415.status, 415);
  assert.equal(typeof ((await r415.json()) as { error: unknown }).error, 'string');
  const r400 = await call('/files', { method: 'POST', body: '' });
  assert.equal(r400.status, 400);
  assert.equal(typeof ((await r400.json()) as { error: unknown }).error, 'string');
  const r413 = await call('/files', { method: 'POST', body: Buffer.concat([png, Buffer.alloc(100)]) });
  assert.equal(r413.status, 413);
  assert.equal(typeof ((await r413.json()) as { error: unknown }).error, 'string');
  assert.equal(blobs.size, before);
});

test('名前が無ければ file', async () => {
  const res = await call('/files', { method: 'POST', body: png });
  assert.equal(((await res.json()) as { name: string }).name, 'file');
});

test('GET /files/:id: 中身と、種類・ダウンロードの名前・nosniff・private', async () => {
  const res = await call('/files/id-1');
  assert.equal(res.status, 200);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), png);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('content-disposition'), `attachment; filename*=UTF-8''..%2F%E3%81%AD%E3%81%93.png`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('cache-control'), 'private, no-cache');
});

test('知らない ID は 404', async () => {
  const res = await call('/files/nope');
  assert.equal(res.status, 404);
  assert.equal(typeof ((await res.json()) as { error: unknown }).error, 'string');
});

test('DELETE /files/:id: 204 で、ストレージからも消える。2回目は 404', async () => {
  assert.equal((await call('/files/id-1', { method: 'DELETE' })).status, 204);
  assert.equal(blobs.has('files/id-1'), false);
  assert.equal((await call('/files/id-1', { method: 'DELETE' })).status, 404);
  assert.equal((await call('/files/id-1')).status, 404);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
