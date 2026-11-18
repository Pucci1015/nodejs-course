// 追加（第12部）: BlobStore を S3 で作る（第63章 3.1節の s3-client.ts と 7.1節の s3-blob-store.ts をまとめた）
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { BlobStore, StoredBlob } from './blob-store.ts';

export type S3Options = {
  /** アプリ（サーバ）がつなぐ入口。undefined なら AWS の S3 */
  endpoint: string | undefined;
  /** ブラウザが署名付き URL で使う入口。コンテナの中と外で、名前が違うことがある（6.3節） */
  publicEndpoint: string | undefined;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function client(o: S3Options, endpoint: string | undefined): S3Client {
  return new S3Client({
    ...(endpoint !== undefined && { endpoint }),
    region: o.region,
    // 鍵は必ず明示して渡す（渡さないと、SDK が ~/.aws や環境変数の、ほかの鍵を探しに行く。第63章 3.1節）
    credentials: { accessKeyId: o.accessKeyId, secretAccessKey: o.secretAccessKey },
    forcePathStyle: o.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

export function createS3BlobStore(o: S3Options): BlobStore & { destroy(): void } {
  const s3 = client(o, o.endpoint);
  // 署名付き URL は、ブラウザが使う入口の名前で作る。署名には Host が入るので、入口が違うと 403 になる
  // 署名は手元の計算だけで、ストレージとは通信しない
  const signer = o.publicEndpoint === o.endpoint ? s3 : client(o, o.publicEndpoint);
  const Bucket = o.bucket;

  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },

    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },

    async list(prefix) {
      const found: StoredBlob[] = [];
      let token: string | undefined;
      do {
        const res = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
        for (const c of res.Contents ?? []) {
          if (c.Key === undefined) continue;
          // 置かれた時刻が分からないものは「今」にする（掃除で消さない側に倒す）
          found.push({ key: c.Key, size: c.Size ?? 0, lastModified: c.LastModified ?? new Date() });
        }
        token = res.IsTruncated === true ? res.NextContinuationToken : undefined;
      } while (token !== undefined);
      return found;
    },

    async signedGetUrl(key, { expiresIn, contentDisposition }) {
      return getSignedUrl(
        signer,
        new GetObjectCommand({ Bucket, Key: key, ResponseContentDisposition: contentDisposition }),
        { expiresIn },
      );
    },

    async check() {
      await s3.send(new HeadBucketCommand({ Bucket }));
    },

    destroy() {
      s3.destroy();
      if (signer !== s3) signer.destroy();
    },
  };
}
