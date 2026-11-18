// 第63章 練習問題8: どこからも使われていないオブジェクト（孤児）を掃除する（本文 8節）
import { DeleteObjectCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';

export type SweepOptions = {
  s3: S3Client;
  bucket: string;
  /** このキーで始まるものだけを見る */
  prefix: string;
  /** データベースが知っているキーか（使われているか）。キーごとに呼ぶ */
  isReferenced: (key: string) => Promise<boolean>;
  /** 置かれてからこの時間（ミリ秒）たっていないものは、消さない（アップロードの途中かもしれない） */
  graceMs: number;
  /** 今の時刻 */
  now: Date;
  /** true なら、消さずに「消すもの」を数えるだけ */
  dryRun: boolean;
  /** 一覧を1回に何件ずつ頼むか（テスト用。既定はストレージに任せる） */
  pageSize?: number;
};

export type SweepResult = {
  /** 消した（dryRun なら、消すはずの）キー。見つけた順 */
  deleted: string[];
  /** 見たオブジェクトの数 */
  scanned: number;
};

export async function sweepOrphans(options: SweepOptions): Promise<SweepResult> {
  const { s3, bucket, prefix, isReferenced, graceMs, now, dryRun, pageSize } = options;
  const deleted: string[] = [];
  let scanned = 0;
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: pageSize }),
    );
    for (const o of page.Contents ?? []) {
      if (o.Key === undefined) continue;
      scanned += 1;
      // 置かれた時刻が分からないものは、新しいものとして扱う（消さない側に倒す）
      const age = now.getTime() - (o.LastModified?.getTime() ?? now.getTime());
      if (age < graceMs) continue;
      if (await isReferenced(o.Key)) continue; // 失敗したら、例外がそのまま外へ出て、止まる
      if (!dryRun) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.Key }));
      deleted.push(o.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token !== undefined);
  return { deleted, scanned };
}
