// 第63章 3.2節: オブジェクトを置く・取り出す・一覧にする・消す
// 動かし方（章のフォルダで）: node samples/s3-try.ts   （先に、別のターミナルの ~/dev/part12 で npm run s3）
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET, createS3Client } from './s3-client.ts';

const s3 = createS3Client();

// 置く（同じキーなら上書き）
const put = await s3.send(
  new PutObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt', Body: 'こんにちは', ContentType: 'text/plain; charset=utf-8' }),
);
console.log('置きました。ETag:', put.ETag);

// 取り出す（Body はストリーム。小さいものは transformToString で文字列に）
const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt' }));
console.log('取り出しました:', await got.Body?.transformToString(), got.ContentType, got.ContentLength, 'バイト');

// 一覧（Prefix で始まるキーだけ）
await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'notes/2026/a.txt', Body: 'a' }));
const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'notes/' }));
for (const o of list.Contents ?? []) console.log('一覧:', o.Key, o.Size);

// 消す（無いキーを消しても成功になる）
await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt' }));
try {
  await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt' }));
} catch (err) {
  // SDK のエラーは name で見分ける（NoSuchKey・AccessDenied など）
  console.log('消した後に取り出すと:', err instanceof Error ? err.name : err);
}
