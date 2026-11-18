// 第63章 4.3節: SDK で署名付き URL を作る（GET と PUT）
// 動かし方（章のフォルダで）: node samples/presign.ts
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET, createS3Client } from './s3-client.ts';

const s3 = createS3Client();

// 取り出す URL。response-content-disposition で、保存するときの名前を決めさせる
const getUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({
    Bucket: BUCKET,
    Key: 'notes/2026/a.txt',
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent('メモ.txt')}`,
  }),
  { expiresIn: 60 }, // 60 秒だけ使える
);
console.log('GET:', getUrl);

// 置く URL。ContentType を署名に含めるので、置くときに同じ Content-Type を送らないと 403
const putUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({ Bucket: BUCKET, Key: 'uploads/from-browser.png', ContentType: 'image/png' }),
  { expiresIn: 300, signableHeaders: new Set(['content-type']) },
);
console.log('PUT:', putUrl);
