// 第63章 3.3節: ファイルを、メモリに全部読まずに、ストリームのまま置く
// 動かし方（章のフォルダで）: node samples/stream-upload.ts <ファイル>
//   CHECKSUM=default を付けると、SDK の既定の送り方（aws-chunked）で送る。mini-s3 はこれに対応していないので 501
import fs from 'node:fs';
import path from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET, createS3Client } from './s3-client.ts';

const file = process.argv[2];
if (file === undefined) {
  console.error('使い方: node samples/stream-upload.ts <ファイル>');
  process.exit(2);
}

// WHEN_SUPPORTED は SDK の既定。置くたびにチェックサムを計算して、aws-chunked の形で送る
const s3 = createS3Client(process.env.CHECKSUM === 'default' ? { requestChecksumCalculation: 'WHEN_SUPPORTED' } : {});

const { size } = await fs.promises.stat(file);
try {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `uploads/${path.basename(file)}`,
      Body: fs.createReadStream(file),
      ContentLength: size, // 長さを先に教える（S3 は、長さの分からない送り方を断る。練習問題4の6）
    }),
  );
  console.log(`置きました: uploads/${path.basename(file)}（${size} バイト）`);
} catch (err) {
  const e = err as Error & { $metadata?: { httpStatusCode?: number } };
  console.log(`失敗: ${e.name} ${e.$metadata?.httpStatusCode ?? ''} ${e.message}`);
  process.exitCode = 1;
}
