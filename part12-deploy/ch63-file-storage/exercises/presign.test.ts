// 練習問題5 のテスト: mini-s3 をテストの中で起動し、作った URL で本当に取り出せるかを確かめる
// 使い方: node --test presign.test.ts
//   模範解答を試す: MODULE=../solutions/presign.ts node --test presign.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { startMiniS3 } from '../../tools/mini-s3.ts';
import { createS3Client } from '../samples/s3-client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './presign.ts');
const { presignGetUrl }: typeof import('./presign.ts') = await import(pathToFileURL(file).href);

let server: Awaited<ReturnType<typeof startMiniS3>>;
const base = {
  bucket: 'demo',
  region: 'us-east-1',
  accessKeyId: 'dev-only-access-key',
  secretAccessKey: 'dev-only-secret-key',
  expiresIn: 60,
};

before(async () => {
  server = await startMiniS3({ port: 0 });
  const s3 = createS3Client({ endpoint: server.url });
  await s3.send(new PutObjectCommand({ Bucket: 'demo', Key: 'a/hello.txt', Body: 'こんにちは', ContentType: 'text/plain' }));
  await s3.send(new PutObjectCommand({ Bucket: 'demo', Key: 'a/ねこ (1).txt', Body: 'にゃ' }));
  s3.destroy();
});
after(async () => {
  await server.close();
});

const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(3000) });

test('作った URL で取り出せる', async () => {
  const url = presignGetUrl({ ...base, endpoint: server.url, key: 'a/hello.txt', now: new Date() });
  const res = await get(url);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(await res.text(), 'こんにちは');
});

test('URL の形: パスはバケット/キー、クエリに X-Amz-… がそろっている', () => {
  const url = new URL(
    presignGetUrl({ ...base, endpoint: 'http://127.0.0.1:9800', key: 'a/hello.txt', now: new Date('2026-11-18T14:16:00Z') }),
  );
  assert.equal(url.origin, 'http://127.0.0.1:9800');
  assert.equal(url.pathname, '/demo/a/hello.txt');
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(url.searchParams.get('X-Amz-Credential'), 'dev-only-access-key/20261118/us-east-1/s3/aws4_request');
  assert.equal(url.searchParams.get('X-Amz-Date'), '20261118T141600Z');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '60');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.match(url.searchParams.get('X-Amz-Signature') ?? '', /^[0-9a-f]{64}$/);
});

test('日本語・空白・かっこを含むキーでも取り出せる', async () => {
  const url = presignGetUrl({ ...base, endpoint: server.url, key: 'a/ねこ (1).txt', now: new Date() });
  const res = await get(url);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(await res.text(), 'にゃ');
});

test('downloadName を渡すと、保存の名前が付く', async () => {
  const url = presignGetUrl({ ...base, endpoint: server.url, key: 'a/hello.txt', now: new Date(), downloadName: 'あいさつ.txt' });
  const res = await get(url);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(res.headers.get('content-disposition'), `attachment; filename*=UTF-8''%E3%81%82%E3%81%84%E3%81%95%E3%81%A4.txt`);
});

test('期限を過ぎた URL は 403', async () => {
  const url = presignGetUrl({ ...base, endpoint: server.url, key: 'a/hello.txt', now: new Date(Date.now() - 120_000) });
  const res = await get(url);
  assert.equal(res.status, 403);
  assert.match(await res.text(), /expired/);
});

test('X-Amz-Expires を書き換えると、署名が合わず 403', async () => {
  const url = presignGetUrl({ ...base, endpoint: server.url, key: 'a/hello.txt', now: new Date() });
  const res = await get(url.replace('X-Amz-Expires=60', 'X-Amz-Expires=600'));
  assert.equal(res.status, 403);
  assert.match(await res.text(), /SignatureDoesNotMatch/);
});

test('シークレットが違うと 403', async () => {
  const url = presignGetUrl({ ...base, secretAccessKey: 'wrong', endpoint: server.url, key: 'a/hello.txt', now: new Date() });
  assert.equal((await get(url)).status, 403);
});

test('expiresIn は 1〜604800 の整数でなければ例外', () => {
  for (const expiresIn of [0, 604801, 1.5]) {
    assert.throws(
      () => presignGetUrl({ ...base, expiresIn, endpoint: server.url, key: 'a', now: new Date() }),
      /expiresIn/,
      String(expiresIn),
    );
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
