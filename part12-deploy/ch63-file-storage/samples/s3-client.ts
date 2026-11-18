// 第63章 3.1節: S3 互換のストレージにつなぐクライアントを作る（ほかのサンプルが import する）
// つなぎ先と鍵は環境変数から。無ければ練習用の mini-s3（npm run s3）の値
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export const BUCKET = process.env.S3_BUCKET ?? 'demo';

/** overrides で、設定の一部を変えられる（3.3節） */
export function createS3Client(overrides: S3ClientConfig = {}): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9800',
    region: process.env.S3_REGION ?? 'us-east-1',
    // 鍵は必ず明示して渡す（渡さないと、SDK が ~/.aws や環境変数の本物の鍵を探しに行く）
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'dev-only-access-key',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'dev-only-secret-key',
    },
    // URL を http://ホスト/バケット/キー の形にする（S3 互換のサーバの多くは、この形を使う）
    forcePathStyle: true,
    // 置くときに、チェックサムを「要るときだけ」付ける（3.3節）
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...overrides,
  });
}
