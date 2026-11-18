// 練習問題8 のテスト: mini-s3 をテストの中で起動して確かめる
// 使い方: node --test sweep-orphans.test.ts
//   模範解答を試す: MODULE=../solutions/sweep-orphans.ts node --test sweep-orphans.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { CreateBucketCommand, ListObjectsV2Command, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { startMiniS3 } from '../../tools/mini-s3.ts';
import { createS3Client } from '../samples/s3-client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './sweep-orphans.ts');
const { sweepOrphans }: typeof import('./sweep-orphans.ts') = await import(pathToFileURL(file).href);

let server: Awaited<ReturnType<typeof startMiniS3>>;
let s3: S3Client;
before(async () => {
  server = await startMiniS3({ port: 0, buckets: [] });
  s3 = createS3Client({ endpoint: server.url });
});
after(async () => {
  s3.destroy();
  await server.close();
});

const HOUR = 3600_000;
const later = () => new Date(Date.now() + 2 * HOUR); // 置いてから 2 時間たったことにする

/** 新しいバケットに keys を置いて、その名前を返す */
async function bucketWith(keys: string[]) {
  const bucket = `t-${randomUUID()}`;
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  for (const k of keys) await s3.send(new PutObjectCommand({ Bucket: bucket, Key: k, Body: k }));
  return bucket;
}
async function keysIn(bucket: string) {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return (res.Contents ?? []).map((o) => o.Key);
}

test('使われていないものだけを消す', async () => {
  const bucket = await bucketWith(['files/a', 'files/b', 'files/c']);
  const used = new Set(['files/b']);
  const r = await sweepOrphans({
    s3, bucket, prefix: 'files/', isReferenced: async (k) => used.has(k), graceMs: HOUR, now: later(), dryRun: false,
  });
  assert.deepEqual(r, { deleted: ['files/a', 'files/c'], scanned: 3 });
  assert.deepEqual(await keysIn(bucket), ['files/b']);
});

test('dryRun なら、数えるだけで消さない', async () => {
  const bucket = await bucketWith(['files/a', 'files/b']);
  const r = await sweepOrphans({
    s3, bucket, prefix: 'files/', isReferenced: async () => false, graceMs: HOUR, now: later(), dryRun: true,
  });
  assert.deepEqual(r, { deleted: ['files/a', 'files/b'], scanned: 2 });
  assert.deepEqual(await keysIn(bucket), ['files/a', 'files/b']);
});

test('置いたばかりのもの（graceMs の内）は、使われていなくても消さない', async () => {
  const bucket = await bucketWith(['files/new']);
  const r = await sweepOrphans({
    s3, bucket, prefix: 'files/', isReferenced: async () => false, graceMs: HOUR, now: new Date(), dryRun: false,
  });
  assert.deepEqual(r, { deleted: [], scanned: 1 });
  assert.deepEqual(await keysIn(bucket), ['files/new']);
});

test('prefix の外は見ない', async () => {
  const bucket = await bucketWith(['files/a', 'avatars/a']);
  const r = await sweepOrphans({
    s3, bucket, prefix: 'files/', isReferenced: async () => false, graceMs: HOUR, now: later(), dryRun: false,
  });
  assert.deepEqual(r, { deleted: ['files/a'], scanned: 1 });
  assert.deepEqual(await keysIn(bucket), ['avatars/a']);
});

test('一覧が何ページにわかれても、全部見る（pageSize 2 で 5 個）', async () => {
  const keys = ['files/1', 'files/2', 'files/3', 'files/4', 'files/5'];
  const bucket = await bucketWith(keys);
  const r = await sweepOrphans({
    s3, bucket, prefix: 'files/', isReferenced: async (k) => k === 'files/3', graceMs: HOUR, now: later(), dryRun: false, pageSize: 2,
  });
  assert.deepEqual(r, { deleted: ['files/1', 'files/2', 'files/4', 'files/5'], scanned: 5 });
  assert.deepEqual(await keysIn(bucket), ['files/3']);
});

test('isReferenced が失敗したら、そこで止めて例外（分からないものは消さない）', async () => {
  const bucket = await bucketWith(['files/a', 'files/b']);
  await assert.rejects(
    sweepOrphans({
      s3, bucket, prefix: 'files/', graceMs: HOUR, now: later(), dryRun: false,
      isReferenced: async () => { throw new Error('データベースにつながりません'); },
    }),
    /データベースにつながりません/,
  );
  assert.deepEqual(await keysIn(bucket), ['files/a', 'files/b']);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
