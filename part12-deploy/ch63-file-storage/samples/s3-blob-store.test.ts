// 第63章 7.2節: S3 の BlobStore に、契約テストを当てる
// 動かし方（章のフォルダで）: node --test samples/s3-blob-store.test.ts
// mini-s3 を、テストの中で空いているポートに起動する（npm run s3 は要らない）
import { before, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { startMiniS3 } from '../../tools/mini-s3.ts';
import { blobStoreContract } from './blob-contract.ts';
import { createS3BlobStore } from './s3-blob-store.ts';
import { createS3Client } from './s3-client.ts';
import { CreateBucketCommand, type S3Client } from '@aws-sdk/client-s3';

let s3server: Awaited<ReturnType<typeof startMiniS3>>;
let s3: S3Client;

before(async () => {
  s3server = await startMiniS3({ port: 0, buckets: [] });
  s3 = createS3Client({ endpoint: s3server.url });
});
after(async () => {
  s3.destroy();
  await s3server.close();
});

// テストごとに新しいバケットを作る（ほかのテストが置いたものが見えないように）。pageSize 2 で、続きの一覧も確かめる
blobStoreContract('S3', async () => {
  const bucket = `t-${randomUUID()}`;
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  return createS3BlobStore(s3, bucket, { pageSize: 2 });
});
