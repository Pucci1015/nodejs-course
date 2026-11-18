// 第63章 7.1節: BlobStore を S3 で作る
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import type { BlobStore } from './blob-store.ts';

/** NoSuchKey（GET）と NotFound（HEAD。ボディが無いので名前だけ）を「無い」として扱う */
function isNotFound(err: unknown): boolean {
  return err instanceof Error && (err.name === 'NoSuchKey' || err.name === 'NotFound');
}

export function createS3BlobStore(s3: S3Client, bucket: string, options: { pageSize?: number } = {}): BlobStore {
  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },

    async get(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await res.Body!.transformToByteArray();
        return { body: Buffer.from(bytes), contentType: res.ContentType ?? 'application/octet-stream' };
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },

    async head(key) {
      try {
        const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { key, size: res.ContentLength ?? 0, contentType: res.ContentType ?? 'application/octet-stream' };
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },

    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async list(prefix) {
      // 1回の頼みで返るのは MaxKeys（S3 の既定は 1000）まで。続きは ContinuationToken で頼む
      const found: { key: string; size: number }[] = [];
      let token: string | undefined;
      do {
        const res = await s3.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: options.pageSize }),
        );
        for (const o of res.Contents ?? []) found.push({ key: o.Key ?? '', size: o.Size ?? 0 });
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token !== undefined);
      return found;
    },
  };
}
